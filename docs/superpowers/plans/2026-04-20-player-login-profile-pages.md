# Player Login & Private Profile Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship passcode-gated private per-player pages (route: `/player/<slug>`) backed by Convex, without touching the existing public home page content.

**Architecture:** Vite + React SPA on Vercel (frontend); Convex as the backend-as-a-service for passcodes, sessions, and pre-trip question answers. `react-router-dom` is added for client-side routing. The existing `/` page moves into a `HomePage` route unchanged; a new `/player/:slug` route renders the private page.

**Tech Stack:** React 18, Vite 5, react-router-dom 6, Convex, bcryptjs, vitest, @testing-library/react, convex-test.

**Spec:** `docs/superpowers/specs/2026-04-20-player-login-profile-pages-design.md`

---

## File Structure

**Created:**
- `vercel.json` — SPA rewrite so `/player/*` is served by `index.html`.
- `convex/schema.ts` — tables: `players`, `answers`, `sessions`.
- `convex/auth.ts` — `setPasscode` action, `login` action, `getSession` query, `logout` mutation, and internal helpers.
- `convex/admin.ts` — `resetPasscode` internal mutation.
- `convex/answers.ts` — `listAll` query, `save` mutation.
- `convex/seed.ts` — internal mutation to seed the 6 players.
- `convex/auth.test.ts`, `convex/answers.test.ts`, `convex/admin.test.ts` — Convex function tests using `convex-test`.
- `src/routes/HomePage.jsx` — the existing long-scroll site.
- `src/routes/PlayerPage.jsx` — the private per-player page.
- `src/components/LoginModal.jsx` — modal with avatar picker + passcode entry.
- `src/components/LoggedInChip.jsx` — small chip on the home page shown when a session exists.
- `src/components/QuestionBlock.jsx` — single pre-trip question block (edit/read-only).
- `src/components/CrewAnswersPanel.jsx` — panel listing the other 5 players' answers.
- `src/lib/session.js` — localStorage session helpers.
- `src/lib/session.test.js` — tests for session helpers.
- `src/lib/convex.js` — Convex client instance.
- `src/data/players.js` — `PLAYERS`, `MEMBERS`, `V1_LOGIN_SLUGS` (5 real + Khari) — Ebony excluded from picker.
- `src/data/flights.js` — `FLIGHTS` extracted from `App.jsx`.
- `src/data/questions.js` — `QUESTIONS` starter set.
- `src/data/colors.js` — the `C` palette extracted from `App.jsx`.
- `vitest.config.js` — frontend test runner config.
- `docs/admin/reset-passcode.md` — ops note for passcode reset.

