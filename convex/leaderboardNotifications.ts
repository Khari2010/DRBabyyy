import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Practice days are excluded from the holiday board, and we don't want to
// spam everyone with leader-change pings during the warm-up either.
const PRACTICE_DAILY_KEYS = new Set(["day-1"]);

type EntryLike = {
  subjectSlug: string;
  points: number;
  status: string;
  vouchCount: number;
  createdAt: number;
};

// Returns the current #1 slug for a list of entries, mirroring the
// total → verifiedCount → earliestAt ordering used by leaderboard.aggregate.
function pickTop(entries: EntryLike[]): { slug: string; total: number } | null {
  const map = new Map<string, { slug: string; total: number; verifiedCount: number; earliestAt: number }>();
  for (const e of entries) {
    if (e.status === "disputed") continue;
    const row = map.get(e.subjectSlug) ?? {
      slug: e.subjectSlug,
      total: 0,
      verifiedCount: 0,
      earliestAt: Infinity,
    };
    row.total += e.points;
    if (e.status === "verified") row.verifiedCount += 1;
    if (e.createdAt < row.earliestAt) row.earliestAt = e.createdAt;
    map.set(e.subjectSlug, row);
  }
  const rows = Array.from(map.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.verifiedCount !== a.verifiedCount) return b.verifiedCount - a.verifiedCount;
    return a.earliestAt - b.earliestAt;
  });
  if (rows.length === 0) return null;
  return { slug: rows[0].slug, total: rows[0].total };
}

export const _checkDailyLeaderChange = internalMutation({
  args: { dailyKey: v.string() },
  handler: async (ctx, { dailyKey }) => {
    if (PRACTICE_DAILY_KEYS.has(dailyKey)) return;

    // Only fire for changes on the live day. Historical edits (e.g. an admin
    // touching yesterday's entries) shouldn't ping anyone.
    const state = await ctx.db.query("gameState").first();
    if (!state || !state.gamesLive) return;
    if (state.currentDailyKey !== dailyKey) return;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", dailyKey))
      .collect();
    const top = pickTop(entries);

    const stored = await ctx.db
      .query("leaderboardTopState")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", dailyKey))
      .unique();

    if (!top) {
      // Board emptied (e.g. unclaim of the only entry). Clear stored leader
      // so the next claim fires a fresh "first on the board" notification.
      if (stored) await ctx.db.delete(stored._id);
      return;
    }

    if (stored && stored.topSlug === top.slug) {
      // Same leader — keep totals fresh but don't notify.
      if (stored.topTotal !== top.total) {
        await ctx.db.patch(stored._id, { topTotal: top.total, updatedAt: Date.now() });
      }
      return;
    }

    const previousTopSlug = stored?.topSlug ?? null;
    if (stored) {
      await ctx.db.patch(stored._id, {
        topSlug: top.slug,
        topTotal: top.total,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("leaderboardTopState", {
        dailyKey,
        topSlug: top.slug,
        topTotal: top.total,
        updatedAt: Date.now(),
      });
    }

    await ctx.scheduler.runAfter(0, internal.pushNotificationsActions.sendForLeaderChange, {
      dailyKey,
      newTopSlug: top.slug,
      newTopTotal: top.total,
      previousTopSlug,
    });
  },
});

export const _getLeaderPushInfo = internalQuery({
  args: { newTopSlug: v.string() },
  handler: async (ctx, { newTopSlug }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", newTopSlug))
      .unique();
    const subscriptions = await ctx.db.query("pushSubscriptions").collect();
    return {
      holidayName: player?.holidayName ?? newTopSlug,
      subscriptions,
    };
  },
});
