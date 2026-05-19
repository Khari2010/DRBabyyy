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
