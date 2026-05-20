import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t: ReturnType<typeof convexTest>, slug: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
  });
}

describe("postReactions.toggle", () => {
  it("inserts a reaction on first call and removes it on second", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });

    await t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "❤️" });
    let rows = await t.run((ctx) => ctx.db.query("postReactions").collect());
    expect(rows.length).toBe(1);

    await t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "❤️" });
    rows = await t.run((ctx) => ctx.db.query("postReactions").collect());
    expect(rows.length).toBe(0);
  });

  it("accepts emojis from the system keyboard (no allow-list)", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "💩" });
    const rows = await t.run((ctx) => ctx.db.query("postReactions").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].emoji).toBe("💩");
  });

  it("rejects empty or overlong emoji input", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await expect(t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "   " }))
      .rejects.toThrow(/reaction not allowed/);
    await expect(t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "x".repeat(64) }))
      .rejects.toThrow(/reaction not allowed/);
  });

  it("allows multiple different emoji reactions per (post, player)", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "❤️" });
    await t.mutation(api.postReactions.toggle, { token: "tok-khari", postId, emoji: "🔥" });
    const rows = await t.run((ctx) => ctx.db.query("postReactions").collect());
    expect(rows.length).toBe(2);
  });

  it("requires a valid session", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await expect(t.mutation(api.postReactions.toggle, { token: "bogus", postId, emoji: "❤️" }))
      .rejects.toThrow(/invalid session/);
  });
});