**Modified:**
- `package.json` — add deps and scripts.
- `.gitignore` — `convex/_generated` is NOT ignored (Convex generates typed client code that must be committed in this project pattern — we'll check `convex/.gitignore` which Convex creates on init).
- `src/App.jsx` — strip to a thin `BrowserRouter` + `Routes` shell. Content moves to `HomePage.jsx`.
- `src/main.jsx` — wrap `<App />` with `<ConvexProvider>`.

---

## Task 1 — Install dependencies and initialize Convex

**Files:**
- Modify: `package.json`
- Modify: `.env.local` (created by Convex; user-driven)
- Create: `convex/` directory (created by `npx convex dev`)

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
npm install convex react-router-dom bcryptjs
```

Expected: `package.json` now lists `convex`, `react-router-dom`, and `bcryptjs` under `dependencies`. `node_modules` updates. `package-lock.json` updates.

- [ ] **Step 2: Initialize Convex (interactive — user runs once)**

Run:
```bash
npx convex dev
```

This prompts the user to log in to Convex, pick a project name (suggest `dr-babyyy`), and creates:
- A `convex/` directory with `_generated/` and a `.gitignore`
- A dev deployment in Convex's cloud
- A `.env.local` file with `VITE_CONVEX_URL=https://<deployment>.convex.cloud` and `CONVEX_DEPLOYMENT=dev:...`

Leave `npx convex dev` running in a second terminal during development — it watches `convex/*` files and pushes changes live.

Expected: `convex/` directory exists. `.env.local` contains `VITE_CONVEX_URL`. Convex dashboard shows the new project.

- [ ] **Step 3: Verify Convex connected**

Check that `convex/_generated/api.d.ts` and `convex/_generated/server.d.ts` exist (auto-generated).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json convex/
git commit -m "chore: add convex, react-router-dom, bcryptjs; initialize convex project"
```

Note: `.env.local` is already gitignored and is not committed.

---

## Task 2 — Add Vercel SPA rewrite

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json**

File: `vercel.json`
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Static assets under `/assets/*` continue to serve from the filesystem (Vercel's file system takes precedence over rewrites). The rewrite only matches requests that don't have a matching file.

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel.json SPA rewrite for client-side routing"
```

---

## Task 3 — Set up Vitest for frontend tests

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Install vitest and testing libraries**

Run:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create `vitest.config.js`**

File: `vitest.config.js`
```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.js"],
  },
});
```

- [ ] **Step 3: Create `src/test-setup.js`**

File: `src/test-setup.js`
```js
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add test script**

Modify `package.json` `"scripts"`:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 5: Verify test runner works**

Run:
```bash
npm test
```

Expected: vitest runs, reports 0 tests, exits cleanly.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/test-setup.js
git commit -m "chore: add vitest with React Testing Library"
```

---

## Task 4 — Extract shared data modules

**Files:**
- Create: `src/data/colors.js`
- Create: `src/data/players.js`
- Create: `src/data/flights.js`
- Create: `src/data/questions.js`

- [ ] **Step 1: Extract `C` palette**

File: `src/data/colors.js`
```js
export const C = {
  sky: "#38BDF8",
  turquoise: "#00CEC9",
  coral: "#FF6B6B",
  coralDeep: "#E8453C",
  yellow: "#FFD93D",
  gold: "#F59E0B",
  green: "#00B894",
  palm: "#15803D",
  sand: "#FEF9EF",
  sandDark: "#F5EDE0",
  white: "#FFFFFF",
  dark: "#1A1A2E",
  darkSoft: "#2D2D44",
  textBody: "#4A4A6A",
  pink: "#F9A8D4",
  blue: "#3b82f6",
  purple: "#a855f7",
  cyan: "#06b6d4",
};
```

- [ ] **Step 2: Extract PLAYERS**

File: `src/data/players.js`
```js
import { C } from "./colors.js";

export const MEMBERS = ["Kai", "Khari", "Candice", "Kyanna", "Camara", "Miles"];
export const FULL_GROUP = MEMBERS;

export const PLAYERS = [
  { id: 1, num: "01", slug: "kai", name: "Kai", title: "The Director", role: "Cameraman & Game Master", bio: "Directs the games, directs the camera, runs the whole production. Something switches when he's on holiday — he transforms into a completely different person. Expect maximum energy, maximum content, and zero chill.", color: C.blue, emoji: "🎬", avatar: "/images/avatars/kai.png" },
  { id: 2, num: "02", slug: "khari", name: "Khari", title: "The Gaffer", role: "The overseer — keeps everything running", bio: "The boss who runs the show. Steady, reliable, always got advice whether you asked for it or not. Doesn't stress about challenges or competitions, but somehow never really loses either. The quiet confidence that holds the whole trip together.", color: C.gold, emoji: "🧔‍♂️", avatar: "/images/avatars/khari.png" },
  { id: 3, num: "03", slug: "candice", name: "Candice", title: "The Sunshine", role: "TikTok queen & the smile that lights up the room", bio: "Her smile is contagious — she doesn't need to be loud to lift the whole room. Always on TikTok, always down to have fun, and lights up every room with her joy.", color: C.coral, emoji: "☀️", avatar: "/images/avatars/candice.png" },
  { id: 4, num: "04", slug: "kyanna", name: "Kyanna", title: "The Ex-Wildcard", role: "Claims she's retired from the chaos. We'll see.", bio: "She was once the wildcard but now claims retirement and wants to chill by the pool. She'll tell everyone she's done with the chaos... but give it two drinks and we'll see how long that retirement lasts.", color: C.purple, emoji: "😈", avatar: "/images/avatars/kyanna.png" },
  { id: 5, num: "05", slug: "camara", name: "Camara", title: "The Messy One", role: "Never stops, never sleeps, always tries to be the main character", bio: "Gets the most drunk, will never sleep, doesn't ever want to stop partying. Three drinks deep and it's already over — says he can handle it every time, never can, and somehow always ends up in the most embarrassing situation possible.", color: C.green, emoji: "💣", avatar: "/images/avatars/camara.png" },
  { id: 6, num: "06", slug: "miles", name: "Miles", title: "The Joker", role: "Funniest in the room, first to disappear", bio: "Always funny, always cracking people up, and might just vanish into thin air halfway through the night. Will have everyone crying laughing at dinner then completely disappear by midnight with zero explanation.", color: C.cyan, emoji: "🃏", avatar: "/images/avatars/miles.png" },
  { id: 7, num: "0?", slug: "ebony", name: "???", title: "The UV Babe", role: "Pretty face, killer figure, lives by the UV index", bio: "The ultimate hot girl. Pretty face, killer figure, and permanently checking the UV levels for the perfect tanning window. Lives for a good sunset and the kind of energy that flips the whole vibe of a holiday — if she actually books, this trip levels up instantly. Identity classified. Status: pending. Whispers in the group chat say it's happening. 👀", color: C.pink, emoji: "🌅", avatar: null, mystery: true },
];

// Slugs that appear in the login picker and have private pages in v1.
// Ebony (slug: "ebony") is excluded to preserve the mystery; she's added when confirmed.
export const V1_LOGIN_SLUGS = ["kai", "khari", "candice", "kyanna", "camara", "miles"];

export const playerBySlug = (slug) => PLAYERS.find((p) => p.slug === slug) ?? null;
```

Note: a new `slug` field is added to each player object. The main site also refactors to use `PLAYERS` from this module, so keep the shape compatible with what `App.jsx` was using.

- [ ] **Step 3: Extract FLIGHTS**

File: `src/data/flights.js`
```js
export const FLIGHTS = [
  { id: "out-main", type: "Outbound", date: "18 May", flight: "TOM566", aircraft: "Boeing 787 Dreamliner", from: { code: "BHX", city: "Birmingham" }, to: { code: "PUJ", city: "Punta Cana" }, depart: "11:00", arrive: "14:50", duration: "9h 50m", who: ["Kai", "Khari", "Candice", "Kyanna"] },
  { id: "out-cm", type: "Outbound", date: "19 May", flight: "AV121 + AV128", aircraft: "787-8 / A320", from: { code: "LHR", city: "London" }, to: { code: "PUJ", city: "Punta Cana" }, depart: "22:05", arrive: "11:25+1", duration: "18h 20m", stops: 1, stopCity: "Bogota", who: ["Camara", "Miles"] },
  { id: "return-girls", type: "Return", date: "25 May", flight: "TOM567", aircraft: "Boeing 787 Dreamliner", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "BHX", city: "Birmingham" }, depart: "16:50", arrive: "06:00+1", duration: "8h 10m", who: ["Candice", "Kyanna"] },
  { id: "return-camara", type: "Return", date: "26 May", flight: "AV137 + AV120", aircraft: "A320 / 787-8", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "LHR", city: "London" }, depart: "18:35", arrive: "15:35+1", duration: "16h", stops: 1, stopCity: "Bogota", who: ["Camara"] },
  { id: "return-miles", type: "Return", date: "25 May", flight: "AV137 + AV120", aircraft: "A320 / 787-8", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "LHR", city: "London" }, depart: "18:35", arrive: "15:35+1", duration: "16h", stops: 1, stopCity: "Bogota", who: ["Miles"] },
  { id: "return-boys", type: "Return", date: "29 May", flight: "TOM569", aircraft: "Boeing 787 Dreamliner", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "BHX", city: "Birmingham" }, depart: "17:10", arrive: "06:15+1", duration: "8h 05m", who: ["Kai", "Khari"] },
];

export const flightsForPlayer = (playerName) =>
  FLIGHTS.filter((f) => f.who.includes(playerName));
```

- [ ] **Step 4: Create QUESTIONS**

File: `src/data/questions.js`
```js
export const QUESTIONS = [
  { id: "q1", prompt: "What are you most looking forward to?" },
  { id: "q2", prompt: "One thing that has to happen this trip?" },
  { id: "q3", prompt: "A dare you'd be willing to do for the group?" },
  { id: "q4", prompt: "Your song for the trip playlist?" },
  { id: "q5", prompt: "Hot take about this crew?" },
];

export const ANSWER_MAX_CHARS = 280;
```

- [ ] **Step 5: Commit**

```bash
git add src/data/
git commit -m "feat: extract players, flights, questions, colors into data modules"
```

Note: `src/App.jsx` still inlines this data — it'll be cleaned up when we extract `HomePage.jsx` in Task 15. Deliberate order: stand up data modules first, swap in later.

---

## Task 5 — Session library (TDD)

**Files:**
- Create: `src/lib/session.js`
- Test: `src/lib/session.test.js`

- [ ] **Step 1: Write failing tests**

File: `src/lib/session.test.js`
```js
import { describe, it, expect, beforeEach } from "vitest";
import { saveSession, loadSession, clearSession, SESSION_KEY } from "./session.js";

describe("session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saveSession writes slug + token to localStorage", () => {
    saveSession({ slug: "candice", token: "abc123" });
    const raw = localStorage.getItem(SESSION_KEY);
    expect(JSON.parse(raw)).toEqual({ slug: "candice", token: "abc123" });
  });

  it("loadSession returns the saved object", () => {
    saveSession({ slug: "kai", token: "xyz" });
    expect(loadSession()).toEqual({ slug: "kai", token: "xyz" });
  });

  it("loadSession returns null when nothing stored", () => {
    expect(loadSession()).toBeNull();
  });

  it("loadSession returns null for corrupt data", () => {
    localStorage.setItem(SESSION_KEY, "not-json");
    expect(loadSession()).toBeNull();
  });

  it("clearSession removes the key", () => {
    saveSession({ slug: "miles", token: "t" });
    clearSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

Run:
```bash
npm test -- src/lib/session.test.js
```

Expected: all tests fail with "Cannot find module './session.js'" or similar.

- [ ] **Step 3: Implement session.js**

File: `src/lib/session.js`
```js
export const SESSION_KEY = "drbabyyy.session";

export function saveSession({ slug, token }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ slug, token }));
}

export function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.slug === "string" && typeof parsed.token === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run:
```bash
npm test -- src/lib/session.test.js
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.js src/lib/session.test.js
git commit -m "feat: add session localStorage helpers with tests"
```

---

## Task 6 — Convex schema

**Files:**
- Create: `convex/schema.ts`

- [ ] **Step 1: Define the schema**

File: `convex/schema.ts`
```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    slug: v.string(),
    passcodeHash: v.union(v.string(), v.null()),
  }).index("by_slug", ["slug"]),

  answers: defineTable({
    playerSlug: v.string(),
    questionId: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["playerSlug"])
    .index("by_slug_and_question", ["playerSlug", "questionId"]),

  sessions: defineTable({
    playerSlug: v.string(),
    token: v.string(),
    createdAt: v.number(),
  }).index("by_token", ["token"]),
});
```

- [ ] **Step 2: Verify Convex picks up the schema**

With `npx convex dev` still running, Convex pushes the schema. Check the Convex dashboard → Data tab → the three tables appear.

If `convex dev` is not running, run:
```bash
npx convex dev --once
```

Expected: no errors, dashboard shows the three tables.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add players, answers, sessions schema"
```

---

## Task 7 — Convex seed script

**Files:**
- Create: `convex/seed.ts`

- [ ] **Step 1: Write the seed internal mutation**

File: `convex/seed.ts`
```ts
import { internalMutation } from "./_generated/server";

const V1_SLUGS = ["kai", "khari", "candice", "kyanna", "camara", "miles"];

export const seedPlayers = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const slug of V1_SLUGS) {
      const existing = await ctx.db
        .query("players")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!existing) {
        await ctx.db.insert("players", { slug, passcodeHash: null });
      }
    }
  },
});
```

- [ ] **Step 2: Run the seed**

Run:
```bash
npx convex run seed:seedPlayers
```

Expected: 6 player rows appear in the `players` table in the Convex dashboard, all with `passcodeHash: null`.

- [ ] **Step 3: Commit**

```bash
git add convex/seed.ts
git commit -m "feat(convex): add seedPlayers internal mutation and seed v1 players"
```

---

## Task 8 — Install convex-test

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install convex-test**

Run:
```bash
npm install -D convex-test @edge-runtime/vm
```

`@edge-runtime/vm` is required by convex-test for the V8-like runtime simulation.

- [ ] **Step 2: Add a convex test config**

`convex-test` runs tests via vitest. No separate config file is needed, but we extend `vitest.config.js` to include convex tests:

Modify `vitest.config.js`:
```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.js"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

The `server.deps.inline` option is required so `convex-test` is bundled properly for vitest's module resolution.

- [ ] **Step 3: Verify setup by running the full test suite**

Run:
```bash
npm test
```

Expected: all existing tests still pass. convex-test is available for upcoming Convex function tests.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.js
git commit -m "chore: add convex-test for backend function tests"
```

---

## Task 9 — Convex auth.ts: setPasscode action (TDD)

**Files:**
- Create: `convex/auth.ts`
- Create: `convex/auth.test.ts`

- [ ] **Step 1: Write the failing test**

File: `convex/auth.test.ts`
```ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

describe("auth.setPasscode", () => {
  it("sets a passcode for a player with no existing hash and returns a session token", async () => {
    const t = convexTest(schema);
    // Seed one player
    await t.run(async (ctx) => {
      await ctx.db.insert("players", { slug: "candice", passcodeHash: null });
    });

    const result = await t.action(api.auth.setPasscode, {
      slug: "candice",
      passcode: "1234",
    });

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);

    // DB state after
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
```

- [ ] **Step 2: Run and confirm failure**

Run:
```bash
npm test -- convex/auth.test.ts
```

Expected: tests fail because `convex/auth.ts` doesn't exist.

- [ ] **Step 3: Implement convex/auth.ts (partial — just setPasscode)**

File: `convex/auth.ts`
```ts
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

function generateToken(): string {
  // 32 bytes of entropy, base64url-encoded
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// --- Internal helpers (DB operations) ---

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

// --- Public actions ---

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
```

Note: `bcrypt.hash` works in Convex actions (Node.js runtime). The `"use node"` pragma is not required for bcryptjs since it's pure JS, but if Convex complains about module resolution, add `"use node";` as the first line of `auth.ts` — this switches the file to Node runtime.

- [ ] **Step 4: Run the test and confirm it passes**

Run:
```bash
npm test -- convex/auth.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/auth.ts convex/auth.test.ts
git commit -m "feat(convex): add auth.setPasscode action"
```

---

## Task 10 — Convex auth.ts: login action (TDD)

**Files:**
- Modify: `convex/auth.ts`
- Modify: `convex/auth.test.ts`

- [ ] **Step 1: Append tests**

Append to `convex/auth.test.ts`:
```ts
import bcrypt from "bcryptjs";

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
```

- [ ] **Step 2: Run tests and confirm failure**

Run:
```bash
npm test -- convex/auth.test.ts
```

Expected: new tests fail (`api.auth.login` not defined).

- [ ] **Step 3: Add login action + helper to `convex/auth.ts`**

Append to `convex/auth.ts`:
```ts
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
```

- [ ] **Step 4: Run tests and confirm pass**

Run:
```bash
npm test -- convex/auth.test.ts
```

Expected: all login tests pass + previous setPasscode tests still pass.

- [ ] **Step 5: Commit**

```bash
git add convex/auth.ts convex/auth.test.ts
git commit -m "feat(convex): add auth.login action"
```

---

## Task 11 — Convex auth.ts: getSession query + logout mutation (TDD)

**Files:**
- Modify: `convex/auth.ts`
- Modify: `convex/auth.test.ts`

- [ ] **Step 1: Append tests**

Append to `convex/auth.test.ts`:
```ts
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
    // Should not throw.
    await t.mutation(api.auth.logout, { token: "nonexistent" });
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run:
```bash
npm test -- convex/auth.test.ts
```

Expected: new tests fail.

- [ ] **Step 3: Append implementations**

Append to `convex/auth.ts`:
```ts
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
```

- [ ] **Step 4: Run tests and confirm pass**

Run:
```bash
npm test -- convex/auth.test.ts
```

Expected: all auth tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/auth.ts convex/auth.test.ts
git commit -m "feat(convex): add auth.getSession query and auth.logout mutation"
```

---

## Task 12 — Convex admin.ts: resetPasscode (TDD)

**Files:**
- Create: `convex/admin.ts`
- Create: `convex/admin.test.ts`

- [ ] **Step 1: Write the failing test**

File: `convex/admin.test.ts`
```ts
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
      // Only khari's session remains.
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
```

- [ ] **Step 2: Run and confirm failure**

Run:
```bash
npm test -- convex/admin.test.ts
```

Expected: tests fail (module missing).

- [ ] **Step 3: Implement**

File: `convex/admin.ts`
```ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const resetPasscode = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!player) throw new Error("unknown player");

    await ctx.db.patch(player._id, { passcodeHash: null });

    const sessions = await ctx.db
      .query("sessions")
      .collect();
    for (const s of sessions) {
      if (s.playerSlug === slug) {
        await ctx.db.delete(s._id);
      }
    }
  },
});
```

- [ ] **Step 4: Run tests and confirm pass**

Run:
```bash
npm test -- convex/admin.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/admin.ts convex/admin.test.ts
git commit -m "feat(convex): add admin.resetPasscode internal mutation"
```

---

## Task 13 — Convex answers.ts: save + listAll (TDD)

**Files:**
- Create: `convex/answers.ts`
- Create: `convex/answers.test.ts`

- [ ] **Step 1: Write the failing tests**

File: `convex/answers.test.ts`
```ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

async function seedSession(t: ReturnType<typeof convexTest>, slug: string, token: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", {
      playerSlug: slug,
      token,
      createdAt: Date.now(),
    });
  });
}

describe("answers.save", () => {
  it("inserts a new answer for a valid session", async () => {
    const t = convexTest(schema);
    await seedSession(t, "candice", "tok");

    await t.mutation(api.answers.save, {
      token: "tok",
      questionId: "q1",
      text: "Sunshine and cocktails",
    });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("answers").collect();
      expect(rows).toHaveLength(1);
      expect(rows[0].playerSlug).toBe("candice");
      expect(rows[0].questionId).toBe("q1");
      expect(rows[0].text).toBe("Sunshine and cocktails");
    });
  });

  it("upserts (replaces) an existing answer for the same (slug, questionId)", async () => {
    const t = convexTest(schema);
    await seedSession(t, "candice", "tok");

    await t.mutation(api.answers.save, { token: "tok", questionId: "q1", text: "first" });
    await t.mutation(api.answers.save, { token: "tok", questionId: "q1", text: "second" });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("answers").collect();
      expect(rows).toHaveLength(1);
      expect(rows[0].text).toBe("second");
    });
  });

  it("trims text to 280 characters", async () => {
    const t = convexTest(schema);
    await seedSession(t, "miles", "tok");
    const longText = "x".repeat(500);

    await t.mutation(api.answers.save, {
      token: "tok",
      questionId: "q1",
      text: longText,
    });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("answers").collect();
      expect(rows[0].text.length).toBe(280);
    });
  });

  it("rejects save with an invalid session token", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(api.answers.save, { token: "bad", questionId: "q1", text: "x" }),
    ).rejects.toThrow(/invalid session/i);
  });
});

describe("answers.listAll", () => {
  it("returns all answers across players", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("answers", {
        playerSlug: "kai",
        questionId: "q1",
        text: "one",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("answers", {
        playerSlug: "miles",
        questionId: "q2",
        text: "two",
        updatedAt: Date.now(),
      });
    });

    const rows = await t.query(api.answers.listAll, {});
    expect(rows).toHaveLength(2);
    const slugs = rows.map((r) => r.playerSlug).sort();
    expect(slugs).toEqual(["kai", "miles"]);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run:
```bash
npm test -- convex/answers.test.ts
```

Expected: tests fail (module missing).

- [ ] **Step 3: Implement**

File: `convex/answers.ts`
```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_CHARS = 280;

export const save = mutation({
  args: {
    token: v.string(),
    questionId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, { token, questionId, text }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) throw new Error("invalid session");

    const trimmed = text.slice(0, MAX_CHARS);
    const now = Date.now();

    const existing = await ctx.db
      .query("answers")
      .withIndex("by_slug_and_question", (q) =>
        q.eq("playerSlug", session.playerSlug).eq("questionId", questionId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { text: trimmed, updatedAt: now });
    } else {
      await ctx.db.insert("answers", {
        playerSlug: session.playerSlug,
        questionId,
        text: trimmed,
        updatedAt: now,
      });
    }
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("answers").collect();
  },
});
```

- [ ] **Step 4: Run tests and confirm pass**

Run:
```bash
npm test -- convex/answers.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/answers.ts convex/answers.test.ts
git commit -m "feat(convex): add answers.save mutation and answers.listAll query"
```

---

## Task 14 — Frontend Convex client setup

**Files:**
- Create: `src/lib/convex.js`
- Modify: `src/main.jsx`

- [ ] **Step 1: Create the Convex client**

File: `src/lib/convex.js`
```js
import { ConvexReactClient } from "convex/react";

export const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
```

- [ ] **Step 2: Wrap the app with ConvexProvider**

Replace the contents of `src/main.jsx` with:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider } from "convex/react";
import App from "./App.jsx";
import { convex } from "./lib/convex.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>,
);
```

Note: if the existing `src/main.jsx` already does something different, preserve its structure — the key change is wrapping `<App />` with `<ConvexProvider client={convex}>`.

- [ ] **Step 3: Verify the dev server still renders the homepage**

Run:
```bash
npm run dev
```

Open `http://localhost:5173` — the existing site should render unchanged. No Convex queries are fired yet, so no console errors from missing data.

- [ ] **Step 4: Commit**

```bash
git add src/lib/convex.js src/main.jsx
git commit -m "feat: wire ConvexProvider into the app root"
```

---

## Task 15 — Router shell + extract HomePage

**Files:**
- Create: `src/routes/HomePage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create HomePage from current App.jsx contents**

Read the current `src/App.jsx`. Everything that currently renders — the hero, flights section, itinerary, Meet the Players, etc. — moves into `src/routes/HomePage.jsx` as the default export. The imports at the top of `App.jsx` (for constants like `C`, `PLAYERS`, `FLIGHTS`) move to `HomePage.jsx`, swapping those inline definitions for imports from the data modules created in Task 4.

File: `src/routes/HomePage.jsx`
```jsx
// Paste the full current App.jsx body here, but:
//  - Replace `const C = { ... }` with: import { C } from "../data/colors.js";
//  - Replace `const MEMBERS = [...]` + `const FULL_GROUP` with:
//      import { MEMBERS, FULL_GROUP, PLAYERS } from "../data/players.js";
//    (Delete the inline PLAYERS array.)
//  - Replace `const FLIGHTS = [...]` with: import { FLIGHTS } from "../data/flights.js";
//  - Rename the default export from `App` to `HomePage`.
//  - Keep all JSX and helper components in this file for now.
```

Because the existing `App.jsx` is ~1000 lines, this step is a mechanical move. Don't change JSX; just reorganise the imports and swap out the inline data constants.

- [ ] **Step 2: Rewrite App.jsx as a router shell**

Replace the entire contents of `src/App.jsx` with:

```jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./routes/HomePage.jsx";
import PlayerPage from "./routes/PlayerPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/player/:slug" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Temporary placeholder for PlayerPage**

Since the real `PlayerPage` isn't built yet, create a placeholder so the router compiles:

File: `src/routes/PlayerPage.jsx`
```jsx
export default function PlayerPage() {
  return <div style={{ padding: 40 }}>Player page coming soon.</div>;
}
```

- [ ] **Step 4: Verify home page still renders and `/player/candice` hits the placeholder**

Run:
```bash
npm run dev
```

Visit `http://localhost:5173/` — the full existing site renders unchanged.
Visit `http://localhost:5173/player/candice` — the placeholder renders.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/routes/HomePage.jsx src/routes/PlayerPage.jsx
git commit -m "refactor: split App.jsx into HomePage route + router shell; add PlayerPage placeholder"
```

---

## Task 16 — LoginModal component

**Files:**
- Create: `src/components/LoginModal.jsx`

- [ ] **Step 1: Build the modal**

File: `src/components/LoginModal.jsx`
```jsx
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PLAYERS, V1_LOGIN_SLUGS } from "../data/players.js";
import { C } from "../data/colors.js";

const LOGIN_PLAYERS = PLAYERS.filter((p) => V1_LOGIN_SLUGS.includes(p.slug));

export default function LoginModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState("pick"); // "pick" | "first-time" | "returning"
  const [selected, setSelected] = useState(null);
  const [passcode, setPasscode] = useState("");
  const [passcodeConfirm, setPasscodeConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setPasscodeAction = useAction(api.auth.setPasscode);
  const loginAction = useAction(api.auth.login);

  if (!open) return null;

  const handlePickPlayer = async (player) => {
    setSelected(player);
    setError("");
    setBusy(true);
    try {
      // Attempt login with an empty passcode to detect "first-time" path.
      // Simpler: always ask login first with a sentinel, or query whether passcode set.
      // We use a specialised check: try login with "__probe__" and interpret errors.
      // For clarity, use a separate path: peek via login and branch on error message.
      await loginAction({ slug: player.slug, passcode: "__probe__" });
      // If the probe somehow succeeded, treat as returning.
      setStep("returning");
    } catch (err) {
      const msg = String(err?.message ?? err);
      if (/not set/i.test(msg)) {
        setStep("first-time");
      } else {
        setStep("returning");
      }
    } finally {
      setBusy(false);
    }
  };

  const submitFirstTime = async () => {
    setError("");
    if (passcode.length !== 4 || !/^\d{4}$/.test(passcode)) {
      setError("Passcode must be 4 digits.");
      return;
    }
    if (passcode !== passcodeConfirm) {
      setError("Passcodes don't match.");
      return;
    }
    setBusy(true);
    try {
      const { token } = await setPasscodeAction({
        slug: selected.slug,
        passcode,
      });
      onSuccess({ slug: selected.slug, token });
    } catch (err) {
      setError(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  const submitReturning = async () => {
    setError("");
    if (passcode.length !== 4 || !/^\d{4}$/.test(passcode)) {
      setError("Passcode must be 4 digits.");
      return;
    }
    setBusy(true);
    try {
      const { token } = await loginAction({ slug: selected.slug, passcode });
      onSuccess({ slug: selected.slug, token });
    } catch (err) {
      setError("That passcode didn't work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.sand, borderRadius: 20, padding: 32,
          maxWidth: 480, width: "90%",
          fontFamily: "Nunito, sans-serif",
        }}
      >
        {step === "pick" && (
          <>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 24, marginBottom: 16, color: C.dark }}>
              Who are you?
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {LOGIN_PLAYERS.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => handlePickPlayer(p)}
                  disabled={busy}
                  style={{
                    background: p.color, border: "none", borderRadius: 16,
                    padding: 16, cursor: "pointer", color: "white",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontSize: 32 }}>{p.emoji}</div>
                  <div style={{ fontWeight: 800, marginTop: 8 }}>{p.name}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "first-time" && selected && (
          <>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 22, marginBottom: 8, color: C.dark }}>
              Set your passcode, {selected.name}
            </h2>
            <p style={{ color: C.textBody, marginBottom: 16 }}>
              Choose a 4-digit passcode. You'll use this to log in going forward.
            </p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
              placeholder="4 digits"
              style={{ width: "100%", padding: 12, fontSize: 18, borderRadius: 8, border: `2px solid ${C.sandDark}`, marginBottom: 12 }}
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={passcodeConfirm}
              onChange={(e) => setPasscodeConfirm(e.target.value.replace(/\D/g, ""))}
              placeholder="Confirm 4 digits"
              style={{ width: "100%", padding: 12, fontSize: 18, borderRadius: 8, border: `2px solid ${C.sandDark}`, marginBottom: 12 }}
            />
            {error && <div style={{ color: C.coralDeep, marginBottom: 12 }}>{error}</div>}
            <button
              onClick={submitFirstTime}
              disabled={busy}
              style={{ width: "100%", padding: 14, background: selected.color, color: "white", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 16, cursor: "pointer" }}
            >
              {busy ? "Saving…" : "Set passcode & enter"}
            </button>
          </>
        )}

        {step === "returning" && selected && (
          <>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 22, marginBottom: 8, color: C.dark }}>
              Welcome back, {selected.name}
            </h2>
            <p style={{ color: C.textBody, marginBottom: 16 }}>Enter your 4-digit passcode.</p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
              placeholder="4 digits"
              style={{ width: "100%", padding: 12, fontSize: 18, borderRadius: 8, border: `2px solid ${C.sandDark}`, marginBottom: 12 }}
            />
            {error && <div style={{ color: C.coralDeep, marginBottom: 12 }}>{error}</div>}
            <button
              onClick={submitReturning}
              disabled={busy}
              style={{ width: "100%", padding: 14, background: selected.color, color: "white", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 16, cursor: "pointer" }}
            >
              {busy ? "Checking…" : "Enter"}
            </button>
          </>
        )}

        <button
          onClick={onClose}
          style={{ marginTop: 16, background: "transparent", border: "none", color: C.textBody, cursor: "pointer", width: "100%", padding: 8 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

The "probe login" approach in `handlePickPlayer` is a trick to distinguish first-time from returning without adding a new Convex function. `login` throws `"passcode not set"` for unset players; we branch on that. This keeps the backend API tight.

Alternative (cleaner): add a `auth.hasPasscode(slug)` query and use it explicitly. If the probe approach feels too clever during implementation, add that query — see Task 16 optional in-task note.

- [ ] **Step 2: Commit**

```bash
git add src/components/LoginModal.jsx
git commit -m "feat: add LoginModal with avatar picker and passcode flow"
```

---

## Task 17 — Wire login button on HomePage + LoggedInChip

**Files:**
- Create: `src/components/LoggedInChip.jsx`
- Modify: `src/routes/HomePage.jsx`

- [ ] **Step 1: Build the chip**

File: `src/components/LoggedInChip.jsx`
```jsx
import { useNavigate } from "react-router-dom";
import { playerBySlug } from "../data/players.js";
import { C } from "../data/colors.js";
import { clearSession } from "../lib/session.js";

export default function LoggedInChip({ slug, onLogout }) {
  const navigate = useNavigate();
  const player = playerBySlug(slug);
  if (!player) return null;

  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 900,
      background: "white", borderRadius: 999, padding: "8px 14px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      display: "flex", alignItems: "center", gap: 10,
      fontFamily: "Nunito, sans-serif", fontWeight: 800,
    }}>
      <span style={{ fontSize: 20 }}>{player.emoji}</span>
      <button
        onClick={() => navigate(`/player/${player.slug}`)}
        style={{ background: player.color, color: "white", border: "none", padding: "6px 10px", borderRadius: 999, cursor: "pointer", fontWeight: 800 }}
      >
        Go to your page
      </button>
      <button
        onClick={() => {
          clearSession();
          onLogout?.();
        }}
        style={{ background: "transparent", border: "none", color: C.textBody, cursor: "pointer" }}
      >
        Log out
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Wire HomePage login button**

Find the existing "Player Log In" button in `src/routes/HomePage.jsx`. Search for the literal string `Player Log In` (or the closest match — in the current code this is rendered in the welcome section). Replace its `onClick` with an open-modal handler, and add state at the top of the `HomePage` function:

```jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginModal from "../components/LoginModal.jsx";
import LoggedInChip from "../components/LoggedInChip.jsx";
import { saveSession, loadSession } from "../lib/session.js";
// ...existing imports

export default function HomePage() {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [session, setSession] = useState(() => loadSession());

  // ...existing HomePage body...

  return (
    <>
      {/* existing JSX tree — find the "Player Log In" button and replace
          its onClick with: () => setLoginOpen(true) */}

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={({ slug, token }) => {
          saveSession({ slug, token });
          setLoginOpen(false);
          navigate(`/player/${slug}`);
        }}
      />

      {session && (
        <LoggedInChip slug={session.slug} onLogout={() => setSession(null)} />
      )}
    </>
  );
}
```

- [ ] **Step 3: Manual check**

Run `npm run dev`. Visit `/`. Click "Player Log In" → modal opens → pick a player → first-time sets passcode → on submit, redirects to `/player/<slug>` (the placeholder). Refresh `/` → the `LoggedInChip` appears.

- [ ] **Step 4: Commit**

```bash
git add src/components/LoggedInChip.jsx src/routes/HomePage.jsx
git commit -m "feat: wire login modal on home page and show logged-in chip"
```

---

## Task 18 — PlayerPage skeleton + auth gate

**Files:**
- Modify: `src/routes/PlayerPage.jsx`

- [ ] **Step 1: Replace the placeholder with gated skeleton**

File: `src/routes/PlayerPage.jsx`
```jsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { loadSession, clearSession } from "../lib/session.js";
import { playerBySlug, V1_LOGIN_SLUGS } from "../data/players.js";
import { C } from "../data/colors.js";

