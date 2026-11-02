import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin, getGameState } from "./helpers";
import { FORFEITS } from "../src/data/forfeits.js";

function pickForfeit() {
  const i = Math.floor(Math.random() * FORFEITS.length);
  return FORFEITS[i];
}

// Rank every crew member by score for the closing day. Players with no entries
// count as 0. Ties broken alphabetically by slug so the bottom rank is
// deterministic even on sparse early days.
async function rankCrewAscending(ctx: any, dailyKey: string) {
  const players = await ctx.db.query("players").collect();
  const entries = await ctx.db
    .query("entries")
    .withIndex("by_daily_key", (q: any) => q.eq("dailyKey", dailyKey))
    .collect();
  const totals = new Map<string, number>();
  for (const p of players) totals.set(p.slug, 0);
  for (const e of entries) {
    if (e.status === "disputed") continue;
    if (!totals.has(e.subjectSlug)) totals.set(e.subjectSlug, 0);
    totals.set(e.subjectSlug, (totals.get(e.subjectSlug) ?? 0) + e.points);
  }
  return [...totals.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([slug, total]) => ({ slug, total }));
}

export const trigger = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");

    const now = Date.now();

    // Kickoff path: same as advance()
    if (!state.gamesLive) {
      await ctx.db.patch(state._id, {
        gamesLive: true,
        currentDayNumber: 1,
        currentDailyKey: "day-1",
        updatedAt: now,
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1,
        dailyKey: "day-1",
        triggeredBySlug: playerSlug,
        triggeredAt: now,
      });
      return;
    }

    const closingKey = state.currentDailyKey;
    const closingDay = state.currentDayNumber;

    const nextDayRollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", closingDay + 1))
      .first();
    if (nextDayRollover) throw new Error("day already closed");

    // Same ranking logic as lockDay so legacy tests/back-compat path matches prod.
    const ranked = await rankCrewAscending(ctx, closingKey);
    const loserSlug = ranked[0]?.slug;
    const secondLoserSlug = ranked[1]?.slug;
    const shotsSlug = ranked[2]?.slug;

    // Patch existing rollover OR insert one — set closedAt + (synthetic) flowWinnerSlug.
    // Marked with flowForcedClose: true so the synthetic resolution is obvious in data.
    const existing = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", closingDay))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        loserSlug,
        secondLoserSlug,
        shotsSlug,
        closedAt: now,
        flowWinnerSlug: loserSlug ?? playerSlug,
        flowResolvedAt: now,
        flowForcedClose: true,
      });
    } else {
      await ctx.db.insert("rollovers", {
        dayNumber: closingDay,
        dailyKey: closingKey,
        triggeredBySlug: playerSlug,
        triggeredAt: now,
        loserSlug,
        secondLoserSlug,
        shotsSlug,
        closedAt: now,
        flowWinnerSlug: loserSlug ?? playerSlug,
        flowResolvedAt: now,
        flowForcedClose: true,
      });
    }

    // Advance
    const newDay = closingDay + 1;
    const newDailyKey = `day-${newDay}`;
    await ctx.db.patch(state._id, {
      currentDayNumber: newDay,
      currentDailyKey: newDailyKey,
      updatedAt: now,
    });
    await ctx.db.insert("rollovers", {
      dayNumber: newDay,
      dailyKey: newDailyKey,
      triggeredBySlug: playerSlug,
      triggeredAt: now,
    });
  },
});

