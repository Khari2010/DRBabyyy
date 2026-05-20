import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

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
    // PUSH_SCHEDULE: wired up in Task 7 once internal.pushNotifications exists.
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