export default function PlayerPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const session = loadSession();

  const isKnownSlug = V1_LOGIN_SLUGS.includes(slug ?? "");
  const slugMatches = session && session.slug === slug;

  // Always call the hook (React requires hooks to be called unconditionally);
  // pass "skip" when we can't validate to avoid an unnecessary query.
  const serverSession = useQuery(
    api.auth.getSession,
    session && slugMatches ? { token: session.token } : "skip",
  );

  useEffect(() => {
    if (!isKnownSlug) {
      navigate("/", { replace: true });
      return;
    }
    if (!session || !slugMatches) {
      navigate("/", { replace: true });
      return;
    }
    // serverSession === undefined means still loading; null means invalid.
    if (serverSession === null) {
      clearSession();
      navigate("/", { replace: true });
    }
  }, [isKnownSlug, session, slugMatches, serverSession, navigate]);

  if (!isKnownSlug || !session || !slugMatches || serverSession === undefined) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }
  if (serverSession === null) return null; // Redirecting.

  const player = playerBySlug(slug);
  if (!player) return null;

  return (
    <div style={{ background: C.sand, minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Dela Gothic One', sans-serif", color: C.dark }}>
          {player.name}'s Page
        </h1>
        {/* Hero, flights, questions, crew answers — added in following tasks */}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual check**

- Log out: clear localStorage in devtools, visit `/player/candice` → redirect to `/`.
- Log in as Candice → redirects to `/player/candice` → renders the skeleton page.
- Log in as Candice → manually navigate to `/player/kai` → redirect to `/` (session mismatch).
- `/player/nobody` → redirect to `/`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/PlayerPage.jsx
git commit -m "feat: add PlayerPage route with client-side auth gating"
```

---

## Task 19 — PlayerPage: hero + flights blocks

**Files:**
- Modify: `src/routes/PlayerPage.jsx`

- [ ] **Step 1: Add hero and flight rendering**

Inside `PlayerPage.jsx`, replace the `<div style={{ maxWidth: 720, ... }}>` block with:

```jsx
import { flightsForPlayer } from "../data/flights.js";
import { saveSession } from "../lib/session.js"; // if not already imported
import { useMutation } from "convex/react";

// Inside the component, after the guards and before return:
const myFlights = flightsForPlayer(player.name);
const logoutMutation = useMutation(api.auth.logout);

const handleLogout = async () => {
  try { await logoutMutation({ token: session.token }); } catch {}
  clearSession();
  navigate("/", { replace: true });
};

return (
  <div style={{ background: C.sand, minHeight: "100vh", paddingBottom: 80 }}>
    {/* Logout chip (top-right) */}
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 900 }}>
      <button
        onClick={handleLogout}
        style={{ background: "white", border: "none", padding: "8px 14px", borderRadius: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontFamily: "Nunito, sans-serif", fontWeight: 800, cursor: "pointer" }}
      >
        Log out
      </button>
    </div>

    {/* Hero */}
    <section style={{ padding: "60px 20px 40px", textAlign: "center", background: player.color, color: "white" }}>
      <div style={{ fontSize: 96, marginBottom: 12 }}>{player.emoji}</div>
      <h1 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(32px, 8vw, 64px)", margin: 0 }}>{player.name}</h1>
      <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 20, fontWeight: 800, marginTop: 4, opacity: 0.9 }}>{player.title}</div>
      <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, marginTop: 8, opacity: 0.85 }}>{player.role}</div>
      <p style={{ fontFamily: "Nunito, sans-serif", maxWidth: 560, margin: "20px auto 0", lineHeight: 1.6 }}>{player.bio}</p>
    </section>

    {/* Flights */}
    <section style={{ padding: "40px 20px", maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 28, color: C.dark }}>Your flights</h2>
      {myFlights.length === 0 ? (
        <p style={{ color: C.textBody }}>No flights on file.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {myFlights.map((f) => (
            <div key={f.id} style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: player.color, textTransform: "uppercase", letterSpacing: 1, fontSize: 12 }}>{f.type} · {f.date}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <div><div style={{ fontSize: 22, fontWeight: 900 }}>{f.from.code}</div><div style={{ fontSize: 12, color: C.textBody }}>{f.from.city}</div></div>
                <div style={{ flex: 1, textAlign: "center", color: C.textBody, fontSize: 12 }}>→ {f.duration}{f.stops ? ` · via ${f.stopCity}` : ""}</div>
                <div><div style={{ fontSize: 22, fontWeight: 900 }}>{f.to.code}</div><div style={{ fontSize: 12, color: C.textBody }}>{f.to.city}</div></div>
              </div>
              <div style={{ fontSize: 12, color: C.textBody, marginTop: 8 }}>{f.depart} → {f.arrive} · {f.flight} · {f.aircraft}</div>
            </div>
          ))}
        </div>
      )}
    </section>

    {/* Questions + crew answers added in later tasks */}
  </div>
);
```

- [ ] **Step 2: Manual check**

Log in as Candice → `/player/candice` shows hero + her 2 flights (outbound 18 May, return 25 May). Log out → redirected to `/`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/PlayerPage.jsx
git commit -m "feat: PlayerPage hero + flights blocks + logout"
```

