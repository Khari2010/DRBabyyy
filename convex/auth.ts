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

export const hasPasscode = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!player) return false;
    return player.passcodeHash !== null;
  },
});

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

export const _createSession = internalMutation({
  args: { slug: v.string(), token: v.string() },
  handler: async (ctx, { slug, token }) => {
    await ctx.db.insert("sessions", {
      playerSlug: slug,
      token,
      createdAt: Date.now(),
    });
  },
});

export const login = action({
  args: { slug: v.string(), passcode: v.string() },
  handler: async (ctx, { slug, passcode }) => {
    const player = await ctx.runQuery(internal.auth._getPlayerBySlug, { slug });
    if (!player) throw new Error("unknown player");
    if (player.passcodeHash === null) throw new Error("passcode not set");

    const ok = await bcrypt.compare(passcode, player.passcodeHash);
    if (!ok) throw new Error("invalid passcode");

    const token = generateToken();
    await ctx.runMutation(internal.auth._createSession, { slug, token });
    return { token };
  },
});

export const getSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return null;
    return { playerSlug: session.playerSlug };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});
