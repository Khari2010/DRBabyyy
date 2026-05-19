import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./helpers";

export const setItemRsvp = mutation({
  args: {
    token: v.string(),
    dayDate: v.string(),
    itemKey: v.string(),
    status: v.union(v.literal("in"), v.literal("out")),
  },
  handler: async (ctx, { token, dayDate, itemKey, status }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const existing = await ctx.db
      .query("itemRsvps")
      .withIndex("by_player_day_item", (q) =>
        q.eq("playerSlug", playerSlug).eq("dayDate", dayDate).eq("itemKey", itemKey))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { status, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("itemRsvps", {
        dayDate, itemKey, playerSlug, status, updatedAt: Date.now(),
      });
    }
  },
});

export const clearItemRsvp = mutation({
  args: { token: v.string(), dayDate: v.string(), itemKey: v.string() },
  handler: async (ctx, { token, dayDate, itemKey }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const existing = await ctx.db
      .query("itemRsvps")
      .withIndex("by_player_day_item", (q) =>
        q.eq("playerSlug", playerSlug).eq("dayDate", dayDate).eq("itemKey", itemKey))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const rsvpsForDay = query({
  args: { dayDate: v.string() },
  handler: async (ctx, { dayDate }) => {
    const rows = await ctx.db
      .query("itemRsvps")
      .withIndex("by_day_and_item", (q) => q.eq("dayDate", dayDate))
      .collect();
    const grouped: Record<string, { in: string[]; out: string[] }> = {};
    for (const r of rows) {
      if (!grouped[r.itemKey]) grouped[r.itemKey] = { in: [], out: [] };
      grouped[r.itemKey][r.status].push(r.playerSlug);
    }
    return grouped;
  },
});
