# Board Player Drill-Down — Implementation Plan (Bundle C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tap any player row on the Board to open a BottomSheet showing that player's claims, vouches received, and fouls. Scoped to the active tab (Today vs Holiday). Read-only in v1.

**Architecture:** One new Convex query in `convex/players.ts` aggregates a player's entries + vouches received. One new React component `PlayerDayDrawer` (a thin wrapper around the existing `BottomSheet` primitive) renders the data. `LeaderboardPage` tracks which player is open and what `dailyKey` to scope to.

**Tech Stack:** Convex (query + tests via `convex-test`), React 18, Vite. No new deps.

**Reference:** Spec at `docs/superpowers/specs/2026-05-20-board-overhaul-design.md` §5.2. This is **Bundle C** of five (Polish ✅ → Row ✅ → **Drill-down** → Rollover + Flow State rewrite → Wheel preview). The Flow State wins stat (spec §5.4) is intentionally **deferred** to Bundle D, when that data model exists.

---

## File Structure

**Created:**
- `convex/players.test.ts` (currently doesn't exist — `players.ts` has no tests)
- `src/components/PlayerDayDrawer.jsx` — new component

**Modified:**
- `convex/players.ts` — add `getPlayerDay` query
- `src/routes/LeaderboardPage.jsx` — drawer state, `onTap` on `BoardRow`, render the drawer

**Untouched but worth knowing:**
- `convex/schema.ts` — `entries.by_subject` and `entries.by_subject_and_daily_key` indexes already exist
- `convex/_seedData/challenges.ts` — exports `NEGATIVE_POINTS_CONST` used to resolve foul labels
- `src/data/scavenger.js` — exports `itemById` (aliased as `scavengerItemById` per the convention in `convex/entries.ts`) used to resolve scavenger labels
- `src/components/primitives/BottomSheet.jsx` — already handles ESC + backdrop dismiss; we wrap it

---

## Task 1: Add `players.getPlayerDay` Convex query

**Files:**
- Create: `convex/players.test.ts`
- Modify: `convex/players.ts` (append new exports)

**Context:** The drill-down needs a single query that returns everything for one player's day (or trip). Three derived structures: `claims` (challenge + scavenger entries), `fouls` (negative-type entries), and `vouchedBy` (a record of voucher-slug → count for vouches **on this player's non-disputed entries**). Labels and scavenger photo URLs are resolved server-side so the client doesn't have to re-query challenges/scavenger items.

- [ ] **Step 1: Write the first failing test**

Create `convex/players.test.ts` with this content:

```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedSession(t: ReturnType<typeof convexTest>, slug: string, token: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token, createdAt: Date.now() });
  });
}

describe("players.getPlayerDay", () => {
  it("returns scoped claims, fouls, and vouches for the dailyKey", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");
    await seedSession(t, "khari", "tok-khari");

    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "sing-in-public",
        title: "Sing in Public",
        icon: "🎤",
        points: 15,
        category: "wild",
        difficulty: "wild",
        status: "active",
      });
      // kai claims on day-1 (verified)
      const e1 = await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "sing-in-public",
        points: 15, status: "verified", vouchCount: 1, disputeCount: 0,
        dailyKey: "day-1", createdAt: 100,
      });
      // kai fouled on day-1
      await ctx.db.insert("entries", {
        type: "negative", subjectSlug: "kai", appliedBySlug: "khari",
        negativeId: "throw-up", points: -50,
        status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: 200,
      });
      // kai claims on day-2 (different day, should be excluded)
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "sing-in-public",
        points: 15, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-2", createdAt: 300,
      });
      // khari vouches kai's day-1 claim
      await ctx.db.insert("entryReactions", {
        entryId: e1, playerSlug: "khari", reaction: "vouch", at: 150,
      });
    });

    const data = await t.query(api.players.getPlayerDay, {
      slug: "kai", dailyKey: "day-1",
    });

    expect(data.claims).toHaveLength(1);
    expect(data.claims[0].label).toBe("Sing in Public");
    expect(data.claims[0].labelIcon).toBe("🎤");
    expect(data.claims[0].status).toBe("verified");
    expect(data.fouls).toHaveLength(1);
    expect(data.fouls[0].label).toBe("Throwing up");
    expect(data.fouls[0].points).toBe(-50);
    expect(data.vouchedBy).toEqual({ khari: 1 });
  });

  it("returns all-time data when dailyKey is omitted", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");

    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "x", title: "X", icon: "X", points: 10,
        category: "wild", difficulty: "wild", status: "active",
      });
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-1", createdAt: 100,
      });
      await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "active", vouchCount: 0, disputeCount: 0,
        dailyKey: "day-2", createdAt: 200,
      });
    });

    const data = await t.query(api.players.getPlayerDay, { slug: "kai" });
    expect(data.claims).toHaveLength(2);
  });

  it("excludes disputed entries from the vouchedBy tally", async () => {
    const t = convexTest(schema);
    await seedSession(t, "kai", "tok-kai");

    await t.run(async (ctx) => {
      await ctx.db.insert("challenges", {
        challengeId: "x", title: "X", icon: "X", points: 10,
        category: "wild", difficulty: "wild", status: "active",
      });
      const e = await ctx.db.insert("entries", {
        type: "challenge", subjectSlug: "kai", challengeId: "x",
        points: 10, status: "disputed", vouchCount: 1, disputeCount: 2,
        dailyKey: "day-1", createdAt: 100,
      });
      await ctx.db.insert("entryReactions", {
        entryId: e, playerSlug: "khari", reaction: "vouch", at: 150,
      });
    });

    const data = await t.query(api.players.getPlayerDay, { slug: "kai", dailyKey: "day-1" });
    expect(data.claims).toHaveLength(1);
    expect(data.claims[0].status).toBe("disputed");
    expect(data.vouchedBy).toEqual({}); // vouch on a disputed entry doesn't count
  });
});
```

