import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";
import { RETIRE_CHALLENGE_IDS } from "./seedChallenges";

describe("seedChallenges.retireChallengeIds", () => {
  it("retires every id in the retirement list and leaves others active", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      for (const id of RETIRE_CHALLENGE_IDS) {
        await ctx.db.insert("challenges", {
          challengeId: id,
          title: id,
          icon: "❓",
          points: 10,
          category: "social",
          difficulty: "easy",
          status: "active",
        });
      }
      await ctx.db.insert("challenges", {
        challengeId: "control-keep-me",
        title: "Keep Me",
        icon: "✅",
        points: 10,
        category: "social",
        difficulty: "easy",
        status: "active",
      });
    });

    await t.mutation(internal.seedChallenges.retireChallengeIds, {});

    const rows = await t.run((ctx) => ctx.db.query("challenges").collect());
    for (const id of RETIRE_CHALLENGE_IDS) {
      const r = rows.find((x) => x.challengeId === id);
      expect(r?.status, `expected ${id} retired`).toBe("retired");
    }
    const control = rows.find((x) => x.challengeId === "control-keep-me");
    expect(control?.status).toBe("active");
  });

  it("is idempotent — running twice keeps things retired without errors", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "shower-with",
        title: "Shower",
        icon: "🚿",
        points: 100,
        category: "wild",
        difficulty: "wild",
        status: "active",
      });
    });
    await t.mutation(internal.seedChallenges.retireChallengeIds, {});
    await t.mutation(internal.seedChallenges.retireChallengeIds, {});
    const row = await t.run((ctx) =>
      ctx.db
        .query("challenges")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", "shower-with"))
        .unique()
    );
    expect(row?.status).toBe("retired");
  });
});

describe("seedChallenges.repriceChallenges", () => {
  it("sets spanish-convo to 30 and rederives difficulty", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "spanish-convo",
        title: "spanish-convo",
        icon: "❓",
        points: 50,
        category: "local",
        difficulty: "medium",
        status: "active",
      });
    });

    await t.mutation(internal.seedChallenges.repriceChallenges, {});

    const row = await t.run((ctx) =>
      ctx.db
        .query("challenges")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", "spanish-convo"))
        .unique()
    );
    expect(row?.points).toBe(30);
    expect(row?.difficulty).toBe("medium");
  });

  it("is a no-op when the target id is absent", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(internal.seedChallenges.repriceChallenges, {}),
    ).resolves.not.toThrow();
  });
});

import { SEED_CHALLENGES } from "./_seedData/challenges";

describe("SEED_CHALLENGES (data sanity)", () => {
  it("contains exactly 52 entries", () => {
    expect(SEED_CHALLENGES.length).toBe(52);
  });

  it("does not contain any retired challengeIds", () => {
    const retiredIds = new Set([
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
    ]);
    const seedIds = new Set(SEED_CHALLENGES.map((c) => c.challengeId));
    for (const id of retiredIds) {
      expect(seedIds.has(id), `seed should not include ${id}`).toBe(false);
    }
  });

  it("contains all 8 new challenges with the correct points", () => {
    const expected: Record<string, number> = {
      "fake-proposal": 150,
      "sanatana-shot": 25,
      "julio-tiktok": 35,
      "grumpy-couple-smile": 60,
      "tabo-bar-shot": 60,
      "sports-bar-pool": 15,
      "gym-first": 10,
      "close-sports-bar": 50,
    };
    for (const [id, points] of Object.entries(expected)) {
      const row = SEED_CHALLENGES.find((c) => c.challengeId === id);
      expect(row, `missing ${id}`).toBeDefined();
      expect(row?.points, `wrong points for ${id}`).toBe(points);
    }
  });

  it("has spanish-convo at 30 points (repriced from 50)", () => {
    const row = SEED_CHALLENGES.find((c) => c.challengeId === "spanish-convo");
    expect(row?.points).toBe(30);
  });

  it("has unique challengeIds", () => {
    const ids = SEED_CHALLENGES.map((c) => c.challengeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
