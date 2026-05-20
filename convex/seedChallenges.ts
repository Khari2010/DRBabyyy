import { internalMutation } from "./_generated/server";
import { SEED_CHALLENGES } from "./_seedData/challenges";
import { deriveDifficulty } from "./helpers";

// Run retireChallengeIds / repriceChallenges only while gameState.gamesLive === false.
// Live entries against retired or repriced rows would have already-locked daily totals.

export const RETIRE_CHALLENGE_IDS = [
  "gianni-bike",
  "shower-with",
  "scavenger-hunt",
  "ocean-sunrise",
  "ocean-midnight",
  "swim-up-bar",
  "pinacolada-coconut",
  "tostones",
  "hair-braids",
  "crew-swim-up",
  "matching-dinner",
  "horseback-beach",
] as const;

export const seedChallenges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const c of SEED_CHALLENGES) {
      const existing = await ctx.db
        .query("challenges")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", c.challengeId))
        .unique();
      if (!existing) {
        await ctx.db.insert("challenges", {
          challengeId: c.challengeId,
          title: c.title,
          icon: c.icon,
          points: c.points,
          bonus: c.bonus,
          category: c.category,
          difficulty: deriveDifficulty(c.points),
          status: "active",
          approvedAt: now,
        });
      }
    }
  },
});

export const seedAdmins = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const slug of ["khari", "kai"]) {
      const existing = await ctx.db
        .query("adminRoles")
        .withIndex("by_slug", (q) => q.eq("playerSlug", slug))
        .unique();
      if (!existing) {
        await ctx.db.insert("adminRoles", { playerSlug: slug });
      }
    }
  },
});

export const seedGameState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("gameState").first();
    if (!existing) {
      await ctx.db.insert("gameState", {
        gamesLive: false,
        currentDayNumber: 0,
        currentDailyKey: "pre-trip",
        updatedAt: Date.now(),
      });
    }
  },
});

export const retireChallengeIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const id of RETIRE_CHALLENGE_IDS) {
      const existing = await ctx.db
        .query("challenges")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", id))
        .unique();
      if (existing && existing.status === "active") {
        await ctx.db.patch(existing._id, { status: "retired" });
      }
    }
  },
});

export const repriceChallenges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("challenges")
      .withIndex("by_challenge_id", (q) => q.eq("challengeId", "spanish-convo"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        points: 30,
        difficulty: deriveDifficulty(30),
      });
    }
  },
});
