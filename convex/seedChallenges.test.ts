// convex/seedChallenges.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

const RETIRE_IDS = [
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
];

describe("seedChallenges.retireChallengeIds", () => {
  it("retires every id in the retirement list and leaves others active", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      // Insert each id-to-retire as an active challenge.
      for (const id of RETIRE_IDS) {
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
      // Insert a control row that must NOT be retired.
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
    for (const id of RETIRE_IDS) {
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
