import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t, slug) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
  });
}

describe("activityComments.add", () => {
  it("inserts a comment", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.activityComments.add, {
      token: "tok-khari", activityId: "saona", text: "We have to do this",
    });
    const rows = await t.run((ctx) => ctx.db.query("activityComments").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].activityId).toBe("saona");
    expect(rows[0].text).toBe("We have to do this");
  });

  it("rejects empty text", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await expect(t.mutation(api.activityComments.add, {
      token: "tok-khari", activityId: "saona", text: " ",
    })).rejects.toThrow(/text required/);
  });
});

describe("activityComments.listByActivity", () => {
  it("returns comments for an activity ordered oldest first", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("activityComments", { activityId: "saona", authorSlug: "kai", text: "a", createdAt: 1 });
      await ctx.db.insert("activityComments", { activityId: "saona", authorSlug: "khari", text: "b", createdAt: 2 });
      await ctx.db.insert("activityComments", { activityId: "other", authorSlug: "khari", text: "c", createdAt: 3 });
    });
    const rows = await t.query(api.activityComments.listByActivity, { activityId: "saona" });
    expect(rows.map((r) => r.text)).toEqual(["a", "b"]);
  });
});
