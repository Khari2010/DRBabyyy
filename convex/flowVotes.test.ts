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
});
