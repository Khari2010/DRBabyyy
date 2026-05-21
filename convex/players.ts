import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { NEGATIVE_POINTS_CONST } from "./_seedData/challenges";
import { itemById as scavengerItemById } from "../src/data/scavenger.js";

const MAX_HOLIDAY_NAME_LENGTH = 24;

function normalizeHolidayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) {
    throw new Error("Holiday name cannot be empty");
  }
  if (trimmed.length > MAX_HOLIDAY_NAME_LENGTH) {
    throw new Error(`Holiday name must be ${MAX_HOLIDAY_NAME_LENGTH} characters or fewer`);
  }
  if (!/^[\p{L}\p{N} '\-.!?&]+$/u.test(trimmed)) {
    throw new Error("Holiday name has unsupported characters");
  }
  return trimmed;
}

export const setMyHolidayName = mutation({
  args: { token: v.string(), holidayName: v.string() },
  handler: async (ctx, { token, holidayName }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) throw new Error("not logged in");

    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", session.playerSlug))
      .unique();
    if (!player) throw new Error("unknown player");

    const clean = normalizeHolidayName(holidayName);
    await ctx.db.patch(player._id, { holidayName: clean });
    return { holidayName: clean };
  },
});

export const clearMyHolidayName = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) throw new Error("not logged in");

    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", session.playerSlug))
      .unique();
    if (!player) throw new Error("unknown player");

    await ctx.db.patch(player._id, { holidayName: undefined });
  },
});

export const holidayNameMap = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    const map: Record<string, string> = {};
    for (const p of players) {
      if (p.holidayName && p.holidayName.length > 0) {
        map[p.slug] = p.holidayName;
      }
    }
    return map;
  },
});

export const myHolidayName = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return null;

    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", session.playerSlug))
      .unique();
    return player?.holidayName ?? null;
  },
});

export const setMyRoomNumber = mutation({
  args: { token: v.string(), roomNumber: v.string() },
  handler: async (ctx, { token, roomNumber }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) throw new Error("invalid session");
    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", session.playerSlug))
      .unique();
    if (!player) throw new Error("player not found");
    const clean = roomNumber.trim().slice(0, 16);
    await ctx.db.patch(player._id, { roomNumber: clean || undefined });
    return { roomNumber: clean };
  },
});

export const clearMyRoomNumber = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) throw new Error("invalid session");
    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", session.playerSlug))
      .unique();
    if (!player) throw new Error("player not found");
    await ctx.db.patch(player._id, { roomNumber: undefined });
  },
});

export const roomNumberMap = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("players").collect();
    const map: Record<string, string> = {};
    for (const p of all) {
      if (p.roomNumber && p.roomNumber.length > 0) {
        map[p.slug] = p.roomNumber;
      }
    }
    return map;
  },
});

export const myRoomNumber = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return null;
    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", session.playerSlug))
      .unique();
    return player?.roomNumber ?? null;
  },
});

const MAX_CATCHPHRASE_LENGTH = 60;

function normalizeCatchphrase(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) {
    throw new Error("Catchphrase cannot be empty");
  }
  if (trimmed.length > MAX_CATCHPHRASE_LENGTH) {
    throw new Error(`Catchphrase must be ${MAX_CATCHPHRASE_LENGTH} characters or fewer`);
  }
  return trimmed;
}

export const setMyCatchphrase = mutation({
  args: { token: v.string(), catchphrase: v.string() },
  handler: async (ctx, { token, catchphrase }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) throw new Error("not logged in");

    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", session.playerSlug))
      .unique();
    if (!player) throw new Error("unknown player");

    const clean = normalizeCatchphrase(catchphrase);
    await ctx.db.patch(player._id, { catchphrase: clean });
    return { catchphrase: clean };
  },
});

