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
