import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";
import { internal } from "./_generated/api";

const MAX_TEXT = 500;

export const create = mutation({
  args: {
    token: v.string(),
    text: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { token, text, photoStorageId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const trimmed = text.trim();
    if (trimmed.length === 0 && !photoStorageId) {
      throw new Error("post must have text or a photo");
    }
    if (trimmed.length > MAX_TEXT) {
      throw new Error("text too long");
    }
    const postId = await ctx.db.insert("posts", {
      authorSlug: playerSlug,
      text: trimmed,
      photoStorageId,
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendForPost, { postId });
    return postId;
  },
});

export const remove = mutation({
  args: { token: v.string(), postId: v.id("posts") },
  handler: async (ctx, { token, postId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("post not found");
    if (post.authorSlug !== playerSlug) {
      await requireAdmin(ctx, playerSlug);
    }
    const comments = await ctx.db
      .query("postComments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);
    const reactions = await ctx.db
      .query("postReactions")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    for (const r of reactions) await ctx.db.delete(r._id);
    if (post.photoStorageId) {
      await ctx.storage.delete(post.photoStorageId);
    }
    await ctx.db.delete(postId);
  },
});

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireSession(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const list = query({
  args: { token: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { token, paginationOpts }) => {
    const { playerSlug } = await requireSession(ctx, token);

    const page = await ctx.db
      .query("posts")
      .withIndex("by_created_at")
      .order("desc")
      .paginate(paginationOpts);

    const enriched = await Promise.all(page.page.map(async (post) => {
      const author = await ctx.db
        .query("players")
        .withIndex("by_slug", (q) => q.eq("slug", post.authorSlug))
        .unique();

      const reactions = await ctx.db
        .query("postReactions")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .collect();

      const countMap: Map<string, number> = new Map();
      const viewerReactions: string[] = [];
      for (const r of reactions) {
        countMap.set(r.emoji, (countMap.get(r.emoji) ?? 0) + 1);
        if (r.playerSlug === playerSlug) viewerReactions.push(r.emoji);
      }
      const reactionCounts = Array.from(countMap.entries()).map(([emoji, count]) => ({ emoji, count }));

      const comments = await ctx.db
        .query("postComments")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .collect();

      const photoUrl = post.photoStorageId
        ? await ctx.storage.getUrl(post.photoStorageId)
        : null;

      return {
        ...post,
        authorHolidayName: author?.holidayName ?? post.authorSlug,
        authorCatchphrase: author?.catchphrase ?? null,
        photoUrl,
        reactionCounts,
        viewerReactions,
        commentCount: comments.length,
      };
    }));

    return { ...page, page: enriched };
  },
});
