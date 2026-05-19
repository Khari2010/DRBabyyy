import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin, deriveDifficulty } from "./helpers";

export const APPROVE_THRESHOLD = 5;
export const REJECT_THRESHOLD = 5;

export const create = mutation({
  args: { token: v.string(), title: v.string(), icon: v.optional(v.string()) },
  handler: async (ctx, { token, title, icon }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const cleaned = title.trim();
    if (cleaned.length === 0) throw new Error("title required");
    await ctx.db.insert("suggestions", {
      proposerSlug: playerSlug,
      title: cleaned,
      icon,
      status: "proposed",
      yesCount: 0,
      noCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const draft = mutation({
  args: {
    token: v.string(),
    suggestionId: v.id("suggestions"),
    points: v.number(),
    category: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { token, suggestionId, points, category, icon }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status !== "proposed") throw new Error(`cannot draft suggestion in status ${s.status}`);
    await ctx.db.patch(suggestionId, {
      status: "voting",
      points,
      category,
      difficulty: deriveDifficulty(points),
      icon: icon ?? s.icon,
      draftedAt: Date.now(),
    });
  },
});

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export const vote = mutation({
  args: {
    token: v.string(),
    suggestionId: v.id("suggestions"),
    vote: v.union(v.literal("yes"), v.literal("no")),
  },
  handler: async (ctx, { token, suggestionId, vote }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status !== "voting") throw new Error(`cannot vote on suggestion in status ${s.status}`);
    if (s.proposerSlug === playerSlug) throw new Error("cannot vote on own suggestion");

    const existing = await ctx.db
      .query("suggestionVotes")
      .withIndex("by_suggestion_and_voter", (q) => q.eq("suggestionId", suggestionId).eq("voterSlug", playerSlug))
      .unique();
    if (existing) throw new Error("already voted");

    await ctx.db.insert("suggestionVotes", {
      suggestionId, voterSlug: playerSlug, vote, at: Date.now(),
    });

    const newYes = vote === "yes" ? s.yesCount + 1 : s.yesCount;
    const newNo = vote === "no" ? s.noCount + 1 : s.noCount;

    const patch: Record<string, any> = { yesCount: newYes, noCount: newNo };

    if (newYes >= APPROVE_THRESHOLD) {
      let challengeId = slugify(s.title);
      let suffix = 1;
      while (true) {
        const conflict = await ctx.db
          .query("challenges")
          .withIndex("by_challenge_id", (q) => q.eq("challengeId", challengeId))
          .unique();
        if (!conflict) break;
        suffix += 1;
        challengeId = `${slugify(s.title)}-${suffix}`;
      }
      await ctx.db.insert("challenges", {
        challengeId,
        title: s.title,
        icon: s.icon ?? "✨",
        points: s.points ?? 0,
        category: s.category ?? "wild",
        difficulty: (s.difficulty as "easy" | "medium" | "wild") ?? deriveDifficulty(s.points ?? 0),
        status: "active",
        createdBySlug: s.proposerSlug,
        approvedAt: Date.now(),
      });
      patch.status = "approved";
      patch.resultingChallengeId = challengeId;
      patch.resolvedAt = Date.now();
    } else if (newNo >= REJECT_THRESHOLD) {
      patch.status = "rejected";
      patch.resolvedAt = Date.now();
    }

    await ctx.db.patch(suggestionId, patch);
  },
});

export const reject = mutation({
  args: { token: v.string(), suggestionId: v.id("suggestions") },
  handler: async (ctx, { token, suggestionId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status === "approved" || s.status === "rejected") {
      throw new Error("already resolved");
    }
    await ctx.db.patch(suggestionId, { status: "rejected", resolvedAt: Date.now() });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suggestions").collect();
  },
});

export const myVote = query({
  args: { token: v.string(), suggestionId: v.id("suggestions") },
  handler: async (ctx, { token, suggestionId }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return null;
    const vote = await ctx.db
      .query("suggestionVotes")
      .withIndex("by_suggestion_and_voter", (q) => q.eq("suggestionId", suggestionId).eq("voterSlug", session.playerSlug))
      .unique();
    return vote?.vote ?? null;
  },
});
