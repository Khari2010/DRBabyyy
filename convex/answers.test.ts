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

describe("answers.save", () => {
  it("inserts a new answer for a valid session", async () => {
    const t = convexTest(schema);
    await seedSession(t, "candice", "tok");

    await t.mutation(api.answers.save, {
      token: "tok",
      questionId: "q1",
      text: "Sunshine and cocktails",
    });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("answers").collect();
      expect(rows).toHaveLength(1);
      expect(rows[0].playerSlug).toBe("candice");
      expect(rows[0].questionId).toBe("q1");
      expect(rows[0].text).toBe("Sunshine and cocktails");
    });
  });

  it("upserts (replaces) an existing answer for the same (slug, questionId)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "candice", "tok");

    await t.mutation(api.answers.save, { token: "tok", questionId: "q1", text: "first" });
    await t.mutation(api.answers.save, { token: "tok", questionId: "q1", text: "second" });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("answers").collect();
      expect(rows).toHaveLength(1);
      expect(rows[0].text).toBe("second");
    });
  });

  it("trims text to 280 characters", async () => {
    const t = convexTest(schema);
    await seedSession(t, "miles", "tok");
    const longText = "x".repeat(500);

    await t.mutation(api.answers.save, {
      token: "tok",
      questionId: "q1",
      text: longText,
    });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("answers").collect();
      expect(rows[0].text.length).toBe(280);
    });
  });

  it("rejects save with an invalid session token", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(api.answers.save, { token: "bad", questionId: "q1", text: "x" }),
    ).rejects.toThrow(/invalid session/i);
  });
});

describe("answers.listAll", () => {
  it("returns all answers across players", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("answers", {
        playerSlug: "kai",
        questionId: "q1",
        text: "one",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("answers", {
        playerSlug: "miles",
        questionId: "q2",
        text: "two",
        updatedAt: Date.now(),
      });
    });

    const rows = await t.query(api.answers.listAll, {});
    expect(rows).toHaveLength(2);
    const slugs = rows.map((r) => r.playerSlug).sort();
    expect(slugs).toEqual(["kai", "miles"]);
  });
});
