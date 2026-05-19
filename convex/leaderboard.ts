import { query } from "./_generated/server";
import { v } from "convex/values";
import { NEGATIVE_POINTS_CONST } from "./_seedData/challenges";

type Row = { slug: string; total: number; claimCount: number; verifiedCount: number; earliestAt: number };

function aggregate(entries: Array<{ subjectSlug: string; points: number; status: string; createdAt: number }>): Row[] {
  const map = new Map<string, Row>();
  for (const e of entries) {
    if (e.status === "disputed") continue;
    const row = map.get(e.subjectSlug) ?? { slug: e.subjectSlug, total: 0, claimCount: 0, verifiedCount: 0, earliestAt: Infinity };
    row.total += e.points;
    row.claimCount += 1;
    if (e.status === "verified") row.verifiedCount += 1;
    if (e.createdAt < row.earliestAt) row.earliestAt = e.createdAt;
    map.set(e.subjectSlug, row);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.verifiedCount !== a.verifiedCount) return b.verifiedCount - a.verifiedCount;
    return a.earliestAt - b.earliestAt;
  });
}

export const getDaily = query({
  args: { dailyKey: v.string() },
  handler: async (ctx, { dailyKey }) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", dailyKey))
      .collect();
    return aggregate(entries);
  },
});

export const getHoliday = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("entries").collect();
    return aggregate(entries);
  },
});

export const getRecentActivity = query({
  args: { limit: v.number(), token: v.optional(v.string()) },
  handler: async (ctx, { limit, token }) => {
    const all = await ctx.db.query("entries").collect();
    const sorted = all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);

    let mySlug: string | null = null;
    if (token) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      mySlug = session?.playerSlug ?? null;
    }

    return await Promise.all(sorted.map(async (e) => {
      let myReaction: "vouch" | "dispute" | null = null;
      if (mySlug) {
        const reaction = await ctx.db
          .query("entryReactions")
          .withIndex("by_entry_and_player", (q) => q.eq("entryId", e._id).eq("playerSlug", mySlug!))
          .unique();
        myReaction = reaction?.reaction ?? null;
      }
      let label = "";
      let labelIcon = "";
      if (e.type === "challenge" && e.challengeId) {
        const challenge = await ctx.db
          .query("challenges")
          .withIndex("by_challenge_id", (q) => q.eq("challengeId", e.challengeId!))
          .unique();
        label = challenge?.title ?? e.challengeId;
        labelIcon = challenge?.icon ?? "";
      } else if (e.type === "negative" && e.negativeId) {
        const neg = NEGATIVE_POINTS_CONST.find((n) => n.negativeId === e.negativeId);
        label = neg?.action ?? e.negativeId;
        labelIcon = neg?.icon ?? "";
      }

      return { ...e, myReaction, label, labelIcon };
    }));
  },
});