export const clearMyCatchphrase = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) throw new Error("not logged in");

    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", session.playerSlug))
      .unique();
    if (!player) throw new Error("unknown player");

    await ctx.db.patch(player._id, { catchphrase: undefined });
  },
});

export const catchphraseMap = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    const map: Record<string, string> = {};
    for (const p of players) {
      if (p.catchphrase && p.catchphrase.length > 0) {
        map[p.slug] = p.catchphrase;
      }
    }
    return map;
  },
});

export const myCatchphrase = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return null;

    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", session.playerSlug))
      .unique();
    return player?.catchphrase ?? null;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!player) return null;
    const { passcodeHash, ...safe } = player;
    return safe;
  },
});

export const getPlayerDay = query({
  args: {
    slug: v.string(),
    dailyKey: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, { slug, dailyKey, token }) => {
    const entriesQuery = dailyKey
      ? ctx.db
          .query("entries")
          .withIndex("by_subject_and_daily_key", (q) =>
            q.eq("subjectSlug", slug).eq("dailyKey", dailyKey),
          )
      : ctx.db
          .query("entries")
          .withIndex("by_subject", (q) => q.eq("subjectSlug", slug));

    const entries = await entriesQuery.collect();
    entries.sort((a, b) => a.createdAt - b.createdAt);

    let mySlug: string | null = null;
    if (token) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      mySlug = session?.playerSlug ?? null;
    }

    const challenges = await ctx.db.query("challenges").collect();
    const challengeMap = new Map(challenges.map((c) => [c.challengeId, c]));

    const items = await Promise.all(
      entries.map(async (e) => {
        let label = "";
        let labelIcon = "";
        let photoUrl: string | null = null;
        if (e.type === "challenge" && e.challengeId) {
          const c = challengeMap.get(e.challengeId);
          label = c?.title ?? e.challengeId;
          labelIcon = c?.icon ?? "";
        } else if (e.type === "scavenger" && e.scavengerItemId) {
          const item = scavengerItemById(e.scavengerItemId);
          label = item?.name ?? e.scavengerItemId;
          labelIcon = item?.icon ?? "";
          if (e.photoStorageId) {
            photoUrl = await ctx.storage.getUrl(e.photoStorageId);
          }
        } else if (e.type === "negative" && e.negativeId) {
          const def = NEGATIVE_POINTS_CONST.find((n) => n.negativeId === e.negativeId);
          label = def?.action ?? e.negativeId;
          labelIcon = def?.icon ?? "";
        }
        let myReaction: "vouch" | "dispute" | null = null;
        if (mySlug) {
          const reaction = await ctx.db
            .query("entryReactions")
            .withIndex("by_entry_and_player", (q) => q.eq("entryId", e._id).eq("playerSlug", mySlug!))
            .unique();
          myReaction = reaction?.reaction ?? null;
        }
        return {
          entryId: e._id,
          type: e.type,
          subjectSlug: e.subjectSlug,
          appliedBySlug: e.appliedBySlug ?? null,
          label,
          labelIcon,
          photoUrl,
          points: e.points,
          status: e.status,
          createdAt: e.createdAt,
          myReaction,
        };
      }),
    );

    const claims = items.filter((i) => i.type !== "negative");
    const fouls = items.filter((i) => i.type === "negative");

    // Vouches received — only count vouches on entries that still count.
    const activeEntryIds = entries
      .filter((e) => e.status !== "disputed" && e.status !== "pendingReview")
      .map((e) => e._id);

    const vouchedBy: Record<string, number> = {};
    for (const entryId of activeEntryIds) {
      const reactions = await ctx.db
        .query("entryReactions")
        .withIndex("by_entry", (q) => q.eq("entryId", entryId))
        .collect();
      for (const r of reactions) {
        if (r.reaction === "vouch") {
          vouchedBy[r.playerSlug] = (vouchedBy[r.playerSlug] ?? 0) + 1;
        }
      }
    }

    return { claims, fouls, vouchedBy };
  },
});
