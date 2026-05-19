// convex/activitySuggestions.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

const APPROVE_THRESHOLD = 5;
const REJECT_THRESHOLD = 5;

export const create = mutation({
  args: { token: v.string(), title: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, { token, title, notes }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const cleaned = title.trim();
    if (cleaned.length === 0) throw new Error("title required");
    await ctx.db.insert("activitySuggestions", {
      proposerSlug: playerSlug,
      title: cleaned,
      notes: notes?.trim().slice(0, 500) || undefined,
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
    suggestionId: v.id("activitySuggestions"),
    category: v.string(),
    cost: v.optional(v.string()),
  },
  handler: async (ctx, { token, suggestionId, category, cost }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status !== "proposed") throw new Error(`cannot draft in status ${s.status}`);
    await ctx.db.patch(suggestionId, {
      status: "voting",
      category,
      cost,
      draftedAt: Date.now(),
    });
  },
});

export const vote = mutation({
  args: {
    token: v.string(),
    suggestionId: v.id("activitySuggestions"),
    vote: v.union(v.literal("yes"), v.literal("no")),
  },
  handler: async (ctx, { token, suggestionId, vote }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status !== "voting") throw new Error(`cannot vote on suggestion in status ${s.status}`);
    if (s.proposerSlug === playerSlug) throw new Error("cannot vote on own suggestion");

    const existing = await ctx.db
      .query("activitySuggestionVotes")
      .withIndex("by_suggestion_and_voter", (q) =>
        q.eq("suggestionId", suggestionId).eq("voterSlug", playerSlug))
      .unique();
    if (existing) throw new Error("already voted");

    await ctx.db.insert("activitySuggestionVotes", {
      suggestionId, voterSlug: playerSlug, vote, at: Date.now(),
    });

    const newYes = vote === "yes" ? s.yesCount + 1 : s.yesCount;
    const newNo = vote === "no" ? s.noCount + 1 : s.noCount;
    const patch: Record<string, unknown> = { yesCount: newYes, noCount: newNo };

    if (newYes >= APPROVE_THRESHOLD) {
      patch.status = "approved";
      patch.resolvedAt = Date.now();
    } else if (newNo >= REJECT_THRESHOLD) {
      patch.status = "rejected";
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(suggestionId, patch);
  },
});

export const reject = mutation({
  args: { token: v.string(), suggestionId: v.id("activitySuggestions") },
  handler: async (ctx, { token, suggestionId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status === "approved" || s.status === "rejected") throw new Error("already resolved");
    await ctx.db.patch(suggestionId, { status: "rejected", resolvedAt: Date.now() });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("activitySuggestions").collect(),
});

export const myVote = query({
  args: { token: v.string(), suggestionId: v.id("activitySuggestions") },
  handler: async (ctx, { token, suggestionId }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return null;
    const v = await ctx.db
      .query("activitySuggestionVotes")
      .withIndex("by_suggestion_and_voter", (q) =>
        q.eq("suggestionId", suggestionId).eq("voterSlug", session.playerSlug))
      .unique();
    return v?.vote ?? null;
  },
});
