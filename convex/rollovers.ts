import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin, getGameState } from "./helpers";

function nextDailyKey(dayNumber: number) {
  return `day-${dayNumber}`;
}

export const trigger = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");

    const now = Date.now();

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

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", closingKey))
      .collect();

    const totals = new Map<string, number>();
    for (const e of entries) {
      if (e.status === "disputed") continue;
      totals.set(e.subjectSlug, (totals.get(e.subjectSlug) ?? 0) + e.points);
    }
    let loserSlug: string | undefined;
    let loserTotal = Infinity;
    for (const [slug, total] of totals.entries()) {
      if (total < loserTotal) {
        loserSlug = slug;
        loserTotal = total;
      }
    }

    // Patch the existing rollover row for the closing day (inserted at kickoff).
    const existingRollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", closingDay))
      .first();
    if (existingRollover) {
      await ctx.db.patch(existingRollover._id, { loserSlug });
    } else {
      await ctx.db.insert("rollovers", {
        dayNumber: closingDay,
        dailyKey: closingKey,
        triggeredBySlug: playerSlug,
        triggeredAt: now,
        loserSlug,
      });
    }

    const newDay = closingDay + 1;
    const newDailyKey = nextDailyKey(newDay);
    await ctx.db.patch(state._id, {
      currentDayNumber: newDay,
      currentDailyKey: newDailyKey,
      updatedAt: now,
    });
    // Insert a placeholder row for the new day (will be patched at next rollover).
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

    // Compute loser (lowest score among non-disputed entries)
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", closingKey))
      .collect();
    const totals = new Map<string, number>();
    for (const e of entries) {
      if (e.status === "disputed") continue;
      totals.set(e.subjectSlug, (totals.get(e.subjectSlug) ?? 0) + e.points);
    }
    let loserSlug: string | undefined;
    let loserTotal = Infinity;
    for (const [slug, total] of totals.entries()) {
      if (total < loserTotal) { loserSlug = slug; loserTotal = total; }
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { loserSlug, closedAt: now });
    } else {
      await ctx.db.insert("rollovers", {
        dayNumber: closingDay,
        dailyKey: closingKey,
        triggeredBySlug: playerSlug,
        triggeredAt: now,
        loserSlug,
        closedAt: now,
      });
    }
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
