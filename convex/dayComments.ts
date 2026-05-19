import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

const MAX_TEXT = 280;

export const add = mutation({
  args: { token: v.string(), dayDate: v.string(), text: v.string() },
  handler: async (ctx, { token, dayDate, text }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const cleaned = text.trim().slice(0, MAX_TEXT);
    if (cleaned.length === 0) throw new Error("text required");
    await ctx.db.insert("dayComments", {
      dayDate, authorSlug: playerSlug, text: cleaned, createdAt: Date.now(),
    });
  },
});

export const listByDay = query({
  args: { dayDate: v.string() },
  handler: async (ctx, { dayDate }) => {
    const rows = await ctx.db
      .query("dayComments")
      .withIndex("by_day", (q) => q.eq("dayDate", dayDate))
      .collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const remove = mutation({
  args: { token: v.string(), commentId: v.id("dayComments") },
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
