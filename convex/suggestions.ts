import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin, deriveDifficulty } from "./helpers";

export const APPROVE_THRESHOLD = 5;
export const REJECT_THRESHOLD = 5;

export const create = mutation({
  args: { token: v.string(), title: v.string(), icon: v.optional(v.string()) },
  handler: async (ctx, { token, title, icon }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const cleaned = title.trim();
    if (cleaned.length === 0) throw new Error("title required");
    await ctx.db.insert("suggestions", {
      proposerSlug: playerSlug,
      title: cleaned,
      icon,
      status: "proposed",
      yesCount: 0,
      noCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const draft = mutation({
  args: {
    token: v.string(),
    suggestionId: v.id("suggestions"),
    points: v.number(),
    category: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { token, suggestionId, points, category, icon }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status !== "proposed") throw new Error(`cannot draft suggestion in status ${s.status}`);
    await ctx.db.patch(suggestionId, {
      status: "voting",
      points,
      category,
      difficulty: deriveDifficulty(points),
      icon: icon ?? s.icon,
      draftedAt: Date.now(),
    });
  },
});
