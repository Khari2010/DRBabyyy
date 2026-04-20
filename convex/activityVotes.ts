import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const castVote = mutation({
  args: {
    token: v.string(),
    activityId: v.string(),
    // null clears any existing vote for this player on this activity
    vote: v.union(v.literal("like"), v.literal("dislike"), v.null()),
  },
  handler: async (ctx, { token, activityId, vote }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) throw new Error("invalid session");

    const existing = await ctx.db
      .query("activityVotes")
      .withIndex("by_player_and_activity", (q) =>
        q.eq("playerSlug", session.playerSlug).eq("activityId", activityId),
      )
      .unique();

    if (vote === null) {
      if (existing) await ctx.db.delete(existing._id);
      return;
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { vote, updatedAt: now });
    } else {
      await ctx.db.insert("activityVotes", {
        playerSlug: session.playerSlug,
        activityId,
        vote,
        updatedAt: now,
      });
    }
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("activityVotes").collect();
  },
});