---

## Task 20 — QuestionBlock component

**Files:**
- Create: `src/components/QuestionBlock.jsx`

- [ ] **Step 1: Build the component**

File: `src/components/QuestionBlock.jsx`
```jsx
import { useState } from "react";
import { ANSWER_MAX_CHARS } from "../data/questions.js";
import { C } from "../data/colors.js";

export default function QuestionBlock({ prompt, answer, readOnly, color, onSave }) {
  const [editing, setEditing] = useState(!answer && !readOnly);
  const [text, setText] = useState(answer ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(text.slice(0, ANSWER_MAX_CHARS));
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setText(answer ?? "");
    setEditing(false);
  };

  return (
    <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: color ?? C.dark, marginBottom: 8 }}>
        {prompt}
      </div>

      {readOnly ? (
        <div style={{ fontFamily: "Nunito, sans-serif", color: answer ? C.textBody : "#aaa", whiteSpace: "pre-wrap" }}>
          {answer || "— no answer yet —"}
        </div>
      ) : editing ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, ANSWER_MAX_CHARS))}
            rows={3}
            style={{ width: "100%", padding: 10, fontFamily: "Nunito, sans-serif", fontSize: 14, borderRadius: 8, border: `2px solid ${C.sandDark}`, resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 12, color: C.textBody }}>{text.length}/{ANSWER_MAX_CHARS}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {answer && (
                <button onClick={cancel} disabled={busy} style={{ background: "transparent", border: "none", color: C.textBody, cursor: "pointer" }}>
                  Cancel
                </button>
              )}
              <button
                onClick={save}
                disabled={busy || text.trim().length === 0}
                style={{ background: color ?? C.dark, color: "white", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ color: C.textBody, whiteSpace: "pre-wrap" }}>{answer}</div>
          <button
            onClick={() => setEditing(true)}
            style={{ marginTop: 8, background: "transparent", border: "none", color: color ?? C.blue, cursor: "pointer", fontWeight: 700, padding: 0 }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuestionBlock.jsx
git commit -m "feat: add QuestionBlock component with edit/read-only modes"
```

