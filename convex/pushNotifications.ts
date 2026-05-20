import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./helpers";

export const subscribe = mutation({
  args: {
    token: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, { token, endpoint, p256dh, auth, userAgent }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { playerSlug, p256dh, auth, userAgent });
      return existing._id;
    }
    return await ctx.db.insert("pushSubscriptions", {
      playerSlug,
      endpoint,
      p256dh,
      auth,
      userAgent,
      createdAt: Date.now(),
    });
  },
});

export const unsubscribe = mutation({
  args: { token: v.string(), endpoint: v.string() },
  handler: async (ctx, { token, endpoint }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (!existing) return;
    if (existing.playerSlug !== playerSlug) return; // not yours, no-op
    await ctx.db.delete(existing._id);
  },
});

export const _pruneSubscription = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const row = await ctx.db.get(subscriptionId);
    if (row) await ctx.db.delete(subscriptionId);
  },
});
