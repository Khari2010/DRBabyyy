import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

const MAX_TEXT = 280;

export const add = mutation({
  args: { token: v.string(), postId: v.id("posts"), text: v.string() },
  handler: async (ctx, { token, postId, text }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("post not found");
    const trimmed = text.trim();
    if (trimmed.length === 0) throw new Error("text required");
    if (trimmed.length > MAX_TEXT) throw new Error("text too long");
    const commentId = await ctx.db.insert("postComments", {
      postId,
      authorSlug: playerSlug,
      text: trimmed,
      createdAt: Date.now(),
    });
    // PUSH_SCHEDULE: wired up in Task 7 once internal.pushNotifications exists.
    return commentId;
  },
});

export const remove = mutation({
  args: { token: v.string(), commentId: v.id("postComments") },
  handler: async (ctx, { token, commentId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const row = await ctx.db.get(commentId);
    if (!row) throw new Error("comment not found");
    if (row.authorSlug !== playerSlug) {
      await requireAdmin(ctx, playerSlug);
    }
    await ctx.db.delete(commentId);
  },
});

export const listByPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const rows = await ctx.db
      .query("postComments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    rows.sort((a, b) => a.createdAt - b.createdAt);
    return await Promise.all(rows.map(async (r) => {
      const author = await ctx.db
        .query("players")
        .withIndex("by_slug", (q) => q.eq("slug", r.authorSlug))
        .unique();
      return { ...r, authorHolidayName: author?.holidayName ?? r.authorSlug };
    }));
  },
});