The test references `negativeId: "throw-up"` with the expected `action` "Throwing up" — that's the actual entry in `NEGATIVE_POINTS_CONST`. If the implementer needs to confirm the label, they can `grep -n "throw-up" convex/_seedData/challenges.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/players.test.ts`
Expected: FAIL — `api.players.getPlayerDay` doesn't exist yet.

- [ ] **Step 3: Add the query to `convex/players.ts`**

Open `convex/players.ts`. At the top of the file, **after the existing line** `import { mutation, query } from "./_generated/server";`, the following imports may not exist yet — add them:

```ts
import { NEGATIVE_POINTS_CONST } from "./_seedData/challenges";
import { itemById as scavengerItemById } from "../src/data/scavenger.js";
```

At the end of the file (after the existing `myRoomNumber` export), append:

```ts
export const getPlayerDay = query({
  args: {
    slug: v.string(),
    dailyKey: v.optional(v.string()),
  },
  handler: async (ctx, { slug, dailyKey }) => {
    const entriesQuery = dailyKey
      ? ctx.db
          .query("entries")
          .withIndex("by_subject_and_daily_key", (q) =>
            q.eq("subjectSlug", slug).eq("dailyKey", dailyKey),
          )
      : ctx.db
          .query("entries")
          .withIndex("by_subject", (q) => q.eq("subjectSlug", slug));

    const entries = await entriesQuery.collect();
    entries.sort((a, b) => a.createdAt - b.createdAt);

    const challenges = await ctx.db.query("challenges").collect();
    const challengeMap = new Map(challenges.map((c) => [c.challengeId, c]));

    const items = await Promise.all(
      entries.map(async (e) => {
        let label = "";
        let labelIcon = "";
        let photoUrl: string | null = null;
        if (e.type === "challenge" && e.challengeId) {
          const c = challengeMap.get(e.challengeId);
          label = c?.title ?? e.challengeId;
          labelIcon = c?.icon ?? "";
        } else if (e.type === "scavenger" && e.scavengerItemId) {
          const item = scavengerItemById(e.scavengerItemId);
          label = item?.name ?? e.scavengerItemId;
          labelIcon = item?.icon ?? "";
          if (e.photoStorageId) {
            photoUrl = await ctx.storage.getUrl(e.photoStorageId);
          }
        } else if (e.type === "negative" && e.negativeId) {
          const def = NEGATIVE_POINTS_CONST.find((n) => n.negativeId === e.negativeId);
          label = def?.action ?? e.negativeId;
          labelIcon = def?.icon ?? "";
        }
        return {
          entryId: e._id,
          type: e.type,
          label,
          labelIcon,
          photoUrl,
          points: e.points,
          status: e.status,
          createdAt: e.createdAt,
        };
      }),
    );

    const claims = items.filter((i) => i.type !== "negative");
    const fouls = items.filter((i) => i.type === "negative");

    // Vouches received — only count vouches on non-disputed entries.
    const activeEntryIds = entries
      .filter((e) => e.status !== "disputed")
      .map((e) => e._id);

    const vouchedBy: Record<string, number> = {};
    for (const entryId of activeEntryIds) {
      const reactions = await ctx.db
        .query("entryReactions")
        .withIndex("by_entry", (q) => q.eq("entryId", entryId))
        .collect();
      for (const r of reactions) {
        if (r.reaction === "vouch") {
          vouchedBy[r.playerSlug] = (vouchedBy[r.playerSlug] ?? 0) + 1;
        }
      }
    }

    return { claims, fouls, vouchedBy };
  },
});
```

