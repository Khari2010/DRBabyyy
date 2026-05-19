import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
