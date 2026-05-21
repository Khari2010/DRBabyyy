// convex/entries.ts
import { mutation, query } from "./_generated/server";
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
    await ctx.scheduler.runAfter(0, internal.leaderboardNotifications._checkDailyLeaderChange, {
      dailyKey: state.currentDailyKey,
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
    await ctx.scheduler.runAfter(0, internal.leaderboardNotifications._checkDailyLeaderChange, {
      dailyKey: entry.dailyKey,
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
      // Two crowd disputes pause the entry pending admin verification.
      // An admin (Khari/Adan) then either confirms removal or restores it.
      patch.status = "pendingReview";
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(entryId, patch);

    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendForEntryEvent, {
      entryId,
      event: "dispute",
      actorSlug: playerSlug,
    });
    await ctx.scheduler.runAfter(0, internal.leaderboardNotifications._checkDailyLeaderChange, {
      dailyKey: entry.dailyKey,
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
    await ctx.scheduler.runAfter(0, internal.leaderboardNotifications._checkDailyLeaderChange, {
      dailyKey: state.currentDailyKey,
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
    await ctx.scheduler.runAfter(0, internal.leaderboardNotifications._checkDailyLeaderChange, {
      dailyKey: state.currentDailyKey,
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
    await ctx.scheduler.runAfter(0, internal.leaderboardNotifications._checkDailyLeaderChange, {
      dailyKey: entry.dailyKey,
    });
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
    await ctx.scheduler.runAfter(0, internal.leaderboardNotifications._checkDailyLeaderChange, {
      dailyKey: entry.dailyKey,
    });
  },
});

const SCAVENGER_BONUS = { 1: 5, 2: 3, 3: 0 } as const;

async function renumberScavengerRanks(ctx: any, scavengerItemId: string) {
  const item = scavengerItemById(scavengerItemId);
  if (!item) return;

  const allForItem = await ctx.db
    .query("entries")
    .withIndex("by_scavenger_item", (q: any) => q.eq("scavengerItemId", scavengerItemId))
    .collect();

  // Survivors = anything not finalised against (still counts toward leaderboard).
  // pendingReview entries are paused so they don't hold a rank slot.
  const survivors = allForItem
    .filter((e: any) => e.status !== "disputed" && e.status !== "pendingReview")
    .sort((a: any, b: any) => a.createdAt - b.createdAt);

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
}

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
    await renumberScavengerRanks(ctx, entry.scavengerItemId);
  },
});

// Admin verification step for entries that hit 2 crowd dispute votes.
// "remove" finalises the dispute (entry stays out). "restore" returns
// the entry to active status so its points count again.
export const adminResolveDispute = mutation({
  args: {
    token: v.string(),
    entryId: v.id("entries"),
    decision: v.union(v.literal("remove"), v.literal("restore")),
  },
  handler: async (ctx, { token, entryId, decision }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);

    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.status !== "pendingReview") {
      throw new Error("entry is not awaiting review");
    }

    if (decision === "remove") {
      await ctx.db.patch(entryId, { status: "disputed", resolvedAt: Date.now() });
      if (entry.type === "scavenger" && entry.scavengerItemId) {
        await renumberScavengerRanks(ctx, entry.scavengerItemId);
      }
    } else {
      await ctx.db.patch(entryId, { status: "active", resolvedAt: undefined });
      if (entry.type === "scavenger" && entry.scavengerItemId) {
        // Restoring puts this entry back into the rank queue; renumber so
        // the rank/points reflect chronological order including this one.
        await renumberScavengerRanks(ctx, entry.scavengerItemId);
      }
    }

    await ctx.scheduler.runAfter(0, internal.leaderboardNotifications._checkDailyLeaderChange, {
      dailyKey: entry.dailyKey,
    });
  },
});

export const adminListPendingReview = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);

    const pending = await ctx.db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "pendingReview"))
      .collect();
    pending.sort((a, b) => (a.resolvedAt ?? a.createdAt) - (b.resolvedAt ?? b.createdAt));

    const challenges = await ctx.db.query("challenges").collect();
    const challengeMap = new Map(challenges.map((c) => [c.challengeId, c]));

    return await Promise.all(
      pending.map(async (e) => {
        let label = "";
        let labelIcon = "";
        let photoUrl: string | null = null;
        if (e.type === "challenge" && e.challengeId) {
          const c = challengeMap.get(e.challengeId);
          label = c?.title ?? e.challengeId;
          labelIcon = c?.icon ?? "";
        } else if (e.type === "scavenger" && e.scavengerItemId) {
          const item = scavengerItemById(e.scavengerItemId);
          label = item?.name ?? e.scavengerItemId;
          labelIcon = item?.icon ?? "";
          if (e.photoStorageId) {
            photoUrl = await ctx.storage.getUrl(e.photoStorageId);
          }
        } else if (e.type === "negative" && e.negativeId) {
          const def = NEGATIVE_POINTS_CONST.find((n) => n.negativeId === e.negativeId);
          label = def?.action ?? e.negativeId;
          labelIcon = def?.icon ?? "";
        }
        return {
          _id: e._id,
          type: e.type,
          subjectSlug: e.subjectSlug,
          appliedBySlug: e.appliedBySlug ?? null,
          label,
          labelIcon,
          photoUrl,
          points: e.points,
          dailyKey: e.dailyKey,
          vouchCount: e.vouchCount,
          disputeCount: e.disputeCount,
          createdAt: e.createdAt,
          resolvedAt: e.resolvedAt ?? null,
        };
      }),
    );
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
      (e) => e.subjectSlug === playerSlug
        && e.status !== "disputed"
        && e.status !== "pendingReview",
    );
    if (mineActive) throw new Error("already claimed");

    let points: number;
    let rank: number;
    const countsAsClaim = (e: { status: string }) =>
      e.status !== "disputed" && e.status !== "pendingReview";

    if (isDailyScavengerActive(state.currentDailyKey)) {
      const todaysItems = dailyItemsFor(state.currentDailyKey)!;
      if (!todaysItems.includes(scavengerItemId)) {
        throw new Error("not today's item");
      }
      const validCount = existingActive.filter(countsAsClaim).length;
      rank = validCount + 1;
      points = 5 + (rank === 1 ? 5 : 0);
    } else {
      // Practice mode / fallback: legacy open mechanic.
      const validCount = existingActive.filter(countsAsClaim).length;
      rank = Math.min(validCount + 1, 3);
      const bonus = SCAVENGER_BONUS[rank as 1 | 2 | 3];
      points = (item as { points: number }).points + bonus;
    }

    const entryId = await ctx.db.insert("entries", {
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
    await ctx.scheduler.runAfter(0, internal.leaderboardNotifications._checkDailyLeaderChange, {
      dailyKey: state.currentDailyKey,
    });
    return entryId;
  },
});
