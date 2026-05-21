import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin, getGameState } from "./helpers";
import { finaliseFlowResolution } from "./flowVotes";

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

// Tables to wipe on resetGame. Keep this list in sync with the schema:
// every table that holds game-play activity belongs here. Tables that hold
// player profile data (players, answers, playerProgress), auth (sessions,
// adminRoles, pushSubscriptions), seeded config (challenges — handled
// selectively below), or singletons (gameState — patched below) are
// deliberately excluded.
const VOLATILE_TABLES = [
  "entries",
  "entryReactions",
  "rollovers",
  "suggestions",
  "suggestionVotes",
  "activitySuggestions",
  "activitySuggestionVotes",
  "activityVotes",
  "activityComments",
  "dayComments",
  "flowVotes",
  "itemRsvps",
  "posts",
  "postComments",
  "postReactions",
] as const;

export const resetGame = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);

    for (const table of VOLATILE_TABLES) {
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

export const adminForceCloseFlowVote = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");
    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", state.currentDayNumber))
      .first();
    if (!rollover) throw new Error("no rollover for current day");
    if (!rollover.loserSlug) throw new Error("day not locked");
    if (rollover.flowWinnerSlug) throw new Error("already resolved");
    const votes = await ctx.db
      .query("flowVotes")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", rollover.dailyKey))
      .collect();
    await finaliseFlowResolution(ctx, rollover, votes, /* forced */ true);
  },
});

export const adminBreakFlowTie = mutation({
  args: { token: v.string(), voteeSlug: v.string() },
  handler: async (ctx, { token, voteeSlug }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");
    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", state.currentDayNumber))
      .first();
    if (!rollover) throw new Error("no rollover for current day");
    if (!rollover.flowTieCandidates || rollover.flowTieCandidates.length === 0) {
      throw new Error("no tie to break");
    }
    if (!rollover.flowTieCandidates.includes(voteeSlug)) {
      throw new Error("not a tied candidate");
    }
    await ctx.db.patch(rollover._id, {
      flowWinnerSlug: voteeSlug,
      flowResolvedAt: Date.now(),
      flowTieCandidates: undefined,
    });
    await ctx.db.insert("entries", {
      type: "flowWin",
      subjectSlug: voteeSlug,
      points: 10,
      status: "verified",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: rollover.dailyKey,
      createdAt: Date.now(),
    });
  },
});
