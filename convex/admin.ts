import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

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

export const resetGame = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);

    // Wipe all volatile tables
    for (const table of ["entries", "entryReactions", "rollovers", "suggestions", "suggestionVotes"] as const) {
      const rows = await ctx.db.query(table).collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }

    // Wipe only user-created challenges (those promoted from approved suggestions).
    // Seeded challenges have createdBySlug === undefined; user-created ones have it set.
    const allChallenges = await ctx.db.query("challenges").collect();
    for (const c of allChallenges) {
      if (c.createdBySlug !== undefined) {
        await ctx.db.delete(c._id);
      }
    }

    // Reset gameState back to pre-trip
    const state = await ctx.db.query("gameState").first();
    if (state) {
      await ctx.db.patch(state._id, {
        gamesLive: false,
        currentDayNumber: 0,
        currentDailyKey: "pre-trip",
        updatedAt: Date.now(),
      });
    }
  },
});
