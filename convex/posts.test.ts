import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t, slug, isAdmin = false) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
    if (isAdmin) await ctx.db.insert("adminRoles", { playerSlug: slug });
  });
}

describe("posts.create", () => {
  it("inserts a post with the caller as author", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const id = await t.mutation(api.posts.create, { token: "tok-khari", text: "Hello wall" });
    expect(id).toBeDefined();
    const rows = await t.run((ctx) => ctx.db.query("posts").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].authorSlug).toBe("khari");
    expect(rows[0].text).toBe("Hello wall");
  });

  it("trims whitespace and rejects empty text without a photo", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await expect(t.mutation(api.posts.create, { token: "tok-khari", text: "   " }))
      .rejects.toThrow(/text or a photo/);
  });

  it("allows a post with only a photo (no text)", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["fake"])));
    const id = await t.mutation(api.posts.create, {
      token: "tok-khari", text: "", photoStorageId: storageId,
    });
    expect(id).toBeDefined();
  });

  it("caps text at 500 chars after trim", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const long = "x".repeat(800);
    await expect(t.mutation(api.posts.create, { token: "tok-khari", text: long }))
      .rejects.toThrow(/too long/);
  });

  it("requires a valid session", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.posts.create, { token: "bogus", text: "hi" }))
      .rejects.toThrow(/invalid session/);
  });
});

describe("posts.remove", () => {
  it("author can delete their own post and cascades to comments + reactions + photo", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["fake"])));
    const postId = await t.mutation(api.posts.create, {
      token: "tok-khari", text: "to be deleted", photoStorageId: storageId,
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("postComments", { postId, authorSlug: "khari", text: "self-reply", createdAt: Date.now() });
      await ctx.db.insert("postReactions", { postId, playerSlug: "khari", emoji: "❤️", at: Date.now() });
    });

    await t.mutation(api.posts.remove, { token: "tok-khari", postId });

    const posts = await t.run((ctx) => ctx.db.query("posts").collect());
    const comments = await t.run((ctx) => ctx.db.query("postComments").collect());
    const reactions = await t.run((ctx) => ctx.db.query("postReactions").collect());
    expect(posts.length).toBe(0);
    expect(comments.length).toBe(0);
    expect(reactions.length).toBe(0);
  });

  it("admin can delete another player's post", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "amelia", true);
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "x" });
    await t.mutation(api.posts.remove, { token: "tok-amelia", postId });
    const posts = await t.run((ctx) => ctx.db.query("posts").collect());
    expect(posts.length).toBe(0);
  });

  it("non-admin non-author cannot delete", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "x" });
    await expect(t.mutation(api.posts.remove, { token: "tok-adan", postId }))
      .rejects.toThrow(/admin only/);
  });
});

describe("posts.generateUploadUrl", () => {
  it("returns a non-empty URL for an authenticated caller", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const url = await t.mutation(api.posts.generateUploadUrl, { token: "tok-khari" });
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });

  it("rejects an invalid session", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.posts.generateUploadUrl, { token: "bogus" }))
      .rejects.toThrow(/invalid session/);
  });
});
