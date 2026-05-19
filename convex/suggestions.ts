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
