import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./helpers";

// Quick-pick set shown by the ReactionRow picker. Any emoji from the system
// keyboard is also accepted by the mutation below — the array just drives the UI.
export const QUICK_REACTIONS = ["❤️", "😂", "🔥", "😭", "🍻", "👀"] as const;

const MAX_EMOJI_LEN = 32; // covers ZWJ family / flag sequences, blocks anything weird

export const toggle = mutation({
  args: {
    token: v.string(),
    postId: v.id("posts"),
    emoji: v.string(),
  },
  handler: async (ctx, { token, postId, emoji }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const clean = emoji.trim();
    if (clean.length === 0 || clean.length > MAX_EMOJI_LEN) {
      throw new Error("reaction not allowed");
    }
    const existing = await ctx.db
      .query("postReactions")
      .withIndex("by_post_and_player", (q) => q.eq("postId", postId).eq("playerSlug", playerSlug))
      .collect();
    const match = existing.find((r) => r.emoji === clean);
    if (match) {
      await ctx.db.delete(match._id);
    } else {
      await ctx.db.insert("postReactions", {
        postId, playerSlug, emoji: clean, at: Date.now(),
      });
    }
  },
});
