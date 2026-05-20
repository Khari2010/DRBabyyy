import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedCrew(t: ReturnType<typeof convexTest>, currentDay = 1) {
  await t.run(async (ctx) => {
    for (const slug of ["khari", "kai", "camara"]) {
      await ctx.db.insert("players", { slug, passcodeHash: null });
      await ctx.db.insert("sessions", {
        playerSlug: slug,
        token: `tok-${slug}`,
        createdAt: Date.now(),
      });
    }
    await ctx.db.insert("adminRoles", { playerSlug: "khari" });
    await ctx.db.insert("gameState", {
      gamesLive: true,
      currentDayNumber: currentDay,
      currentDailyKey: `day-${currentDay}`,
      updatedAt: Date.now(),
    });
    // Day is locked: insert a rollover row with loserSlug set.
    await ctx.db.insert("rollovers", {
      dayNumber: currentDay,
      dailyKey: `day-${currentDay}`,
      triggeredBySlug: "khari",
      triggeredAt: Date.now(),
      loserSlug: "camara",
    });
  });
}

describe("flowVotes.castFlowVote", () => {
  it("inserts a vote for a valid votee while the day is locked", async () => {
    const t = convexTest(schema);
    await seedCrew(t);

    await t.mutation(api.flowVotes.castFlowVote, {
      token: "tok-kai",
      voteeSlug: "khari",
    });

    const votes = await t.run((ctx) =>
      ctx.db.query("flowVotes").collect(),
    );
    expect(votes.length).toBe(1);
    expect(votes[0].voterSlug).toBe("kai");
    expect(votes[0].voteeSlug).toBe("khari");
    expect(votes[0].dailyKey).toBe("day-1");
  });

  it("upserts: a second vote from the same player replaces the first", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "camara" });
    const votes = await t.run((ctx) => ctx.db.query("flowVotes").collect());
    expect(votes.length).toBe(1);
    expect(votes[0].voteeSlug).toBe("camara");
  });

  it("allows self-vote", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "kai" });
    const votes = await t.run((ctx) => ctx.db.query("flowVotes").collect());
    expect(votes[0].voteeSlug).toBe("kai");
  });

  it("refuses when day is not locked", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      for (const slug of ["khari", "kai"]) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
        await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
      }
      await ctx.db.insert("gameState", {
        gamesLive: true, currentDayNumber: 1, currentDailyKey: "day-1", updatedAt: Date.now(),
      });
      // rollover row WITHOUT loserSlug — day still open
      await ctx.db.insert("rollovers", {
        dayNumber: 1, dailyKey: "day-1", triggeredBySlug: "khari", triggeredAt: Date.now(),
      });
    });
    await expect(t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" }))
      .rejects.toThrow(/day not locked/);
  });

  it("refuses when day is already resolved", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.run(async (ctx) => {
      const row = await ctx.db.query("rollovers").first();
      await ctx.db.patch(row!._id, { flowWinnerSlug: "khari", flowResolvedAt: Date.now() });
    });
    await expect(t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" }))
      .rejects.toThrow(/day already resolved/);
  });

  it("refuses when votee is not a known player", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await expect(t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "ghost" }))
      .rejects.toThrow(/unknown votee/);
  });

  it("refuses with invalid session", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await expect(t.mutation(api.flowVotes.castFlowVote, { token: "bogus", voteeSlug: "khari" }))
      .rejects.toThrow(/invalid session/);
  });

  it("clearFlowVote removes the caller's vote", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    await t.mutation(api.flowVotes.clearFlowVote, { token: "tok-kai" });
    const votes = await t.run((ctx) => ctx.db.query("flowVotes").collect());
    expect(votes.length).toBe(0);
  });

  it("auto-resolves with a single max when every player has voted", async () => {
    const t = convexTest(schema);
    await seedCrew(t); // 3 players: khari, kai, camara
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-khari", voteeSlug: "kai" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-camara", voteeSlug: "kai" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    // After the third vote, kai has 2, khari has 1 → kai wins.
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowWinnerSlug).toBe("kai");
    expect(row?.flowResolvedAt).toBeDefined();
    // +10 entries row exists
    const entries = await t.run((ctx) => ctx.db.query("entries").collect());
    const award = entries.find((e) => e.type === "flowWin");
    expect(award).toBeDefined();
    expect(award?.subjectSlug).toBe("kai");
    expect(award?.points).toBe(10);
    expect(award?.dailyKey).toBe("day-1");
  });

  it("records flowTieCandidates instead of a winner when votes tie", async () => {
    const t = convexTest(schema);
    await seedCrew(t); // khari, kai, camara
    // 1 vote for khari, 1 for kai, 1 for camara → all tied at 1.
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-khari", voteeSlug: "kai" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "camara" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-camara", voteeSlug: "khari" });
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowWinnerSlug).toBeUndefined();
    expect(row?.flowTieCandidates?.sort()).toEqual(["camara", "kai", "khari"]);
    const award = await t.run((ctx) =>
      ctx.db.query("entries").filter((q) => q.eq(q.field("type"), "flowWin")).first(),
    );
    expect(award).toBeNull();
  });

  it("two-way tie records exactly the two candidates", async () => {
    const t = convexTest(schema);
    await seedCrew(t);
    // Add a 4th crew member.
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "didi", passcodeHash: null });
      await ctx.db.insert("sessions", { playerSlug: "didi", token: "tok-didi", createdAt: Date.now() });
    });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-khari", voteeSlug: "kai" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-kai", voteeSlug: "khari" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-camara", voteeSlug: "khari" });
    await t.mutation(api.flowVotes.castFlowVote, { token: "tok-didi", voteeSlug: "kai" });
    // khari: 2, kai: 2 → two-way tie.
    const row = await t.run((ctx) => ctx.db.query("rollovers").first());
    expect(row?.flowTieCandidates?.sort()).toEqual(["kai", "khari"]);
    expect(row?.flowWinnerSlug).toBeUndefined();
  });
});