---

## Task 21 — PlayerPage: questions section

**Files:**
- Modify: `src/routes/PlayerPage.jsx`

- [ ] **Step 1: Integrate questions + Convex**

In `src/routes/PlayerPage.jsx`, add these imports at the top:

```jsx
import { useMutation, useQuery } from "convex/react";
import QuestionBlock from "../components/QuestionBlock.jsx";
import { QUESTIONS } from "../data/questions.js";
```

Inside the component (after `myFlights` / `logoutMutation`):

```jsx
const allAnswers = useQuery(api.answers.listAll) ?? [];
const saveAnswerMutation = useMutation(api.answers.save);

const myAnswers = Object.fromEntries(
  allAnswers
    .filter((a) => a.playerSlug === slug)
    .map((a) => [a.questionId, a.text]),
);

const saveAnswer = async (questionId, text) => {
  await saveAnswerMutation({ token: session.token, questionId, text });
};
```

Add the questions section below the flights `<section>`:

```jsx
<section style={{ padding: "20px 20px 40px", maxWidth: 720, margin: "0 auto" }}>
  <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 28, color: C.dark }}>Pre-trip questions</h2>
  <p style={{ color: C.textBody, fontFamily: "Nunito, sans-serif" }}>Answer each one. Your crew will see these on their own pages.</p>
  <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
    {QUESTIONS.map((q) => (
      <QuestionBlock
        key={q.id}
        prompt={q.prompt}
        answer={myAnswers[q.id]}
        color={player.color}
        onSave={(text) => saveAnswer(q.id, text)}
      />
    ))}
  </div>
</section>
```

