import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, getGameState } from "./helpers";

export const castFlowVote = mutation({
  args: { token: v.string(), voteeSlug: v.string() },
  handler: async (ctx, { token, voteeSlug }) => {
    const { playerSlug } = await requireSession(ctx, token);

    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");
    const dailyKey = state.currentDailyKey;

    const rollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", state.currentDayNumber))
      .first();
    if (!rollover) throw new Error("no rollover for current day");
    if (!rollover.loserSlug) throw new Error("day not locked");
    if (rollover.flowWinnerSlug) throw new Error("day already resolved");

    const votee = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", voteeSlug))
      .unique();
    if (!votee) throw new Error("unknown votee");

    const existing = await ctx.db
      .query("flowVotes")
      .withIndex("by_daily_and_voter", (q) =>
        q.eq("dailyKey", dailyKey).eq("voterSlug", playerSlug),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { voteeSlug, at: Date.now() });
    } else {
      await ctx.db.insert("flowVotes", {
        dailyKey,
        voterSlug: playerSlug,
        voteeSlug,
        at: Date.now(),
      });
    }
  },
});
