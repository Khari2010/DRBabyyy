import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

describe("admin.resetPasscode", () => {
  it("clears the passcode hash and deletes existing sessions", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "kai", passcodeHash: "some-hash" });
      await ctx.db.insert("sessions", {
        playerSlug: "kai",
        token: "t1",
        createdAt: Date.now(),
      });
      await ctx.db.insert("sessions", {
        playerSlug: "kai",
        token: "t2",
        createdAt: Date.now(),
      });
      await ctx.db.insert("sessions", {
        playerSlug: "khari",
        token: "other",
        createdAt: Date.now(),
      });
    });

    await t.mutation(internal.admin.resetPasscode, { slug: "kai" });

    await t.run(async (ctx) => {
      const player = await ctx.db
        .query("players")
        .withIndex("by_slug", (q) => q.eq("slug", "kai"))
        .unique();
      expect(player?.passcodeHash).toBeNull();

      const kaiSessions = await ctx.db.query("sessions").collect();
      expect(kaiSessions).toHaveLength(1);
      expect(kaiSessions[0].playerSlug).toBe("khari");
    });
  });

  it("throws for unknown slug", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(internal.admin.resetPasscode, { slug: "nobody" }),
    ).rejects.toThrow(/unknown player/i);
  });
});

describe("admin.isAdmin", () => {
  it("returns true for admin slugs", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-k", createdAt: Date.now() });
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
    });
    expect(await t.query(api.admin.isAdmin, { token: "tok-k" })).toBe(true);
  });

  it("returns false for non-admin", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "camara", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "camara", token: "tok-c", createdAt: Date.now() });
    });
    expect(await t.query(api.admin.isAdmin, { token: "tok-c" })).toBe(false);
  });

  it("returns false for invalid token", async () => {
    const t = convexTest(schema);
    expect(await t.query(api.admin.isAdmin, { token: "bogus" })).toBe(false);
  });
});

describe("admin.resetGame", () => {
  it("wipes volatile data and resets gameState; preserves seeded challenges and players", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-khari", createdAt: Date.now() });
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      // Seeded challenge (no createdBySlug)
      await ctx.db.insert("challenges", { challengeId: "seeded", title: "S", icon: "🎯", points: 10, category: "social", difficulty: "easy", status: "active" });
      // User-created challenge (with createdBySlug)
      await ctx.db.insert("challenges", { challengeId: "promoted", title: "P", icon: "✨", points: 25, category: "wild", difficulty: "medium", status: "active", createdBySlug: "kai" });
      // Volatile data
      await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: Date.now() });
      await ctx.db.insert("suggestions", { proposerSlug: "khari", title: "X", status: "proposed", yesCount: 0, noCount: 0, createdAt: Date.now() });
      await ctx.db.insert("gameState", { gamesLive: true, currentDayNumber: 3, currentDailyKey: "day-3", updatedAt: Date.now() });
    });

    await t.mutation(api.admin.resetGame, { token: "tok-khari" });

    const entries = await t.run((ctx) => ctx.db.query("entries").collect());
    const suggestions = await t.run((ctx) => ctx.db.query("suggestions").collect());
    const challenges = await t.run((ctx) => ctx.db.query("challenges").collect());
    const players = await t.run((ctx) => ctx.db.query("players").collect());
    const state = await t.run((ctx) => ctx.db.query("gameState").first());

    expect(entries.length).toBe(0);
    expect(suggestions.length).toBe(0);
    expect(challenges.length).toBe(1);
    expect(challenges[0].challengeId).toBe("seeded");
    expect(players.length).toBe(1);
    expect(state?.gamesLive).toBe(false);
    expect(state?.currentDayNumber).toBe(0);
    expect(state?.currentDailyKey).toBe("pre-trip");
  });

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "camara", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "camara", token: "tok-camara", createdAt: Date.now() });
    });
    await expect(t.mutation(api.admin.resetGame, { token: "tok-camara" }))
      .rejects.toThrow(/admin only/);
  });
});

describe("admin.adminBreakFlowTie", () => {
  async function seedWithTie(t: ReturnType<typeof convexTest>) {
    await t.run(async (ctx) => {
      for (const slug of ["khari", "kai", "camara"]) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
        await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
      }
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1", triggeredBySlug: "khari", triggeredAt: Date.now(),
        loserSlug: "camara",
        flowTieCandidates: ["khari", "kai"],
      });
    });
  }

  it("admin picks a winner from the tied set", async () => {
    const t = convexTest(schema);
    await seedWithTie(t);
    await t.mutation(api.admin.adminBreakFlowTie, { token: "tok-khari", voteeSlug: "kai" });
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowWinnerSlug).toBe("kai");
    expect(row?.flowTieCandidates).toBeUndefined();
    const award = await t.run((ctx) =>
      ctx.db.query("entries").filter((q) => q.eq(q.field("type"), "flowWin")).first(),
    );
    expect(award?.subjectSlug).toBe("kai");
    expect(award?.points).toBe(10);
  });

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await seedWithTie(t);
    await expect(t.mutation(api.admin.adminBreakFlowTie, { token: "tok-kai", voteeSlug: "khari" }))
      .rejects.toThrow(/admin only/);
  });

  it("rejects voteeSlug not in candidates", async () => {
    const t = convexTest(schema);
    await seedWithTie(t);
    await expect(t.mutation(api.admin.adminBreakFlowTie, { token: "tok-khari", voteeSlug: "camara" }))
      .rejects.toThrow(/not a tied candidate/);
  });
});

describe("admin.adminForceCloseFlowVote", () => {
  async function seedLockedDay(t: ReturnType<typeof convexTest>) {
    await t.run(async (ctx) => {
      for (const slug of ["khari", "kai", "camara"]) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
        await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
      }
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: Date.now(),
      });
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1", triggeredBySlug: "khari", triggeredAt: Date.now(),
        loserSlug: "camara",
      });
    });
  }

  it("force-close with one vote: that vote wins outright", async () => {
    const t = convexTest(schema);
    await seedLockedDay(t);
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    await t.mutation(api.admin.adminForceCloseFlowVote, { token: "tok-khari" });
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowWinnerSlug).toBe("khari");
    expect(row?.flowForcedClose).toBe(true);
  });

  it("force-close with zero votes: candidates = all crew", async () => {
    const t = convexTest(schema);
    await seedLockedDay(t);
    await t.mutation(api.admin.adminForceCloseFlowVote, { token: "tok-khari" });
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowWinnerSlug).toBeUndefined();
    expect(row?.flowTieCandidates?.sort()).toEqual(["camara", "kai", "khari"]);
    expect(row?.flowForcedClose).toBe(true);
  });

  it("rejects non-admin", async () => {
    const t = convexTest(schema);
    await seedLockedDay(t);
    await expect(t.mutation(api.admin.adminForceCloseFlowVote, { token: "tok-kai" }))
      .rejects.toThrow(/admin only/);
  });
});
