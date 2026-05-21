import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./helpers";

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireSession(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getMyFinds = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const rows = await ctx.db
      .query("entries")
      .withIndex("by_subject", (q) => q.eq("subjectSlug", playerSlug))
      .collect();
    const scavengerRows = rows.filter((r) => r.type === "scavenger");
    return await Promise.all(scavengerRows.map(async (e) => ({
      ...e,
      photoUrl: e.photoStorageId ? await ctx.storage.getUrl(e.photoStorageId) : null,
    })));
  },
});

export const getItemFinders = query({
  args: { scavengerItemId: v.string() },
  handler: async (ctx, { scavengerItemId }) => {
    const rows = await ctx.db
      .query("entries")
      .withIndex("by_scavenger_item", (q) => q.eq("scavengerItemId", scavengerItemId))
      .collect();
    const active = rows
      .filter((r) => r.status !== "disputed" && r.status !== "pendingReview")
      .sort((a, b) => a.createdAt - b.createdAt);
    return await Promise.all(active.map(async (e) => ({
      _id: e._id,
      subjectSlug: e.subjectSlug,
      scavengerRank: e.scavengerRank,
      createdAt: e.createdAt,
      photoUrl: e.photoStorageId ? await ctx.storage.getUrl(e.photoStorageId) : null,
    })));
  },
});
