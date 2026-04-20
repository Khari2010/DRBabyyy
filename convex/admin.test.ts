import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

describe("admin.resetPasscode", () => {
  it("clears the passcode hash and deletes existing sessions", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "kai", passcodeHash: "some-hash" });
      await ctx.db.insert("sessions", {
        playerSlug: "kai",
        token: "t1",
        createdAt: Date.now(),
      });
      await ctx.db.insert("sessions", {
        playerSlug: "kai",
        token: "t2",
        createdAt: Date.now(),
      });
      await ctx.db.insert("sessions", {
        playerSlug: "khari",
        token: "other",
        createdAt: Date.now(),
      });
    });

    await t.mutation(internal.admin.resetPasscode, { slug: "kai" });

    await t.run(async (ctx) => {
      const player = await ctx.db
        .query("players")
        .withIndex("by_slug", (q) => q.eq("slug", "kai"))
        .unique();
      expect(player?.passcodeHash).toBeNull();

      const kaiSessions = await ctx.db.query("sessions").collect();
      expect(kaiSessions).toHaveLength(1);
      expect(kaiSessions[0].playerSlug).toBe("khari");
    });
  });

  it("throws for unknown slug", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(internal.admin.resetPasscode, { slug: "nobody" }),
    ).rejects.toThrow(/unknown player/i);
  });
});
