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
