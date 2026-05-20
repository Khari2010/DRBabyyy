import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const _getPostForPush = internalQuery({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) return null;
    const author = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", post.authorSlug))
      .unique();
    return {
      authorSlug: post.authorSlug,
      authorHolidayName: author?.holidayName ?? post.authorSlug,
      text: post.text,
    };
  },
});

export const _getSubscriptionsForPost = internalQuery({
  args: { authorSlug: v.string() },
  handler: async (ctx, { authorSlug }) => {
    const all = await ctx.db.query("pushSubscriptions").collect();
    return all.filter((s) => s.playerSlug !== authorSlug);
  },
});

export const _getCommentForPush = internalQuery({
  args: { commentId: v.id("postComments") },
  handler: async (ctx, { commentId }) => {
    const c = await ctx.db.get(commentId);
    if (!c) return null;
    const post = await ctx.db.get(c.postId);
    if (!post) return null;
    const commenter = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", c.authorSlug))
      .unique();
    const op = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", post.authorSlug))
      .unique();
    return {
      postId: c.postId,
      commenterSlug: c.authorSlug,
      commenterHolidayName: commenter?.holidayName ?? c.authorSlug,
      opHolidayName: op?.holidayName ?? post.authorSlug,
      text: c.text,
    };
  },
});

export const _getSubscriptionsForComment = internalQuery({
  args: { postId: v.id("posts"), commenterSlug: v.string() },
  handler: async (ctx, { postId, commenterSlug }) => {
    const post = await ctx.db.get(postId);
    if (!post) return [];
    const comments = await ctx.db
      .query("postComments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    const recipientSlugs = new Set<string>([post.authorSlug, ...comments.map((c) => c.authorSlug)]);
    recipientSlugs.delete(commenterSlug);
    const subs = await ctx.db.query("pushSubscriptions").collect();
    return subs.filter((s) => recipientSlugs.has(s.playerSlug));
  },
});
