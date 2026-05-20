import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

async function seedPlayer(t: ReturnType<typeof convexTest>, slug: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
  });
}

const SUB = {
  endpoint: "https://push.example/abc",
  p256dh: "P256",
  auth: "AUTH",
};

describe("pushNotifications.subscribe", () => {
  it("creates a subscription row for the caller", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB, userAgent: "iPhone" });
    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].playerSlug).toBe("khari");
    expect(rows[0].endpoint).toBe(SUB.endpoint);
  });

  it("upserts when the same endpoint is re-subscribed", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB });
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB });
    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.length).toBe(1);
  });

  it("reassigns ownership when a different player subscribes the same endpoint", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB });
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-adan", ...SUB });
    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].playerSlug).toBe("adan");
  });
});

describe("pushNotifications.unsubscribe", () => {
  it("deletes the caller's subscription for an endpoint", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB });
    await t.mutation(api.pushNotifications.unsubscribe, { token: "tok-khari", endpoint: SUB.endpoint });
    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.length).toBe(0);
  });
});

describe("pushNotifications._pruneSubscription", () => {
  it("deletes a row by id (internal)", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.pushNotifications.subscribe, { token: "tok-khari", ...SUB });
    const id = (await t.run((ctx) => ctx.db.query("pushSubscriptions").collect()))[0]._id;
    await t.mutation(internal.pushNotifications._pruneSubscription, { subscriptionId: id });
    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.length).toBe(0);
  });
});