- [ ] **Step 2: Manual check**

Log in → see 5 unanswered questions. Fill one in → "Save" → refresh → answer persists. Real-time: open `/player/candice` in one window and the same URL in another (same session from localStorage) — edit in one, see it update in the other without refresh.

- [ ] **Step 3: Commit**

```bash
git add src/routes/PlayerPage.jsx
git commit -m "feat: add pre-trip questions section to PlayerPage"
```

---

## Task 22 — CrewAnswersPanel component

**Files:**
- Create: `src/components/CrewAnswersPanel.jsx`
- Modify: `src/routes/PlayerPage.jsx`

- [ ] **Step 1: Build CrewAnswersPanel**

File: `src/components/CrewAnswersPanel.jsx`
```jsx
import { useState } from "react";
import { PLAYERS, V1_LOGIN_SLUGS } from "../data/players.js";
import { QUESTIONS } from "../data/questions.js";
import QuestionBlock from "./QuestionBlock.jsx";
import { C } from "../data/colors.js";

export default function CrewAnswersPanel({ mySlug, allAnswers }) {
  const [expandedSlug, setExpandedSlug] = useState(null);

  const crew = PLAYERS.filter(
    (p) => V1_LOGIN_SLUGS.includes(p.slug) && p.slug !== mySlug,
  );

  const answersFor = (slug) =>
    Object.fromEntries(
      allAnswers.filter((a) => a.playerSlug === slug).map((a) => [a.questionId, a.text]),
    );

  return (
    <section style={{ padding: "20px 20px 60px", maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 28, color: C.dark }}>The crew's answers</h2>
      <p style={{ color: C.textBody, fontFamily: "Nunito, sans-serif" }}>Tap a player to see what they said.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        {crew.map((p) => (
          <button
            key={p.slug}
            onClick={() => setExpandedSlug(expandedSlug === p.slug ? null : p.slug)}
            style={{
              background: expandedSlug === p.slug ? p.color : "white",
              color: expandedSlug === p.slug ? "white" : C.dark,
              border: "none", borderRadius: 999, padding: "8px 14px",
              fontFamily: "Nunito, sans-serif", fontWeight: 800, cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            }}
          >
            <span style={{ fontSize: 18, marginRight: 6 }}>{p.emoji}</span>
            {p.name}
          </button>
        ))}
      </div>

      {expandedSlug && (() => {
        const p = crew.find((c) => c.slug === expandedSlug);
        const answers = answersFor(expandedSlug);
        return (
          <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
            {QUESTIONS.map((q) => (
              <QuestionBlock
                key={q.id}
                prompt={q.prompt}
                answer={answers[q.id]}
                readOnly
                color={p.color}
              />
            ))}
          </div>
        );
      })()}
    </section>
  );
}
```

