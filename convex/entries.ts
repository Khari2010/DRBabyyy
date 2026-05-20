// convex/entries.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, getGameState, requireAdmin } from "./helpers";
import { internal } from "./_generated/api";
import { NEGATIVE_POINTS_CONST } from "./_seedData/challenges";
import { itemById as scavengerItemById } from "../src/data/scavenger.js";
import { dailyItemsFor, isDailyScavengerActive } from "../src/data/dailyScavenger.js";

export const claim = mutation({
  args: {
    token: v.string(),
    challengeId: v.string(),
    bonusKey: v.optional(v.string()),
  },
  handler: async (ctx, { token, challengeId, bonusKey }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const state = await getGameState(ctx);
    if (!state || !state.gamesLive) throw new Error("games not live");

    const challenge = await ctx.db
      .query("challenges")
      .withIndex("by_challenge_id", (q) => q.eq("challengeId", challengeId))
      .unique();
    if (!challenge || challenge.status !== "active") throw new Error("unknown challenge");

    let points = challenge.points;
    if (bonusKey === "crowd") points += 50;
    if (bonusKey === "money") points += 50;
    if (bonusKey === "crowd+money") points += 100;
    if (bonusKey === "everyone") points += 30;

    const entryId = await ctx.db.insert("entries", {
      type: "challenge",
      subjectSlug: playerSlug,
      challengeId,
      points,
      bonusKey,
      status: "active",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: state.currentDailyKey,
      createdAt: Date.now(),
    });
    return entryId;
  },
});

export const vouch = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.subjectSlug === playerSlug) throw new Error("cannot react to own entry");
    if (entry.type === "negative" && entry.appliedBySlug === playerSlug) {
      throw new Error("cannot vouch your own foul");
    }

    const state = await getGameState(ctx);
    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", entry.dailyKey))
      .first();
    const locked = !!rollover?.closedAt
      || (state && entry.dailyKey !== state.currentDailyKey);
    if (locked) {
      throw new Error("day is locked");
    }

    const existing = await ctx.db
      .query("entryReactions")
      .withIndex("by_entry_and_player", (q) => q.eq("entryId", entryId).eq("playerSlug", playerSlug))
      .unique();
    if (existing) throw new Error("already reacted");

    await ctx.db.insert("entryReactions", { entryId, playerSlug, reaction: "vouch", at: Date.now() });

    const newCount = entry.vouchCount + 1;
    const patch: Record<string, any> = { vouchCount: newCount };
    if (entry.status === "active" && newCount >= 1) {
      patch.status = "verified";
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(entryId, patch);

    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendForEntryEvent, {
      entryId,
      event: "vouch",
      actorSlug: playerSlug,
    });
  },
});

export const dispute = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    // The subject can defend themselves against a foul, but cannot dispute
    // a positive claim they made about themselves.
    if (entry.subjectSlug === playerSlug && entry.type !== "negative") {
      throw new Error("cannot react to own entry");
    }
    if (entry.type === "negative" && entry.appliedBySlug === playerSlug) {
      throw new Error("cannot dispute your own foul — remove it instead");
    }

    const state = await getGameState(ctx);
    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", entry.dailyKey))
      .first();
    const locked = !!rollover?.closedAt
      || (state && entry.dailyKey !== state.currentDailyKey);
    if (locked) {
      throw new Error("day is locked");
    }

    const existing = await ctx.db
      .query("entryReactions")
      .withIndex("by_entry_and_player", (q) => q.eq("entryId", entryId).eq("playerSlug", playerSlug))
      .unique();
    if (existing) throw new Error("already reacted");

    await ctx.db.insert("entryReactions", { entryId, playerSlug, reaction: "dispute", at: Date.now() });

    const newCount = entry.disputeCount + 1;
    const patch: Record<string, any> = { disputeCount: newCount };
    if (entry.status === "active" && newCount >= 2) {
      patch.status = "disputed";
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(entryId, patch);

    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendForEntryEvent, {
      entryId,
      event: "dispute",
      actorSlug: playerSlug,
    });
  },
});

export const logNegative = mutation({
  args: { token: v.string(), subjectSlug: v.string(), negativeId: v.string() },
  handler: async (ctx, { token, subjectSlug, negativeId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    if (subjectSlug === playerSlug) throw new Error("cannot foul yourself");
    const state = await getGameState(ctx);
    if (!state || !state.gamesLive) throw new Error("games not live");

    const def = NEGATIVE_POINTS_CONST.find((n) => n.negativeId === negativeId);
    if (!def) throw new Error("unknown negative action");

    await ctx.db.insert("entries", {
      type: "negative",
      subjectSlug,
      appliedBySlug: playerSlug,
      negativeId,
      points: def.points,
      status: "active",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: state.currentDailyKey,
      createdAt: Date.now(),
    });
  },
});

export const applyForfeitDeduct = mutation({
  args: { token: v.string(), targetSlug: v.string(), amount: v.number() },
  handler: async (ctx, { token, targetSlug, amount }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state || !state.gamesLive) throw new Error("games not live");
    const entryId = await ctx.db.insert("entries", {
      type: "negative",
      subjectSlug: targetSlug,
      appliedBySlug: "system",
      negativeId: "forfeit-deduct",
      points: -Math.abs(amount),
      status: "verified",
      vouchCount: 1,
      disputeCount: 0,
      dailyKey: state.currentDailyKey,
      createdAt: Date.now(),
      resolvedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendForEntryEvent, {
      entryId,
      event: "forfeit-applied",
      actorSlug: playerSlug,
    });
  },
});

export const unclaim = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.subjectSlug !== playerSlug) throw new Error("not your entry");
    if (entry.status !== "active") throw new Error("already resolved");
    if (Date.now() - entry.createdAt > 60_000) throw new Error("too late to undo");

    const reactions = await ctx.db
      .query("entryReactions")
      .withIndex("by_entry", (q) => q.eq("entryId", entryId))
      .collect();
    for (const r of reactions) await ctx.db.delete(r._id);

    await ctx.db.delete(entryId);
  },
});

