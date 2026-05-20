import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireSession } from "./helpers";

// Order matches the spec §3 — keep this stable; the UI relies on it.
const ITEM_ORDER = [
  "holidayName",
  "catchphrase",
  "room",
  "lockscreen",
  "wallPost",
  "challengeClaim",
  "scavengerVisit",
  "adventureVote",
  "leaderboardVisit",
] as const;
type ItemId = (typeof ITEM_ORDER)[number];

async function loadProgressRow(ctx: QueryCtx | MutationCtx, slug: string) {
  return await ctx.db
    .query("playerProgress")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
}

async function ensureProgressRow(ctx: MutationCtx, slug: string) {
  const existing = await loadProgressRow(ctx, slug);
  if (existing) return existing;
  const id = await ctx.db.insert("playerProgress", {
    slug,
    visitedLeaderboard: false,
    visitedScavenger: false,
    lockscreenSeen: false,
    welcomeHidden: false,
  });
  const fresh = await ctx.db.get(id);
  if (!fresh) throw new Error("failed to create playerProgress row");
  return fresh;
}

async function requireSelf(ctx: MutationCtx, token: string, slug: string) {
  const { playerSlug } = await requireSession(ctx, token);
  if (playerSlug !== slug) throw new Error("not your progress");
}

export const getProgress = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const [player, progress, posts, entries, votes] = await Promise.all([
      ctx.db.query("players").withIndex("by_slug", (q) => q.eq("slug", slug)).unique(),
      loadProgressRow(ctx, slug),
      // posts has no by_author index — collect and filter (≤8 players, low volume).
      ctx.db.query("posts").collect(),
      ctx.db.query("entries").withIndex("by_subject", (q) => q.eq("subjectSlug", slug)).take(1),
      ctx.db.query("activityVotes").collect(),
    ]);

    const hasHolidayName = !!(player?.holidayName && player.holidayName.length > 0);
    const hasCatchphrase = !!(player?.catchphrase && player.catchphrase.length > 0);
    const hasRoom = !!(player?.roomNumber && player.roomNumber.length > 0);
    const hasWallPost = posts.some((p) => p.authorSlug === slug);
    const hasChallengeClaim = entries.length > 0;
    const hasAdventureVote = votes.some((v) => v.playerSlug === slug);

    const lockscreenSeen = progress?.lockscreenSeen === true;
    const visitedScavenger = progress?.visitedScavenger === true;
    const visitedLeaderboard = progress?.visitedLeaderboard === true;
    const hidden = progress?.welcomeHidden === true;

    const byId: Record<ItemId, boolean> = {
      holidayName: hasHolidayName,
      catchphrase: hasCatchphrase,
      room: hasRoom,
      lockscreen: lockscreenSeen,
      wallPost: hasWallPost,
      challengeClaim: hasChallengeClaim,
      scavengerVisit: visitedScavenger,
      adventureVote: hasAdventureVote,
      leaderboardVisit: visitedLeaderboard,
    };

    const items = ITEM_ORDER.map((id) => ({ id, done: byId[id] }));
    const doneCount = items.reduce((n, i) => n + (i.done ? 1 : 0), 0);

    return { items, doneCount, totalCount: items.length, hidden };
  },
});