- [ ] **Step 2: Mount on PlayerPage**

In `src/routes/PlayerPage.jsx`, add the import and render the panel after the questions section:

```jsx
import CrewAnswersPanel from "../components/CrewAnswersPanel.jsx";

// ...inside JSX, after the questions <section>:
<CrewAnswersPanel mySlug={slug} allAnswers={allAnswers} />
```

- [ ] **Step 3: Manual check**

Log in as Candice, answer a question. In a separate incognito window, log in as Kai and answer a different question. Back in Candice's window, scroll to "The crew's answers", tap Kai → his answer appears. Live-updates work (Convex reactivity).

- [ ] **Step 4: Commit**

```bash
git add src/components/CrewAnswersPanel.jsx src/routes/PlayerPage.jsx
git commit -m "feat: add CrewAnswersPanel on PlayerPage"
```

---

## Task 23 — Admin passcode reset docs

**Files:**
- Create: `docs/admin/reset-passcode.md`

- [ ] **Step 1: Document the reset flow**

File: `docs/admin/reset-passcode.md`
```markdown
# Resetting a player's passcode

Run from the project root:

```bash
npx convex run admin:resetPasscode '{"slug":"<slug>"}'
```

Example — reset Candice:

```bash
npx convex run admin:resetPasscode '{"slug":"candice"}'
```

Effects:
- Clears the player's `passcodeHash` (sets it to `null`)
- Deletes all session rows for that player

After running, tell the player to visit the site, click "Player Log In", pick their avatar, and set a new 4-digit passcode. Any other devices they were signed in on will be logged out on their next request (session token no longer valid).

To run against the production deployment instead of dev, prefix with `--prod`:

```bash
npx convex run --prod admin:resetPasscode '{"slug":"candice"}'
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/admin/reset-passcode.md
git commit -m "docs: add admin reset-passcode runbook"
```

---

## Task 24 — Deploy to Vercel + Convex production

**Files:**
- (No repo files — Vercel dashboard + Convex dashboard changes)

- [ ] **Step 1: Deploy Convex to production**

Run:
```bash
npx convex deploy
```

This creates a production Convex deployment (separate from dev). It prints the production URL — save it (looks like `https://<name>.convex.cloud`).