// Logger removes their own foul. Unlike unclaim, no time limit — but only
// works while the foul is still active (no vouches landed yet).
export const removeNegative = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.type !== "negative") throw new Error("not a foul entry");
    if (entry.appliedBySlug !== playerSlug) throw new Error("not your foul to remove");
    if (entry.status !== "active") throw new Error("already resolved — ask an admin");

    const reactions = await ctx.db
      .query("entryReactions")
      .withIndex("by_entry", (q) => q.eq("entryId", entryId))
      .collect();
    for (const r of reactions) await ctx.db.delete(r._id);

    await ctx.db.delete(entryId);
  },
});

const SCAVENGER_BONUS = { 1: 5, 2: 3, 3: 0 } as const;

export const rejectScavenger = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);

    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.type !== "scavenger") throw new Error("not a scavenger entry");
    if (entry.status === "disputed") throw new Error("already rejected");
    if (!entry.scavengerItemId) throw new Error("entry missing scavengerItemId");

    await ctx.db.patch(entryId, { status: "disputed", resolvedAt: Date.now() });

    const item = scavengerItemById(entry.scavengerItemId);
    if (!item) return;

    // Renumber all surviving active claims by chronological order.
    // The Nth oldest active claim gets rank min(N, 3). This correctly
    // handles the case where multiple late entries share rank 3 — only
    // one of them slides up to rank 2 when a higher rank opens.
    const allForItem = await ctx.db
      .query("entries")
      .withIndex("by_scavenger_item", (q) => q.eq("scavengerItemId", entry.scavengerItemId))
      .collect();

    const survivors = allForItem
      .filter((e) => e.status !== "disputed")
      .sort((a, b) => a.createdAt - b.createdAt);

    for (let i = 0; i < survivors.length; i++) {
      const e = survivors[i];
      const dailyMode = isDailyScavengerActive(e.dailyKey);
      const newRank = dailyMode ? i + 1 : Math.min(i + 1, 3);
      if (e.scavengerRank !== newRank) {
        const newPoints = dailyMode
          ? 5 + (newRank === 1 ? 5 : 0)
          : item.points + SCAVENGER_BONUS[newRank as 1 | 2 | 3];
        await ctx.db.patch(e._id, {
          scavengerRank: newRank,
          points: newPoints,
        });
      }
    }
  },
});

export const claimScavenger = mutation({
  args: {
    token: v.string(),
    scavengerItemId: v.string(),
    photoStorageId: v.id("_storage"),
  },
  handler: async (ctx, { token, scavengerItemId, photoStorageId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const state = await getGameState(ctx);
    if (!state?.gamesLive) throw new Error("games not live");

    const item = scavengerItemById(scavengerItemId);
    if (!item) throw new Error("unknown item");

    const existingActive = await ctx.db
      .query("entries")
      .withIndex("by_scavenger_item", (q) => q.eq("scavengerItemId", scavengerItemId))
      .collect();

    const mineActive = existingActive.find(
      (e) => e.subjectSlug === playerSlug && e.status !== "disputed",
    );
    if (mineActive) throw new Error("already claimed");

    let points: number;
    let rank: number;

    if (isDailyScavengerActive(state.currentDailyKey)) {
      const todaysItems = dailyItemsFor(state.currentDailyKey)!;
      if (!todaysItems.includes(scavengerItemId)) {
        throw new Error("not today's item");
      }
      const validCount = existingActive.filter((e) => e.status !== "disputed").length;
      rank = validCount + 1;
      points = 5 + (rank === 1 ? 5 : 0);
    } else {
      // Practice mode / fallback: legacy open mechanic.
      const validCount = existingActive.filter((e) => e.status !== "disputed").length;
      rank = Math.min(validCount + 1, 3);
      const bonus = SCAVENGER_BONUS[rank as 1 | 2 | 3];
      points = (item as { points: number }).points + bonus;
    }

    return await ctx.db.insert("entries", {
      type: "scavenger",
      subjectSlug: playerSlug,
      points,
      status: "active",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: state.currentDailyKey,
      createdAt: Date.now(),
      scavengerItemId,
      photoStorageId,
      scavengerRank: rank,
    });
  },
});
