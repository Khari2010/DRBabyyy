import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_CHARS = 280;

export const save = mutation({
  args: {
    token: v.string(),
    questionId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, { token, questionId, text }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) throw new Error("invalid session");

    const trimmed = text.slice(0, MAX_CHARS);
    const now = Date.now();

    const existing = await ctx.db
      .query("answers")
      .withIndex("by_slug_and_question", (q) =>
        q.eq("playerSlug", session.playerSlug).eq("questionId", questionId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { text: trimmed, updatedAt: now });
    } else {
      await ctx.db.insert("answers", {
        playerSlug: session.playerSlug,
        questionId,
        text: trimmed,
        updatedAt: now,
      });
    }
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("answers").collect();
  },
});
