import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

async function seedPlayer(t: ReturnType<typeof convexTest>, slug: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
  });
}

async function seedSession(t: ReturnType<typeof convexTest>, slug: string, token: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", { playerSlug: slug, token, createdAt: Date.now() });
  });
}

describe("welcome.getProgress", () => {
  it("returns nine items, all done=false, for a brand-new player", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "kai");

    const result = await t.query(api.welcome.getProgress, { slug: "kai" });

    expect(result.totalCount).toBe(9);
    expect(result.doneCount).toBe(0);
    expect(result.hidden).toBe(false);
    expect(result.items.map((i) => i.id)).toEqual([
      "holidayName",
      "catchphrase",
      "room",
      "lockscreen",
      "wallPost",
      "challengeClaim",
      "scavengerVisit",
      "adventureVote",
      "leaderboardVisit",
    ]);
    expect(result.items.every((i) => i.done === false)).toBe(true);
  });

  it("ticks holidayName when player.holidayName is set", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "kai", passcodeHash: null, holidayName: "Don Pollo" });
    });

    const result = await t.query(api.welcome.getProgress, { slug: "kai" });
    const item = result.items.find((i) => i.id === "holidayName");
    expect(item?.done).toBe(true);
    expect(result.doneCount).toBe(1);
  });

  it("ticks catchphrase when player.catchphrase is set", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "kai", passcodeHash: null, catchphrase: "let's gooo" });
    });
    const result = await t.query(api.welcome.getProgress, { slug: "kai" });
    expect(result.items.find((i) => i.id === "catchphrase")?.done).toBe(true);
  });

  it("ticks room when player.roomNumber is set", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "kai", passcodeHash: null, roomNumber: "4201" });
    });
    const result = await t.query(api.welcome.getProgress, { slug: "kai" });
    expect(result.items.find((i) => i.id === "room")?.done).toBe(true);
  });

  it("ticks wallPost when the player has at least one post", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("posts", {
        authorSlug: "kai",
        text: "hello world",
        createdAt: Date.now(),
      });
    });
    const result = await t.query(api.welcome.getProgress, { slug: "kai" });
    expect(result.items.find((i) => i.id === "wallPost")?.done).toBe(true);
  });

  it("ticks challengeClaim when the player has any entries row", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("entries", {
        type: "challenge",
        subjectSlug: "kai",
        points: 10,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now(),
      });
    });
    const result = await t.query(api.welcome.getProgress, { slug: "kai" });
    expect(result.items.find((i) => i.id === "challengeClaim")?.done).toBe(true);
  });

  it("ticks adventureVote when the player has cast a vote", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("activityVotes", {
        playerSlug: "kai",
        activityId: "saona",
        vote: "like",
        updatedAt: Date.now(),
      });
    });
    const result = await t.query(api.welcome.getProgress, { slug: "kai" });
    expect(result.items.find((i) => i.id === "adventureVote")?.done).toBe(true);
  });

  it("ticks scavengerVisit / leaderboardVisit / lockscreen from playerProgress flags", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("playerProgress", {
        slug: "kai",
        visitedLeaderboard: true,
        visitedScavenger: true,
        lockscreenSeen: true,
        welcomeHidden: false,
      });
    });
    const result = await t.query(api.welcome.getProgress, { slug: "kai" });
    expect(result.items.find((i) => i.id === "scavengerVisit")?.done).toBe(true);
    expect(result.items.find((i) => i.id === "leaderboardVisit")?.done).toBe(true);
    expect(result.items.find((i) => i.id === "lockscreen")?.done).toBe(true);
    expect(result.hidden).toBe(false);
  });

  it("returns hidden=true when welcomeHidden is set", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "kai");
    await t.run(async (ctx) => {
      await ctx.db.insert("playerProgress", {
        slug: "kai",
        visitedLeaderboard: false,
        visitedScavenger: false,
        lockscreenSeen: false,
        welcomeHidden: true,
      });
    });
    const result = await t.query(api.welcome.getProgress, { slug: "kai" });
    expect(result.hidden).toBe(true);
  });

  it("doesn't count posts/entries/votes belonging to other players", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "kai");
    await seedPlayer(t, "candice");
    await t.run(async (ctx) => {
      await ctx.db.insert("posts", { authorSlug: "candice", text: "hi", createdAt: Date.now() });
      await ctx.db.insert("entries", {
        type: "challenge",
        subjectSlug: "candice",
        points: 10,
        status: "active",
        vouchCount: 0,
        disputeCount: 0,
        dailyKey: "2026-05-20",
        createdAt: Date.now(),
      });
      await ctx.db.insert("activityVotes", {
        playerSlug: "candice",
        activityId: "saona",
        vote: "like",
        updatedAt: Date.now(),
      });
    });
    const result = await t.query(api.welcome.getProgress, { slug: "kai" });
    expect(result.doneCount).toBe(0);
  });
});
