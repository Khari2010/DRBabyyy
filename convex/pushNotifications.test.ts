import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async () => ({ statusCode: 201 })),
  },
}));

async function drainScheduler(t: ReturnType<typeof convexTest>) {
  await t.finishAllScheduledFunctions(vi.runAllTimers);
}

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

describe("pushNotifications.sendForPost", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("notifies everyone with a subscription except the author", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");
    await seedPlayer(t, "amelia");
    await t.mutation(api.pushNotifications.subscribe, {
      token: "tok-adan", endpoint: "https://push.example/adan", p256dh: "P", auth: "A",
    });
    await t.mutation(api.pushNotifications.subscribe, {
      token: "tok-amelia", endpoint: "https://push.example/amelia", p256dh: "P", auth: "A",
    });
    await t.mutation(api.pushNotifications.subscribe, {
      token: "tok-khari", endpoint: "https://push.example/khari", p256dh: "P", auth: "A",
    });
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "hello" });

    // Drain scheduler so sendForPost runs.
    await drainScheduler(t);

    const webpush = (await import("web-push")).default as any;
    const calls = (webpush.sendNotification as any).mock.calls;
    const endpoints = calls.map((c: any[]) => c[0].endpoint);
    expect(endpoints).toContain("https://push.example/adan");
    expect(endpoints).toContain("https://push.example/amelia");
    expect(endpoints).not.toContain("https://push.example/khari");
  });
});

describe("pushNotifications.sendForComment", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("notifies OP + earlier commenters, minus the new commenter", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari"); // OP
    await seedPlayer(t, "adan");  // earlier commenter
    await seedPlayer(t, "amelia"); // brand-new commenter (not notified)
    await seedPlayer(t, "kavi");  // uninvolved (not notified)

    for (const slug of ["khari", "adan", "amelia", "kavi"]) {
      await t.mutation(api.pushNotifications.subscribe, {
        token: `tok-${slug}`,
        endpoint: `https://push.example/${slug}`,
        p256dh: "P", auth: "A",
      });
    }
    const postId = await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await drainScheduler(t); // drain the sendForPost from create

    const webpush = (await import("web-push")).default as any;
    (webpush.sendNotification as any).mockClear();

    await t.mutation(api.postComments.add, { token: "tok-adan", postId, text: "first reply" });
    await drainScheduler(t);
    (webpush.sendNotification as any).mockClear();

    await t.mutation(api.postComments.add, { token: "tok-amelia", postId, text: "second reply" });
    await drainScheduler(t);

    const endpoints = (webpush.sendNotification as any).mock.calls.map((c: any[]) => c[0].endpoint);
    expect(endpoints).toContain("https://push.example/khari"); // OP
    expect(endpoints).toContain("https://push.example/adan");  // earlier commenter
    expect(endpoints).not.toContain("https://push.example/amelia"); // the new commenter herself
    expect(endpoints).not.toContain("https://push.example/kavi"); // uninvolved
  });
});

describe("pushNotifications dead-endpoint pruning", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("prunes a subscription when web-push returns 410", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await seedPlayer(t, "adan");
    await t.mutation(api.pushNotifications.subscribe, {
      token: "tok-adan", endpoint: "https://push.example/dead", p256dh: "P", auth: "A",
    });

    const webpush = (await import("web-push")).default as any;
    (webpush.sendNotification as any).mockImplementationOnce(async () => {
      const err: any = new Error("gone"); err.statusCode = 410; throw err;
    });

    await t.mutation(api.posts.create, { token: "tok-khari", text: "p" });
    await drainScheduler(t);

    const rows = await t.run((ctx) => ctx.db.query("pushSubscriptions").collect());
    expect(rows.find((r) => r.endpoint === "https://push.example/dead")).toBeUndefined();
  });
});
