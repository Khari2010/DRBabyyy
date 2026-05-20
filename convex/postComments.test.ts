import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t: ReturnType<typeof convexTest>, slug: string, isAdmin = false) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
    if (isAdmin) await ctx.db.insert("adminRoles", { playerSlug: slug });
  });
}

describe("postComments.add", () => {
  it("inserts a comment with the caller as author", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "nice" });
    const rows = await t.run((ctx) => ctx.db.query("postComments").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].authorSlug).toBe("khari");
    expect(rows[0].text).toBe("nice");
  });

  it("rejects when the post is missing", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const fakeId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("posts", { authorSlug: "khari", text: "tmp", createdAt: Date.now() });
      await ctx.db.delete(id);
      return id;
    });
    await expect(t.mutation(api.postComments.add, { token: "tok-khari", postId: fakeId, text: "hi" }))
      .rejects.toThrow(/post not found/);
  });

  it("trims and rejects empty text", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await expect(t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "   " }))
      .rejects.toThrow(/text required/);
  });

  it("rejects > 280 chars after trim", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await expect(t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "x".repeat(400) }))
      .rejects.toThrow(/too long/);
  });
});

describe("postComments.remove", () => {
  it("author can delete their own comment", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "x" });
    const cmt = (await t.run((ctx) => ctx.db.query("postComments").collect()))[0];
    await t.mutation(api.postComments.remove, { token: "tok-khari", commentId: cmt._id });
    expect((await t.run((ctx) => ctx.db.query("postComments").collect())).length).toBe(0);
  });

  it("admin can delete another player's comment", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "amelia", true);
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "x" });
    const cmt = (await t.run((ctx) => ctx.db.query("postComments").collect()))[0];
    await t.mutation(api.postComments.remove, { token: "tok-amelia", commentId: cmt._id });
    expect((await t.run((ctx) => ctx.db.query("postComments").collect())).length).toBe(0);
  });

  it("non-admin non-author cannot delete", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "x" });
    const cmt = (await t.run((ctx) => ctx.db.query("postComments").collect()))[0];
    await expect(t.mutation(api.postComments.remove, { token: "tok-adan", commentId: cmt._id }))
      .rejects.toThrow(/admin only/);
  });
});

describe("postComments.listByPost", () => {
  it("returns comments oldest-first with author holiday name", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.run(async (ctx) => {
      const p = await ctx.db.query("players").withIndex("by_slug", (q) => q.eq("slug", "khari")).unique();
      await ctx.db.patch(p!._id, { holidayName: "Sunshine" });
    });
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "first" });
    await t.mutation(api.postComments.add, { token: "tok-khari", postId, text: "second" });
    const rows = await t.query(api.postComments.listByPost, { postId });
    expect(rows.length).toBe(2);
    expect(rows[0].text).toBe("first");
    expect(rows[1].text).toBe("second");
    expect(rows[0].authorHolidayName).toBe("Sunshine");
  });
});
