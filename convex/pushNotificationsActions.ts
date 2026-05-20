"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import webpush from "web-push";

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

export const sendForEntryEvent = internalAction({
  args: {
    entryId: v.id("entries"),
    event: v.union(v.literal("vouch"), v.literal("dispute"), v.literal("forfeit-applied")),
    actorSlug: v.string(),
  },
  handler: async (ctx, { entryId, event, actorSlug }) => {
    const info = await ctx.runQuery(internal.pushNotificationsQueries._getEntryNotification, {
      entryId,
      event,
      actorSlug,
    });
    if (!info) return;
    const subs = await ctx.runQuery(internal.pushNotificationsQueries._getSubscriptionsForSlug, {
      recipientSlug: info.recipientSlug,
    });
    const payload = {
      title: "DR Baby",
      body: info.body,
      url: info.url,
      tag: info.tag,
    };
    await fanout(ctx, subs, payload);
  },
});
