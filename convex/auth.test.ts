import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

describe("auth.setPasscode", () => {
  it("sets a passcode for a player with no existing hash and returns a session token", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "candice", passcodeHash: null });
    });

    const result = await t.action(api.auth.setPasscode, {
      slug: "candice",
      passcode: "1234",
    });

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);

    await t.run(async (ctx) => {
      const player = await ctx.db
        .query("players")
        .withIndex("by_slug", (q) => q.eq("slug", "candice"))
        .unique();
      expect(player?.passcodeHash).not.toBeNull();
      expect(player?.passcodeHash).not.toBe("1234");

      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", result.token))
        .collect();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].playerSlug).toBe("candice");
    });
  });

  it("rejects setPasscode if a passcode is already set", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "kai", passcodeHash: "existing-hash" });
    });

    await expect(
      t.action(api.auth.setPasscode, { slug: "kai", passcode: "9999" }),
    ).rejects.toThrow(/already set/i);
  });

  it("rejects setPasscode for an unknown slug", async () => {
    const t = convexTest(schema);
    await expect(
      t.action(api.auth.setPasscode, { slug: "nobody", passcode: "1234" }),
    ).rejects.toThrow(/unknown player/i);
  });
});