- [ ] **Step 4: Run tests to verify they all pass**

Run: `npx vitest run convex/players.test.ts`
Expected: all 3 tests pass.

Then run the full suite to confirm no regressions:

Run: `npm test`
Expected: 137/137 tests pass (134 pre-existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add convex/players.ts convex/players.test.ts
git commit -m "$(cat <<'EOF'
feat(players): getPlayerDay query for drill-down sheet

Returns a player's claims (challenge + scavenger), fouls
(negative-type entries), and a vouchedBy tally derived from
non-disputed entries. Scoped by dailyKey when provided,
otherwise all-time. Labels and scavenger photo URLs are
resolved server-side.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Build `PlayerDayDrawer` component

**Files:**
- Create: `src/components/PlayerDayDrawer.jsx`

**Context:** A thin wrapper around `BottomSheet` that fetches and renders one player's day. Three sections: Claims, Received, Fouls. Header has the player's avatar + holiday name + day label. Read-only — no mutation actions.

- [ ] **Step 1: Create the file**

Create `src/components/PlayerDayDrawer.jsx`:

```jsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PLAYERS } from "../data/players.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import { C } from "../data/colors.js";
import { RADIUS, HEADING, BODY, MICRO_LABEL } from "../data/design.js";
import BottomSheet from "./primitives/BottomSheet.jsx";
import Avatar from "./primitives/Avatar.jsx";

function playerBySlug(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

function SectionTitle({ children }) {
  return (
    <div style={{
      ...MICRO_LABEL,
      color: C.textBody,
      marginTop: 18,
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function EmptyRow({ children }) {
  return (
    <div style={{
      fontFamily: "Nunito, sans-serif",
      fontSize: 13,
      color: C.textBody,
      padding: "8px 0",
    }}>
      {children}
    </div>
  );
}

function ClaimRow({ claim }) {
  const statusLabel = claim.status === "verified"
    ? "verified"
    : claim.status === "disputed"
    ? "rejected"
    : "pending";
  const statusColor = claim.status === "verified"
    ? C.green
    : claim.status === "disputed"
    ? C.coralDeep
    : C.textBody;
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 0",
      borderBottom: `1px solid ${C.sandDark}`,
      opacity: claim.status === "disputed" ? 0.55 : 1,
    }}>
      <div style={{
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 14,
        color: claim.points >= 0 ? C.green : C.coralDeep,
        minWidth: 36,
      }}>
        {claim.points >= 0 ? "+" : ""}{claim.points}
      </div>
      {claim.photoUrl ? (
        <img
          src={claim.photoUrl}
          alt=""
          style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }}
        />
      ) : (
        <div style={{ fontSize: 18 }}>{claim.labelIcon}</div>
      )}
      <div style={{
        flex: 1,
        fontFamily: "Nunito, sans-serif",
        fontSize: 13,
        color: C.dark,
        textDecoration: claim.status === "disputed" ? "line-through" : "none",
      }}>
        {claim.label}
      </div>
      <div style={{
        fontFamily: "Nunito, sans-serif",
        fontWeight: 700,
        fontSize: 11,
        color: statusColor,
        textTransform: "lowercase",
      }}>
        {statusLabel}
      </div>
    </div>
  );
}

export default function PlayerDayDrawer({ open, slug, dailyKey, dayLabel, onClose }) {
  const data = useQuery(
    api.players.getPlayerDay,
    open && slug ? { slug, dailyKey } : "skip",
  );
  const holidayMap = useHolidayNameMap();

  if (!open || !slug) {
    return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;
  }

  const player = playerBySlug(slug);
  const name = displayName(slug, holidayMap, player?.name);
  const loading = data === undefined;
  const vouchEntries = data
    ? Object.entries(data.vouchedBy).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 4,
      }}>
        {player && <Avatar player={player} size="md" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            ...HEADING.h3,
            color: C.dark,
            margin: 0,
          }}>
            {name}
          </div>
          {dayLabel && (
            <div style={{
              ...MICRO_LABEL,
              color: C.textBody,
              marginTop: 4,
            }}>
              {dayLabel}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ ...BODY, textAlign: "center", padding: 24 }}>
          Loading…
        </div>
      ) : (
        <>
          <SectionTitle>Claims</SectionTitle>
          {data.claims.length === 0 ? (
            <EmptyRow>No claims {dailyKey ? "today" : "yet"}.</EmptyRow>
          ) : (
            data.claims.map((c) => <ClaimRow key={c.entryId} claim={c} />)
          )}

          <SectionTitle>Vouches received</SectionTitle>
          {vouchEntries.length === 0 ? (
            <EmptyRow>No vouches yet.</EmptyRow>
          ) : (
            vouchEntries.map(([voucherSlug, count]) => (
              <div key={voucherSlug} style={{
                fontFamily: "Nunito, sans-serif",
                fontSize: 13,
                color: C.dark,
                padding: "6px 0",
                borderBottom: `1px solid ${C.sandDark}`,
              }}>
                <strong>{displayName(voucherSlug, holidayMap)}</strong>
                {" "}× {count}
              </div>
            ))
          )}

          <SectionTitle>Fouls</SectionTitle>
          {data.fouls.length === 0 ? (
            <EmptyRow>No fouls {dailyKey ? "today" : "yet"}.</EmptyRow>
          ) : (
            data.fouls.map((f) => <ClaimRow key={f.entryId} claim={f} />)
          )}
        </>
      )}
    </BottomSheet>
  );
}
```

Notes:
- `useQuery(..., open && slug ? args : "skip")` keeps the Convex subscription idle until the drawer actually needs the data
- `ClaimRow` is reused for both claims and fouls — the points colour does the right thing because fouls are negative
- The component renders an empty closed `BottomSheet` when not open, so the parent doesn't need to mount/unmount it (matches the pattern used elsewhere)
- The `dayLabel` prop is just a string ("Day 1", "All time", etc.) — set by the caller

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds. Bundle grows by ~2 KB.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayerDayDrawer.jsx
git commit -m "$(cat <<'EOF'
feat(drilldown): add PlayerDayDrawer component

Read-only BottomSheet showing one player's claims, vouches
received, and fouls. Scoped by dailyKey or all-time. Reuses
the existing BottomSheet primitive and Convex live query
patterns. Wired to LeaderboardPage in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wire row taps on the Board → open the drawer

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

**Context:** Make `BoardRow` tappable. Add `drawerSlug` state on `LeaderboardPage`. Tapping a row sets `drawerSlug` to that row's slug. The drawer reads its scope from the active tab: Today → `currentDailyKey`, Holiday → `undefined` (all-time). The Foul button's existing onClick needs `stopPropagation` so it doesn't bubble to the row tap.

- [ ] **Step 1: Add `PlayerDayDrawer` import**

In `src/routes/LeaderboardPage.jsx`, find the existing import block. Add (alongside the other component imports):

```jsx
import PlayerDayDrawer from "../components/PlayerDayDrawer.jsx";
```

- [ ] **Step 2: Add drawer state inside the page component**

Find the existing state declarations near the top of `LeaderboardPage`. Right after the `endDayPending` state line (or wherever the last `useState` is), add:

```jsx
  const [drawerSlug, setDrawerSlug] = useState(null);
```

(Only one piece of state — the drawer's open state is `drawerSlug !== null`, and the scope is derived from the active tab plus `currentDailyKey`.)

- [ ] **Step 3: Extend `BoardRow` to accept and use `onTap`**

Find the existing `BoardRow` signature (post-Bundle B Task 2):

```jsx
function BoardRow({ row, rank, onFoul, isMe, isLast, holidayMap, isZero }) {
```

Replace with:

```jsx
function BoardRow({ row, rank, onFoul, isMe, isLast, holidayMap, isZero, onTap }) {
```

Find the outer wrapper `<div>` inside `BoardRow`. The wrapper currently reads (post-Bundle B):

```jsx
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderBottom: isLast ? undefined : `1px solid ${C.sandDark}`,
      background: isMe ? `${p?.color ?? C.coral}08` : "transparent",
      opacity: isZero ? 0.55 : 1,
    }}>
```

Replace with:

```jsx
    <div
      onClick={onTap ? () => onTap(row.slug) : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        borderBottom: isLast ? undefined : `1px solid ${C.sandDark}`,
        background: isMe ? `${p?.color ?? C.coral}08` : "transparent",
        opacity: isZero ? 0.55 : 1,
        cursor: onTap ? "pointer" : "default",
      }}
    >
```

`cursor: pointer` gives the row affordance on desktop; mobile users get the same tap behaviour regardless of cursor.

- [ ] **Step 4: Stop the Foul button click from bubbling to the row**

Find the existing Foul button `onClick` (post-Bundle A Task 3, with the Bundle B Task 1 displayName change):

```jsx
          onClick={() => onFoul({ slug: row.slug, name: displayName(row.slug, holidayMap, p?.name) })}
```

Replace with:

```jsx
          onClick={(e) => {
            e.stopPropagation();
            onFoul({ slug: row.slug, name: displayName(row.slug, holidayMap, p?.name) });
          }}
```

Without `stopPropagation`, tapping Foul would ALSO open the drill-down drawer because the row's `onClick` would fire on bubble. This change keeps the two interactions separate.

- [ ] **Step 5: Pass `onTap` at the call site**

Find the existing `rows.map(...)` block (post-Bundle B). The call site reads:

```jsx
              rows.map((row, i) => (
                <BoardRow
                  key={row.slug}
                  row={row}
                  rank={i + 1}
                  isMe={session?.slug === row.slug}
                  isLast={i === rows.length - 1}
                  holidayMap={holidayMap}
                  isZero={!!row.isZero}
                  onFoul={handleFoul && row.slug !== session?.slug ? handleFoul : null}
                />
              ))
```

Replace with:

```jsx
              rows.map((row, i) => (
                <BoardRow
                  key={row.slug}
                  row={row}
                  rank={i + 1}
                  isMe={session?.slug === row.slug}
                  isLast={i === rows.length - 1}
                  holidayMap={holidayMap}
                  isZero={!!row.isZero}
                  onTap={setDrawerSlug}
                  onFoul={handleFoul && row.slug !== session?.slug ? handleFoul : null}
                />
              ))
```

`setDrawerSlug` is a function that accepts a slug — `BoardRow`'s `onTap(row.slug)` call passes it through directly.

- [ ] **Step 6: Render the drawer at the bottom of the page**

Find the existing `<EndDayTakeover>` JSX block near the bottom of the return statement. Just BEFORE it (or just after, either way works), add:

```jsx
      <PlayerDayDrawer
        open={drawerSlug !== null}
        slug={drawerSlug}
        dailyKey={tab === "daily" ? currentDailyKey : undefined}
        dayLabel={tab === "daily" ? (gamesLive ? `Day ${currentDayNumber}` : "Pre-trip") : "Holiday total"}
        onClose={() => setDrawerSlug(null)}
      />
```

The drawer is positioned in the overlay layer (z-index from `BottomSheet` = 150). It sits below `EndDayTakeover` (z-index 950) by design — if the takeover is open, the drawer underneath it is functionally hidden.

- [ ] **Step 7: Verify build + tests**

Run: `npm run build && npm test`
Expected: Build succeeds; all 137 tests pass (134 from before this bundle + 3 from Task 1).

- [ ] **Step 8: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
feat(board): wire row taps to the PlayerDayDrawer

Tapping a player row opens a BottomSheet with their claims,
vouches received, and fouls — scoped by tab (Today vs Holiday).
Foul button gets stopPropagation so the two interactions stay
separate. cursor: pointer on the row signals the affordance.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review summary (run after all 3 tasks ship)

After Task 3 commits:

- [ ] **Build clean:** `npm run build` succeeds, bundle ~470 KB
- [ ] **Tests green:** `npm test` shows 137/137
- [ ] **Visual smoke (optional):** `npm run dev`, log in, tap any player row on the Today tab. Drawer slides up showing that player's day. Tap your own row — your claims and fouls. Tap a zero-score crew member — empty sections. Switch to Holiday tab, tap a row — drawer shows trip totals. Tap Foul on a non-self row — modal opens, drawer does NOT (event bubble correctly stopped).

---

## After this bundle ships

Bundle D (Rollover + Flow State combined) is next. Significant work: schema migrations (`closedAt` on rollovers, `flowVotes` table, `entries.type` += `flowWin`, new `flowWinnerSlug`/`flowTieCandidates`/`flowResolvedAt`/`flowForcedClose` fields), `lockDay`/`advance` mutation split, server-side forfeit picking, `WheelOfFortune` accepting a target, the FlowStateVoteCard on the Board, the takeover gaining a crown stage, /admin gaining tie-break + force-close. The plan for that bundle will incorporate the flow-state spec ambiguities (defaults: empty days still open voting, flowWin invisible in live feed, takeover dismissable once wheel result is shown).

A separate plan doc will follow.
