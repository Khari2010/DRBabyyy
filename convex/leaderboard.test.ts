import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedEntries(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    const now = Date.now();
    // Khari: 100 active + 20 verified = 120 (verifiedCount = 1)
    await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 100, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: now });
    await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "y", points: 20, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: now + 1 });
    // Kai: 200 active, 30 disputed (excluded) = 200
    await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 200, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: now });
    await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "y", points: 30, status: "disputed", vouchCount: 0, disputeCount: 2, dailyKey: "day-1", createdAt: now });
    // Camara: -50 negative (verified)
    await ctx.db.insert("entries", { type: "negative", subjectSlug: "camara", negativeId: "throw-up", appliedBySlug: "kai", points: -50, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: now });
    // Day 2 entry shouldn't appear in day-1 board
    await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 500, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-2", createdAt: now });
  });
}

describe("leaderboard.getDaily", () => {
  it("sums entries by subject, excludes disputed, orders desc", async () => {
    const t = convexTest(schema);
    await seedEntries(t);
    const board = await t.query(api.leaderboard.getDaily, { dailyKey: "day-1" });
    expect(board.map((r) => r.slug)).toEqual(["kai", "khari", "camara"]);
    expect(board.find((r) => r.slug === "kai")?.total).toBe(200);
    expect(board.find((r) => r.slug === "khari")?.total).toBe(120);
    expect(board.find((r) => r.slug === "camara")?.total).toBe(-50);
    expect(board.find((r) => r.slug === "khari")?.verifiedCount).toBe(1);
  });

  it("uses verifiedCount as tiebreaker when totals match", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "a", points: 50, status: "verified", vouchCount: 1, disputeCount: 0, dailyKey: "day-1", createdAt: now });
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "a", points: 50, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: now });
    });
    const board = await t.query(api.leaderboard.getDaily, { dailyKey: "day-1" });
    expect(board[0].slug).toBe("kai");
  });
});

describe("leaderboard.getHoliday", () => {
  it("aggregates across all dailyKeys, excludes disputed", async () => {
    const t = convexTest(schema);
    await seedEntries(t);
    const board = await t.query(api.leaderboard.getHoliday, {});
    expect(board.find((r) => r.slug === "khari")?.total).toBe(620); // 120 + 500
  });
});

describe("leaderboard.getRecentActivity", () => {
  it("returns most recent entries first up to limit", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      const base = Date.now();
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("entries", { type: "challenge", subjectSlug: "kai", challengeId: "x", points: 1, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: base + i });
      }
    });
    const recent = await t.query(api.leaderboard.getRecentActivity, { limit: 3 });
    expect(recent.length).toBe(3);
    expect(recent[0].createdAt).toBeGreaterThan(recent[2].createdAt);
  });
});

describe("leaderboard.getRecentActivity with token", () => {
  it("annotates entries with myReaction", async () => {
    const t = convexTest(schema);
    let entryId: any;
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "kai", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "kai", token: "tok-kai", createdAt: Date.now() });
      entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("entryReactions", { entryId, playerSlug: "kai", reaction: "vouch", at: Date.now() });
    });
    const rows = await t.query(api.leaderboard.getRecentActivity, { limit: 10, token: "tok-kai" });
    expect(rows[0].myReaction).toBe("vouch");
  });

  it("returns null myReaction when no token provided", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
    });
    const rows = await t.query(api.leaderboard.getRecentActivity, { limit: 10 });
    expect(rows[0].myReaction).toBeNull();
  });
});

describe("leaderboard.getRecentActivity joined labels", () => {
  it("attaches title + icon to challenge entries", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "mamajuana",
        title: "Mamajuana Shot",
        icon: "🍶",
        points: 10,
        category: "drinks",
        difficulty: "easy",
        status: "active",
      });
      await ctx.db.insert("entries", {
        type: "challenge",
        subjectSlug: "khari",
        challengeId: "mamajuana",
        points: 10,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now(),
      });
    });
    const rows = await t.query(api.leaderboard.getRecentActivity, { limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("Mamajuana Shot");
    expect(rows[0].labelIcon).toBe("🍶");
  });

  it("attaches action + icon to negative entries", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", {
        type: "negative",
        subjectSlug: "khari",
        appliedBySlug: "kai",
        negativeId: "bed-pre-11",
        points: -40,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now(),
      });
    });
    const rows = await t.query(api.leaderboard.getRecentActivity, { limit: 10 });
    expect(rows[0].label).toBe("Going to bed before 11pm");
    expect(rows[0].labelIcon).toBe("😴");
  });

  it("falls back to id when challenge/negative is missing", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", {
        type: "challenge",
        subjectSlug: "khari",
        challengeId: "deleted-challenge",
        points: 10,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now(),
      });
    });
    const rows = await t.query(api.leaderboard.getRecentActivity, { limit: 10 });
    expect(rows[0].label).toBe("deleted-challenge");
    expect(rows[0].labelIcon).toBe("");
  });
});

describe("leaderboard scoring — flowWin", () => {
  it("includes flowWin rows in subject totals", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "khari", challengeId: "x",
        points: 5, status: "verified", vouchCount: 1, disputeCount: 0,
        dailyKey: "day-1", createdAt: Date.now(),
      });
      await ctx.db.insert("entries", {
        type: "flowWin", subjectSlug: "khari",
        points: 10, status: "verified", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: Date.now(),
      });
    });
    const rows = await t.query(api.leaderboard.getDaily, { dailyKey: "day-1" });
    const khari = rows.find((r) => r.slug === "khari");
    expect(khari?.total).toBe(15);
  });
});
