import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const _getPlayerBySlug = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const _writePasscodeAndSession = internalMutation({
  args: { slug: v.string(), passcodeHash: v.string(), token: v.string() },
  handler: async (ctx, { slug, passcodeHash, token }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!player) throw new Error("unknown player");
    if (player.passcodeHash !== null) throw new Error("passcode already set");
    await ctx.db.patch(player._id, { passcodeHash });
    await ctx.db.insert("sessions", {
      playerSlug: slug,
      token,
      createdAt: Date.now(),
    });
  },
});

export const setPasscode = action({
  args: { slug: v.string(), passcode: v.string() },
  handler: async (ctx, { slug, passcode }) => {
    const player = await ctx.runQuery(internal.auth._getPlayerBySlug, { slug });
    if (!player) throw new Error("unknown player");
    if (player.passcodeHash !== null) throw new Error("passcode already set");

    const hash = await bcrypt.hash(passcode, 10);
    const token = generateToken();
    await ctx.runMutation(internal.auth._writePasscodeAndSession, {
      slug,
      passcodeHash: hash,
      token,
    });
    return { token };
  },
});
