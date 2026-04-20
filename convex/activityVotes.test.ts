import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

async function seedSession(t: ReturnType<typeof convexTest>, slug: string, token: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", {
      playerSlug: slug,
      token,
      createdAt: Date.now(),
    });
  });
}

describe("activityVotes.castVote", () => {
  it("inserts a like vote for a valid session", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok");

    await t.mutation(api.activityVotes.castVote, {
      token: "tok",
      activityId: "saona",
      vote: "like",
    });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("activityVotes").collect();
      expect(rows).toHaveLength(1);
      expect(rows[0].playerSlug).toBe("kai");
      expect(rows[0].activityId).toBe("saona");
      expect(rows[0].vote).toBe("like");
    });
  });

  it("switches an existing vote in place (no duplicates)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok");

    await t.mutation(api.activityVotes.castVote, { token: "tok", activityId: "saona", vote: "like" });
    await t.mutation(api.activityVotes.castVote, { token: "tok", activityId: "saona", vote: "dislike" });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("activityVotes").collect();
      expect(rows).toHaveLength(1);
      expect(rows[0].vote).toBe("dislike");
    });
  });

  it("deletes the vote when vote: null is passed", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok");

    await t.mutation(api.activityVotes.castVote, { token: "tok", activityId: "saona", vote: "like" });
    await t.mutation(api.activityVotes.castVote, { token: "tok", activityId: "saona", vote: null });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("activityVotes").collect();
      expect(rows).toHaveLength(0);
    });
  });

  it("rejects with invalid session", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(api.activityVotes.castVote, { token: "bad", activityId: "saona", vote: "like" }),
    ).rejects.toThrow(/invalid session/i);
  });
});

describe("activityVotes.listAll", () => {
  it("returns all votes across players", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("activityVotes", {
        playerSlug: "kai", activityId: "saona", vote: "like", updatedAt: Date.now(),
      });
      await ctx.db.insert("activityVotes", {
        playerSlug: "miles", activityId: "saona", vote: "dislike", updatedAt: Date.now(),
      });
      await ctx.db.insert("activityVotes", {
        playerSlug: "candice", activityId: "hoyo-azul", vote: "like", updatedAt: Date.now(),
      });
    });

    const rows = await t.query(api.activityVotes.listAll, {});
    expect(rows).toHaveLength(3);
  });
});
