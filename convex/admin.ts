import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const resetPasscode = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!player) throw new Error("unknown player");

    await ctx.db.patch(player._id, { passcodeHash: null });

    const sessions = await ctx.db.query("sessions").collect();
    for (const s of sessions) {
      if (s.playerSlug === slug) {
        await ctx.db.delete(s._id);
      }
    }
  },
});

export const isAdmin = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return false;
    const role = await ctx.db
      .query("adminRoles")
      .withIndex("by_slug", (q) => q.eq("playerSlug", session.playerSlug))
      .unique();
    return role !== null;
  },
});
