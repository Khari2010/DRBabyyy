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
});
