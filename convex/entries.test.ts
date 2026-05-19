import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedSession(t: ReturnType<typeof convexTest>, slug: string, token: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token, createdAt: Date.now() });
  });
}

async function seedGameLive(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("gameState", {
      gamesLive: true,
      currentDayNumber: 1,
      currentDailyKey: "day-1",
      updatedAt: Date.now(),
    });
    await ctx.db.insert("challenges", {
      challengeId: "kiss-someone",
      title: "Kiss Someone",
      icon: "💋",
      points: 100,
      category: "social",
      difficulty: "wild",
      status: "active",
    });
  });
}

describe("entries.claim", () => {
  it("inserts an entry row when games are live", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);

    await t.mutation(api.entries.claim, {
      token: "tok-kai",
      challengeId: "kiss-someone",
      bonusKey: undefined,
    });

    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].subjectSlug).toBe("kai");
    expect(rows[0].points).toBe(100);
    expect(rows[0].status).toBe("active");
    expect(rows[0].dailyKey).toBe("day-1");
  });

  it("rejects when games are not live", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: false,
        currentDayNumber: 0,
        currentDailyKey: "pre-trip",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("challenges", {
        challengeId: "kiss-someone",
        title: "Kiss Someone",
        icon: "💋",
        points: 100,
        category: "social",
        difficulty: "wild",
        status: "active",
      });
    });

    await expect(
      t.mutation(api.entries.claim, {
        token: "tok-kai",
        challengeId: "kiss-someone",
        bonusKey: undefined,
      }),
    ).rejects.toThrow(/games not live/);
  });

  it("rejects with invalid session", async () => {
    const t = convexTest(schema);
    await seedGameLive(t);
    await expect(
      t.mutation(api.entries.claim, {
        token: "bogus",
        challengeId: "kiss-someone",
        bonusKey: undefined,
      }),
    ).rejects.toThrow(/invalid session/);
  });

  it("rejects unknown challenge", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    await expect(
      t.mutation(api.entries.claim, {
        token: "tok-kai",
        challengeId: "made-up",
        bonusKey: undefined,
      }),
    ).rejects.toThrow(/unknown challenge/);
  });
});
