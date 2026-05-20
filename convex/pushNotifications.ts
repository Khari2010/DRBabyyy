"use node";

import { mutation, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./helpers";
import { internal } from "./_generated/api";
import webpush from "web-push";

export const subscribe = mutation({
  args: {
    token: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, { token, endpoint, p256dh, auth, userAgent }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { playerSlug, p256dh, auth, userAgent });
      return existing._id;
    }
    return await ctx.db.insert("pushSubscriptions", {
      playerSlug,
      endpoint,
      p256dh,
      auth,
      userAgent,
      createdAt: Date.now(),
    });
  },
});

export const unsubscribe = mutation({
  args: { token: v.string(), endpoint: v.string() },
  handler: async (ctx, { token, endpoint }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (!existing) return;
    if (existing.playerSlug !== playerSlug) return; // not yours, no-op
    await ctx.db.delete(existing._id);
  },
});

export const _pruneSubscription = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const row = await ctx.db.get(subscriptionId);
    if (row) await ctx.db.delete(subscriptionId);
  },
});

// ─── VAPID setup ────────────────────────────────────────────────────────────

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:khari@millennialservices.co.uk";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const SNIPPET = 120;
function snip(text: string) {
  return text.length > SNIPPET ? text.slice(0, SNIPPET - 1) + "…" : text;
}

async function fanout(
  ctx: any,
  recipients: Array<{ _id: any; endpoint: string; p256dh: string; auth: string }>,
  payload: object,
) {
  for (const sub of recipients) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await ctx.runMutation(internal.pushNotifications._pruneSubscription, { subscriptionId: sub._id });
      } else {
        console.error("[push] send failed:", err?.statusCode, err?.message);
      }
    }
  }
}

// ─── Actions ────────────────────────────────────────────────────────────────

export const sendForPost = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.runQuery(internal.pushNotificationsQueries._getPostForPush, { postId });
    if (!post) return;
    const subs = await ctx.runQuery(internal.pushNotificationsQueries._getSubscriptionsForPost, {
      authorSlug: post.authorSlug,
    });
    const payload = {
      title: "DR Baby",
      body: `${post.authorHolidayName}: ${snip(post.text || "(photo)")}`,
      url: `/wall#post-${postId}`,
      tag: `post-${postId}`,
    };
    await fanout(ctx, subs, payload);
  },
});

export const sendForComment = internalAction({
  args: { commentId: v.id("postComments") },
  handler: async (ctx, { commentId }) => {
    const info = await ctx.runQuery(internal.pushNotificationsQueries._getCommentForPush, { commentId });
    if (!info) return;
    const subs = await ctx.runQuery(internal.pushNotificationsQueries._getSubscriptionsForComment, {
      postId: info.postId,
      commenterSlug: info.commenterSlug,
    });
    const payload = {
      title: "DR Baby",
      body: `${info.commenterHolidayName} replied on ${info.opHolidayName}'s post: ${snip(info.text)}`,
      url: `/wall#post-${info.postId}`,
      tag: `post-${info.postId}`,
    };
    await fanout(ctx, subs, payload);
  },
});