- [ ] **Step 2: Seed production players**

Run:
```bash
npx convex run --prod seed:seedPlayers
```

Expected: 6 player rows seeded in the production `players` table. No duplicates if rerun (seed is idempotent).

- [ ] **Step 3: Add env var to Vercel**

In the Vercel dashboard → project `dr-babyyy` → Settings → Environment Variables:
- Add `VITE_CONVEX_URL` = the production URL from Step 1
- Apply to: Production, Preview, Development

- [ ] **Step 4: Trigger a Vercel deployment**

Push to `main`:
```bash
git push
```

Vercel rebuilds. Once done, visit `https://dr-babyyy.vercel.app/` — login flow works against the production Convex deployment.

- [ ] **Step 5: Smoke test each player**

Manually:
1. Open the site, pick Candice, set passcode `1234`.
2. Confirm redirect to `/player/candice`.
3. Answer all 5 questions.
4. Open the crew answers panel — empty for now, that's fine.
5. Log out → back to `/`.
6. Repeat for the other 5 slugs (Kai, Khari, Kyanna, Camara, Miles) — ideally ask each person to set their own passcode, not you.

- [ ] **Step 6: Commit any final fixes**

If Step 5 surfaces bugs, fix, commit, redeploy.

---

## Task 25 — Update Memory

**Files:**
- Update auto-memory so future sessions know the player-login stack

- [ ] **Step 1: Add a project memory**

Create (or update) a memory file capturing:
- Convex is the backend for player login + answers.
- Seed command: `npx convex run seed:seedPlayers`.
- Reset command path: `docs/admin/reset-passcode.md`.
- V1 players and that Ebony is excluded until confirmed.

Add a pointer line to `MEMORY.md`.

- [ ] **Step 2: No commit needed**

Memory lives outside the repo.

---

## Out of scope in this plan

Captured in the spec's "future work" list. Tracked here for context only:
- Adventure map voting (separate spec + plan)
- Photo uploads / custom caricatures
- Holiday games leaderboard
- "Who's most likely to…" polls
- Per-player hotel room photos
- Adding Ebony to the login picker (trivial follow-up: add her slug to `V1_LOGIN_SLUGS` + run seed)

---

## Plan self-review

**Spec coverage:**
- Passcode gate with self-set on first visit → Tasks 9, 10, 16.
- Private `/player/<slug>` pages gated by session + matching slug → Tasks 15, 18.
- Hero / flights / questions / crew answers → Tasks 19, 21, 22.
- Convex schema (players, answers, sessions) → Task 6.
- bcrypt passcode hashing in actions → Tasks 9, 10.
- Admin reset path → Tasks 12, 23.
- Vercel SPA rewrite → Task 2.
- No changes to the public home page content → HomePage task (15) only moves data imports + adds a modal toggle to the existing login button.
- Deployment + env wiring → Task 24.

**Placeholder scan:** none detected. Each code step has full content.

**Type consistency:** `slug` is the canonical identifier throughout (Convex tables, session data, URL param, data module). Convex function names match between test files and implementations. `token` is a string end-to-end.
