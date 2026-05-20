import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { requireSession, getGameState } from "./helpers";

async function maybeResolveFlowWinner(
  ctx: { db: any },
  rollover: Doc<"rollovers">,
) {
  const dailyKey = rollover.dailyKey;
  const players = await ctx.db.query("players").collect();
  const votes = await ctx.db
    .query("flowVotes")
    .withIndex("by_daily_key", (q: any) => q.eq("dailyKey", dailyKey))
    .collect();
  if (votes.length < players.length) return;
  await finaliseFlowResolution(ctx, rollover, votes, /* forced */ false);
}

async function finaliseFlowResolution(
  ctx: { db: any },
  rollover: Doc<"rollovers">,
  votes: Array<Doc<"flowVotes">>,
  forced: boolean,
) {
  const tally = new Map<string, number>();
  for (const v of votes) {
    tally.set(v.voteeSlug, (tally.get(v.voteeSlug) ?? 0) + 1);
  }

  let topCount = 0;
  for (const c of tally.values()) if (c > topCount) topCount = c;

  let candidates: string[];
  if (topCount === 0) {
    // Force-close with zero votes — admin picks from all crew.
    const players = await ctx.db.query("players").collect();
    candidates = players.map((p: Doc<"players">) => p.slug);
  } else {
    candidates = [...tally.entries()]
      .filter(([, n]) => n === topCount)
      .map(([slug]) => slug);
  }

  if (candidates.length === 1) {
    const winner = candidates[0];
    await ctx.db.patch(rollover._id, {
      flowWinnerSlug: winner,
      flowResolvedAt: Date.now(),
      flowTieCandidates: undefined,
      ...(forced ? { flowForcedClose: true } : {}),
    });
    await ctx.db.insert("entries", {
      type: "flowWin",
      subjectSlug: winner,
      points: 10,
      status: "verified",
      vouchCount: 0,
      disputeCount: 0,
      dailyKey: rollover.dailyKey,
      createdAt: Date.now(),
    });
  } else {
    await ctx.db.patch(rollover._id, {
      flowTieCandidates: candidates,
      ...(forced ? { flowForcedClose: true } : {}),
    });
  }
}

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
    await maybeResolveFlowWinner(ctx, rollover);
  },
});

export const clearFlowVote = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const state = await getGameState(ctx);
    if (!state) throw new Error("gameState not seeded");
    const existing = await ctx.db
      .query("flowVotes")
      .withIndex("by_daily_and_voter", (q) =>
        q.eq("dailyKey", state.currentDailyKey).eq("voterSlug", playerSlug),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