export const lockDay = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");
    if (!state.gamesLive) throw new Error("games not live");

    const closingKey = state.currentDailyKey;
    const closingDay = state.currentDayNumber;

    const existing = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", closingDay))
      .first();
    if (existing?.closedAt) throw new Error("day already locked");

    // Rank all crew (ties → alphabetical). Bottom = spins. 2nd-from-bottom =
    // also spins (own forfeit). 3rd-from-bottom = 5 shots, no wheel.
    const ranked = await rankCrewAscending(ctx, closingKey);
    const loserSlug = ranked[0]?.slug;
    const secondLoserSlug = ranked[1]?.slug;
    const shotsSlug = ranked[2]?.slug;

    const now = Date.now();
    // Server-pick both forfeits up front so every phone's wheels animate to
    // the same answer.
    const forfeit = loserSlug ? pickForfeit() : undefined;
    const secondForfeit = secondLoserSlug ? pickForfeit() : undefined;
    const lockPatch: Record<string, any> = {
      loserSlug,
      secondLoserSlug,
      shotsSlug,
      closedAt: now,
    };
    if (forfeit) {
      lockPatch.forfeitId = forfeit.id;
      lockPatch.forfeitLabel = forfeit.label;
      lockPatch.spunAt = now;
    }
    if (secondForfeit) {
      lockPatch.secondForfeitId = secondForfeit.id;
      lockPatch.secondForfeitLabel = secondForfeit.label;
    }
    if (existing) {
      await ctx.db.patch(existing._id, lockPatch);
    } else {
      await ctx.db.insert("rollovers", {
        dayNumber: closingDay,
        dailyKey: closingKey,
        triggeredBySlug: playerSlug,
        triggeredAt: now,
        ...lockPatch,
      });
    }
  },
});

export const advance = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");

    const now = Date.now();

    // Kickoff: pre-trip → Day 1
    if (!state.gamesLive) {
      await ctx.db.patch(state._id, {
        gamesLive: true,
        currentDayNumber: 1,
        currentDailyKey: "day-1",
        updatedAt: now,
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1,
        dailyKey: "day-1",
        triggeredBySlug: playerSlug,
        triggeredAt: now,
      });
      return;
    }

    // Normal advance: requires current day be locked AND Flow State resolved
    const current = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", state.currentDayNumber))
      .first();
    if (!current?.closedAt) throw new Error("lock the day first");
    if (!current.flowWinnerSlug) {
      throw new Error("Flow State not resolved — resolve flow state before advancing");
    }

    const newDay = state.currentDayNumber + 1;
    const newDailyKey = `day-${newDay}`;
    await ctx.db.patch(state._id, {
      currentDayNumber: newDay,
      currentDailyKey: newDailyKey,
      updatedAt: now,
    });
    await ctx.db.insert("rollovers", {
      dayNumber: newDay,
      dailyKey: newDailyKey,
      triggeredBySlug: playerSlug,
      triggeredAt: now,
    });
  },
});

export const recordForfeit = mutation({
  args: {
    token: v.string(),
    rolloverId: v.id("rollovers"),
    forfeitId: v.string(),
    forfeitLabel: v.string(),
  },
  handler: async (ctx, { token, rolloverId, forfeitId, forfeitLabel }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const row = await ctx.db.get(rolloverId);
    if (!row) throw new Error("unknown rollover");
    if (row.forfeitId) throw new Error("forfeit already recorded");
    await ctx.db.patch(rolloverId, {
      forfeitId,
      forfeitLabel,
      spunAt: Date.now(),
    });
  },
});

export const get = query({
  args: { dayNumber: v.number() },
  handler: async (ctx, { dayNumber }) => {
    return await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", dayNumber))
      .unique();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("rollovers").collect();
  },
});

export const undoLast = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");

    const all = await ctx.db.query("rollovers").collect();
    if (all.length === 0) throw new Error("no rollovers to undo");

    // The "most recent" is the highest dayNumber row.
    const sorted = all.sort((a, b) => b.dayNumber - a.dayNumber);
    const last = sorted[0];

    await ctx.db.delete(last._id);

    if (last.dayNumber === 1) {
      // Undoing the kickoff → back to pre-trip
      await ctx.db.patch(state._id, {
        gamesLive: false,
        currentDayNumber: 0,
        currentDailyKey: "pre-trip",
        updatedAt: Date.now(),
      });
    } else {
      // Undoing day N → back to day N-1
      const prev = last.dayNumber - 1;
      await ctx.db.patch(state._id, {
        currentDayNumber: prev,
        currentDailyKey: `day-${prev}`,
        updatedAt: Date.now(),
      });
    }
  },
});
