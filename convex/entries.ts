// convex/entries.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, getGameState } from "./helpers";

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

    await ctx.db.insert("entries", {
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
  },
});

export const vouch = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.subjectSlug === playerSlug) throw new Error("cannot react to own entry");

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
  },
});

export const dispute = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.subjectSlug === playerSlug) throw new Error("cannot react to own entry");

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
  },
});
