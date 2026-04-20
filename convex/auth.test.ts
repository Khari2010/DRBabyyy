import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import bcrypt from "bcryptjs";

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

describe("auth.login", () => {
  it("returns a new session token on correct passcode", async () => {
    const t = convexTest(schema);
    const existingHash = await bcrypt.hash("1234", 10);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "kyanna", passcodeHash: existingHash });
    });

    const result = await t.action(api.auth.login, {
      slug: "kyanna",
      passcode: "1234",
    });

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);

    await t.run(async (ctx) => {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", result.token))
        .unique();
      expect(session?.playerSlug).toBe("kyanna");
    });
  });

  it("rejects wrong passcode", async () => {
    const t = convexTest(schema);
    const hash = await bcrypt.hash("1234", 10);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "miles", passcodeHash: hash });
    });

    await expect(
      t.action(api.auth.login, { slug: "miles", passcode: "9999" }),
    ).rejects.toThrow(/invalid/i);
  });

  it("rejects login if no passcode is set", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "camara", passcodeHash: null });
    });

    await expect(
      t.action(api.auth.login, { slug: "camara", passcode: "1234" }),
    ).rejects.toThrow(/not set/i);
  });

  it("rejects login for unknown slug", async () => {
    const t = convexTest(schema);
    await expect(
      t.action(api.auth.login, { slug: "nobody", passcode: "1234" }),
    ).rejects.toThrow(/unknown player/i);
  });
});

describe("auth.getSession", () => {
  it("returns playerSlug for a valid token", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        playerSlug: "kai",
        token: "valid-token",
        createdAt: Date.now(),
      });
    });

    const result = await t.query(api.auth.getSession, { token: "valid-token" });
    expect(result).toEqual({ playerSlug: "kai" });
  });

  it("returns null for an unknown token", async () => {
    const t = convexTest(schema);
    const result = await t.query(api.auth.getSession, { token: "missing" });
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("deletes the matching session", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        playerSlug: "candice",
        token: "gone",
        createdAt: Date.now(),
      });
    });

    await t.mutation(api.auth.logout, { token: "gone" });

    await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", "gone"))
        .collect();
      expect(rows).toHaveLength(0);
    });
  });

  it("is a no-op for unknown tokens", async () => {
    const t = convexTest(schema);
    await t.mutation(api.auth.logout, { token: "nonexistent" });
  });
});
