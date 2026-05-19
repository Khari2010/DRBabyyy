import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("challenges")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

export const retire = mutation({
  args: { token: v.string(), challengeId: v.string() },
  handler: async (ctx, { token, challengeId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const c = await ctx.db
      .query("challenges")
      .withIndex("by_challenge_id", (q) => q.eq("challengeId", challengeId))
      .unique();
    if (!c) throw new Error("unknown challenge");
    await ctx.db.patch(c._id, { status: "retired" });
  },
});
