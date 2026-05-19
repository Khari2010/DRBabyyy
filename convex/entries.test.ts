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

describe("entries.vouch", () => {
  it("increments vouchCount and flips status to verified at 1 vouch", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId });
    const after = await t.run((ctx) => ctx.db.get(entryId));
    expect(after?.status).toBe("verified");
    expect(after?.vouchCount).toBe(1);
  });

  it("rejects self-vouch", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await expect(t.mutation(api.entries.vouch, { token: "tok-kai", entryId }))
      .rejects.toThrow(/cannot react to own entry/);
  });

  it("rejects double vouch by same player", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId });
    await expect(t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId }))
      .rejects.toThrow(/already reacted/);
  });
});

describe("entries.dispute", () => {
  it("flips to disputed after 2 disputes", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    await seedSession(t, "camara", "tok-camara");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.entries.dispute, { token: "tok-kyanna", entryId });
    let after = await t.run((ctx) => ctx.db.get(entryId));
    expect(after?.status).toBe("active");
    expect(after?.disputeCount).toBe(1);

    await t.mutation(api.entries.dispute, { token: "tok-camara", entryId });
    after = await t.run((ctx) => ctx.db.get(entryId));
    expect(after?.status).toBe("disputed");
    expect(after?.disputeCount).toBe(2);
  });

  it("does not change status on a verified entry (verified is final)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "kyanna", "tok-kyanna");
    let entryId: any;
    await t.run(async (ctx) => {
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 10, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    await t.mutation(api.entries.dispute, { token: "tok-kyanna", entryId });
    const after = await t.run((ctx) => ctx.db.get(entryId));
    // verified is final; disputeCount still increments but status stays verified
    expect(after?.status).toBe("verified");
    expect(after?.disputeCount).toBe(1);
  });
});

describe("entries.logNegative", () => {
  it("inserts a negative entry with appliedBySlug", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    await t.mutation(api.entries.logNegative, {
      token: "tok-kai",
      subjectSlug: "camara",
      negativeId: "throw-up",
    });
    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe("negative");
    expect(rows[0].subjectSlug).toBe("camara");
    expect(rows[0].appliedBySlug).toBe("kai");
    expect(rows[0].points).toBe(-50);
  });

  it("rejects self-foul", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    await expect(t.mutation(api.entries.logNegative, {
      token: "tok-kai",
      subjectSlug: "kai",
      negativeId: "throw-up",
    })).rejects.toThrow(/cannot foul yourself/);
  });

  it("rejects unknown negativeId", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedGameLive(t);
    await expect(t.mutation(api.entries.logNegative, {
      token: "tok-kai",
      subjectSlug: "camara",
      negativeId: "made-up",
    })).rejects.toThrow(/unknown negative action/);
  });

  it("rejects when games not live", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("gameState", {
        gamesLive: false, currentDayNumber: 0, currentDailyKey: "pre-trip", updatedAt: Date.now(),
      });
    });
    await expect(t.mutation(api.entries.logNegative, {
      token: "tok-kai", subjectSlug: "camara", negativeId: "throw-up",
    })).rejects.toThrow(/games not live/);
  });
});
