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

  it("wipes every volatile game-play table", async () => {
    const t = convexTest(schema);
    const now = Date.now();
    let postId: string | undefined;
    let suggestionId: string | undefined;
    let activitySuggestionId: string | undefined;
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-khari", createdAt: now });
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("gameState", { gamesLive: true, currentDayNumber: 2, currentDailyKey: "day-2", updatedAt: now });

      // Seed one row in every volatile table so the assertion below would
      // fail if resetGame ever forgets one of them.
      const entryId = await ctx.db.insert("entries", { type: "challenge", subjectSlug: "khari", challengeId: "x", points: 10, status: "active", vouchCount: 0, disputeCount: 0, dailyKey: "day-1", createdAt: now });
      await ctx.db.insert("entryReactions", { entryId, playerSlug: "khari", reaction: "vouch", at: now });
      await ctx.db.insert("rollovers", { dayNumber: 1, dailyKey: "day-1", triggeredBySlug: "khari", triggeredAt: now });
      suggestionId = await ctx.db.insert("suggestions", { proposerSlug: "khari", title: "X", status: "proposed", yesCount: 0, noCount: 0, createdAt: now });
      await ctx.db.insert("suggestionVotes", { suggestionId: suggestionId as any, voterSlug: "khari", vote: "yes", at: now });
      activitySuggestionId = await ctx.db.insert("activitySuggestions", { proposerSlug: "khari", title: "A", status: "proposed", yesCount: 0, noCount: 0, createdAt: now });
      await ctx.db.insert("activitySuggestionVotes", { suggestionId: activitySuggestionId as any, voterSlug: "khari", vote: "yes", at: now });
      await ctx.db.insert("activityVotes", { playerSlug: "khari", activityId: "boat-trip", vote: "like", updatedAt: now });
      await ctx.db.insert("activityComments", { activityId: "boat-trip", authorSlug: "khari", text: "hi", createdAt: now });
      await ctx.db.insert("dayComments", { dayDate: "2026-05-20", authorSlug: "khari", text: "hi", createdAt: now });
      await ctx.db.insert("flowVotes", { dailyKey: "day-1", voterSlug: "khari", voteeSlug: "khari", at: now });
      await ctx.db.insert("itemRsvps", { dayDate: "2026-05-20", itemKey: "dinner", playerSlug: "khari", status: "in", updatedAt: now });
      postId = await ctx.db.insert("posts", { authorSlug: "khari", text: "hello", createdAt: now });
      await ctx.db.insert("postComments", { postId: postId as any, authorSlug: "khari", text: "yo", createdAt: now });
      await ctx.db.insert("postReactions", { postId: postId as any, playerSlug: "khari", emoji: "🔥", at: now });
    });

    await t.mutation(api.admin.resetGame, { token: "tok-khari" });

    const counts = await t.run(async (ctx) => ({
      entries: (await ctx.db.query("entries").collect()).length,
      entryReactions: (await ctx.db.query("entryReactions").collect()).length,
      rollovers: (await ctx.db.query("rollovers").collect()).length,
      suggestions: (await ctx.db.query("suggestions").collect()).length,
      suggestionVotes: (await ctx.db.query("suggestionVotes").collect()).length,
      activitySuggestions: (await ctx.db.query("activitySuggestions").collect()).length,
      activitySuggestionVotes: (await ctx.db.query("activitySuggestionVotes").collect()).length,
      activityVotes: (await ctx.db.query("activityVotes").collect()).length,
      activityComments: (await ctx.db.query("activityComments").collect()).length,
      dayComments: (await ctx.db.query("dayComments").collect()).length,
      flowVotes: (await ctx.db.query("flowVotes").collect()).length,
      itemRsvps: (await ctx.db.query("itemRsvps").collect()).length,
      posts: (await ctx.db.query("posts").collect()).length,
      postComments: (await ctx.db.query("postComments").collect()).length,
      postReactions: (await ctx.db.query("postReactions").collect()).length,
    }));

    for (const [table, n] of Object.entries(counts)) {
      expect(n, `${table} should be empty after resetGame`).toBe(0);
    }
  });

  it("preserves player profile data (answers, playerProgress, sessions)", async () => {
    const t = convexTest(schema);
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "khari", passcodeHash: "h" });
      await ctx.db.insert("sessions", { playerSlug: "khari", token: "tok-khari", createdAt: now });
      await ctx.db.insert("adminRoles", { playerSlug: "khari" });
      await ctx.db.insert("answers", { playerSlug: "khari", questionId: "q1", text: "my answer", updatedAt: now });
      await ctx.db.insert("playerProgress", { slug: "khari", visitedLeaderboard: true, visitedScavenger: true, lockscreenSeen: true, welcomeHidden: true });
      await ctx.db.insert("gameState", { gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: now });
    });

    await t.mutation(api.admin.resetGame, { token: "tok-khari" });

    const answers = await t.run((ctx) => ctx.db.query("answers").collect());
    const progress = await t.run((ctx) => ctx.db.query("playerProgress").collect());
    const sessions = await t.run((ctx) => ctx.db.query("sessions").collect());
    expect(answers).toHaveLength(1);
    expect(progress).toHaveLength(1);
    expect(sessions).toHaveLength(1);
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
