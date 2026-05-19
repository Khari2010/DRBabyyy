import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

const MAX_TEXT = 280;

export const add = mutation({
  args: { token: v.string(), activityId: v.string(), text: v.string() },
  handler: async (ctx, { token, activityId, text }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const cleaned = text.trim().slice(0, MAX_TEXT);
    if (cleaned.length === 0) throw new Error("text required");
    await ctx.db.insert("activityComments", {
      activityId, authorSlug: playerSlug, text: cleaned, createdAt: Date.now(),
    });
  },
});

export const listByActivity = query({
  args: { activityId: v.string() },
  handler: async (ctx, { activityId }) => {
    const rows = await ctx.db
      .query("activityComments")
      .withIndex("by_activity", (q) => q.eq("activityId", activityId))
      .collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const remove = mutation({
  args: { token: v.string(), commentId: v.id("activityComments") },
  handler: async (ctx, { token, commentId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const row = await ctx.db.get(commentId);
    if (!row) throw new Error("not found");
    if (row.authorSlug !== playerSlug) {
      await requireAdmin(ctx, playerSlug);
    }
    await ctx.db.delete(commentId);
  },
});
