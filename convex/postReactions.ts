import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./helpers";

export const ALLOWED_REACTIONS = ["❤️", "😂", "🔥", "😭", "🍻", "👀"] as const;

export const toggle = mutation({
  args: {
    token: v.string(),
    postId: v.id("posts"),
    emoji: v.string(),
  },
  handler: async (ctx, { token, postId, emoji }) => {
    const { playerSlug } = await requireSession(ctx, token);
    if (!ALLOWED_REACTIONS.includes(emoji as any)) {
      throw new Error("reaction not allowed");
    }
    const existing = await ctx.db
      .query("postReactions")
      .withIndex("by_post_and_player", (q) => q.eq("postId", postId).eq("playerSlug", playerSlug))
      .collect();
    const match = existing.find((r) => r.emoji === emoji);
    if (match) {
      await ctx.db.delete(match._id);
    } else {
      await ctx.db.insert("postReactions", {
        postId, playerSlug, emoji, at: Date.now(),
      });
    }
  },
});
