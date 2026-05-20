# Board Polish Sweep — Implementation Plan (Bundle A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the 5 polish items from §5.9 of the Board Overhaul spec — skip unnecessary query, loading skeleton, foul tap target, last-row border, `useMemo` for history. Each shipped as its own commit. No design changes, no behaviour changes beyond perceived smoothness.

**Architecture:** All changes live in a single file (`src/routes/LeaderboardPage.jsx`). One existing component (`BoardRow`) gains an `isLast` prop and a bigger Foul button. A small new skeleton renderer is added inside the same file (no separate component file — the skeleton is the size of a few inline divs).

**Tech Stack:** React 18, Convex live queries, Vite. No new deps.

**Reference:** Spec at `docs/superpowers/specs/2026-05-20-board-overhaul-design.md` §5.9. This is **Bundle A** of five (Polish → Row → Drill-down → Rollover rewrite → Wheel preview).

---

## File Structure

**Modified (only this file):**
- `src/routes/LeaderboardPage.jsx`

All five items touch the same file. No new files. No tests added — this codebase doesn't have React component tests (`src/lib/*.test.js` are utility tests only); we rely on `npm run build` + the existing 134 Convex tests for safety, plus the user's eye on the dev server.

**No backend changes.** Convex tests stay green.

---

## Task 1: Skip the activity query when logged out

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx:97-100`

**Context:** The `activity` query currently fires for every visitor, even logged-out ones, because the args object always passes `{ limit: 12 }`. Convex executes the query; the result is then thrown away because the Recent Activity section is gated behind `{loggedIn && ...}` at line 250. The fix: pass `"skip"` when there's no session token.

- [ ] **Step 1: Make the change**

Open `src/routes/LeaderboardPage.jsx`. Find the existing block:

```jsx
  const activity = useQuery(
    api.leaderboard.getRecentActivity,
    session?.token ? { limit: 12, token: session.token } : { limit: 12 },
  ) ?? [];
```

Replace with:

```jsx
  const activity = useQuery(
    api.leaderboard.getRecentActivity,
    session?.token ? { limit: 12, token: session.token } : "skip",
  ) ?? [];
```

Only the second branch of the ternary changes — `{ limit: 12 }` becomes `"skip"`. The `?? []` fallback stays so the downstream `activity.length` and `activity.map` calls don't break (when skipped, `useQuery` returns `undefined`, which `?? []` coerces to `[]`).

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Vite build succeeds, ~466 KB bundle.

- [ ] **Step 3: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
perf(board): skip activity query when logged out

The Recent activity section is gated on loggedIn, so the query
result was thrown away anyway. Skipping the subscription saves
a Convex round-trip for anonymous visitors.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `useMemo` for the history filter+sort

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx:1` (import)
- Modify: `src/routes/LeaderboardPage.jsx:110`

**Context:** `history = allRollovers.filter(...).sort(...)` runs every render. The list is tiny (~7 entries max over the trip) so the perf win is microscopic, but the call also produces a new array reference each render, which makes downstream comparisons unstable. `useMemo` keyed on `allRollovers` is cheap and aligns with React patterns.

- [ ] **Step 1: Extend the React import**

Find the existing first line of `src/routes/LeaderboardPage.jsx`:

```jsx
import { useState } from "react";
```

Replace with:

```jsx
import { useState, useMemo } from "react";
```

- [ ] **Step 2: Wrap the history computation**

Find the existing line near 110:

```jsx
  const history = allRollovers.filter((r) => r.loserSlug && r.forfeitId).sort((a, b) => b.dayNumber - a.dayNumber);
```

Replace with:

```jsx
  const history = useMemo(
    () => allRollovers.filter((r) => r.loserSlug && r.forfeitId).sort((a, b) => b.dayNumber - a.dayNumber),
    [allRollovers],
  );
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Vite build succeeds. No new warnings about `useMemo` dependencies (the only dep is `allRollovers`).

- [ ] **Step 4: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
perf(board): memoize history filter+sort

The history derivation ran on every render and produced a fresh
array reference each time. Memoizing on allRollovers stabilises
the reference and avoids the wasted work.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Foul button tap target → iOS 44pt

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx:67-82` (inside the `BoardRow` component)

**Context:** The Foul button currently renders ~24px tall (`padding: "4px 8px"`, `fontSize: 10`). iOS guidance is a 44pt minimum tap target. The fix is to bump padding, font size, and add `minHeight: 44` as a guarantee. Width stays tight so the button doesn't overwhelm the row.

- [ ] **Step 1: Update the button styles**

Find the existing block inside `BoardRow`:

```jsx
      {onFoul && (
        <button
          type="button"
          onClick={() => onFoul({ slug: row.slug, name: p?.name ?? row.slug })}
          title="Log a foul"
          style={{
            padding: "4px 8px", marginLeft: 4,
            fontFamily: "Nunito, sans-serif", fontWeight: 800,
            fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase",
            borderRadius: RADIUS.sm, border: 0, background: C.coralDeep, color: C.white,
            cursor: "pointer",
          }}
        >
          Foul
        </button>
      )}
```

Replace with:

```jsx
      {onFoul && (
        <button
          type="button"
          onClick={() => onFoul({ slug: row.slug, name: p?.name ?? row.slug })}
          title="Log a foul"
          style={{
            padding: "0 14px", marginLeft: 4, minHeight: 44,
            fontFamily: "Nunito, sans-serif", fontWeight: 800,
            fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase",
            borderRadius: RADIUS.sm, border: 0, background: C.coralDeep, color: C.white,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          Foul
        </button>
      )}
```

Changes:
- `padding: "4px 8px"` → `padding: "0 14px"` (let `minHeight` set the vertical size)
- `minHeight: 44` (new — guarantees the 44pt rule)
- `fontSize: 10` → `fontSize: 12`
- Add `display: "inline-flex", alignItems: "center", justifyContent: "center"` so the "Foul" text is vertically centered inside the taller button

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
fix(board): grow Foul button to a 44pt tap target

Was ~24px tall — below the iOS guideline and a fiddly tap on a
phone in a hand. minHeight 44 with flex centering preserves the
visual proportions while making the button reliably tappable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Drop the trailing border on the last row of each card

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx:29-85` (the `BoardRow` component signature + style)
- Modify: `src/routes/LeaderboardPage.jsx:236-244` (the `BoardRow` call site that maps `rows`)
- Modify: `src/routes/LeaderboardPage.jsx:282-300` (the inline History row)

**Context:** Both `BoardRow` and the inline History row unconditionally render `borderBottom: 1px solid ${C.sandDark}`. The Card primitive clips to its `overflow: "hidden"` boundary, so the last row's bottom border sits flush against the card's bottom edge — a dead horizontal line inside the card. Pass an `isLast` prop and omit the border for the final row in each list.

- [ ] **Step 1: Extend `BoardRow` to accept `isLast`**

Find the function signature near line 29:

```jsx
function BoardRow({ row, rank, onFoul, isMe }) {
```

Replace with:

```jsx
function BoardRow({ row, rank, onFoul, isMe, isLast }) {
```

Find the outer wrapper `<div>` style near line 35:

```jsx
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderBottom: `1px solid ${C.sandDark}`,
      background: isMe ? `${p?.color ?? C.coral}08` : "transparent",
    }}>
```

Replace with:

```jsx
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderBottom: isLast ? undefined : `1px solid ${C.sandDark}`,
      background: isMe ? `${p?.color ?? C.coral}08` : "transparent",
    }}>
```

- [ ] **Step 2: Pass `isLast` at the BoardRow call site**

Find the existing `rows.map(...)` block near line 236:

```jsx
              rows.map((row, i) => (
                <BoardRow
                  key={row.slug}
                  row={row}
                  rank={i + 1}
                  isMe={session?.slug === row.slug}
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
                  onFoul={handleFoul && row.slug !== session?.slug ? handleFoul : null}
                />
              ))
```

- [ ] **Step 3: Apply the same fix to the History inline row**

Find the existing `history.map(...)` block near line 282:

```jsx
              {history.map((r) => {
                const player = playerBySlug(r.loserSlug);
                return (
                  <div key={r._id} style={{
                    padding: "12px 14px",
                    borderBottom: `1px solid ${C.sandDark}`,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
```

Replace with:

```jsx
              {history.map((r, i) => {
                const player = playerBySlug(r.loserSlug);
                const isLast = i === history.length - 1;
                return (
                  <div key={r._id} style={{
                    padding: "12px 14px",
                    borderBottom: isLast ? undefined : `1px solid ${C.sandDark}`,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
```

The change: add `, i` to the `.map` arrow, compute `isLast`, use it in the inline style.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
fix(board): drop trailing border on the last row in each card

BoardRow and the inline History row unconditionally rendered a
bottom border, leaving a dead horizontal line flush against the
card's bottom edge. Pass isLast so the final row in each list
skips the border.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Loading skeleton replaces the "No claims yet" flash

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx:95-101` (capture the raw Convex query results)
- Modify: `src/routes/LeaderboardPage.jsx:97-100` (activity query — needs the same loading distinction)
- Modify: `src/routes/LeaderboardPage.jsx:230-247` (leaderboard card render)
- Modify: `src/routes/LeaderboardPage.jsx:261-265` (recent activity card render)
- Add: a top-level `BoardRowSkeleton` component near the existing `BoardRow` (same file)

**Context:** When `useQuery` returns `undefined` (loading), the current code uses `?? []` which immediately renders the "No claims yet" empty state. The fix: distinguish loading from empty by inspecting the raw query result. Render skeleton rows while loading; render the empty-state copy only when the query has resolved to an empty array.

The skeleton is a static set of muted grey blocks shaped like a BoardRow. No shimmer animation — keep it simple, the point is to stop the "No claims yet" flash.

- [ ] **Step 1: Add the `BoardRowSkeleton` component**

In `src/routes/LeaderboardPage.jsx`, immediately AFTER the `BoardRow` function definition (which ends with `}` near line 85), add:

```jsx
function BoardRowSkeleton({ isLast }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderBottom: isLast ? undefined : `1px solid ${C.sandDark}`,
    }}>
      <div style={{ width: 28 }} />
      <div style={{
        width: 32, height: 32, borderRadius: "50%", background: C.sandDark, opacity: 0.5,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          width: "40%", height: 12, borderRadius: 4, background: C.sandDark, opacity: 0.5,
          marginBottom: 6,
        }} />
        <div style={{
          width: "25%", height: 10, borderRadius: 4, background: C.sandDark, opacity: 0.3,
        }} />
      </div>
      <div style={{
        width: 40, height: 18, borderRadius: 4, background: C.sandDark, opacity: 0.5,
      }} />
    </div>
  );
}
```

The skeleton mirrors the `isLast` styling convention used on the real rows (Task 4) so trailing borders behave consistently.

- [ ] **Step 2: Capture raw Convex results alongside the `?? []` versions**

Find the existing three useQuery declarations near lines 95-100:

```jsx
  const daily = useQuery(api.leaderboard.getDaily, { dailyKey: currentDailyKey }) ?? [];
  const holiday = useQuery(api.leaderboard.getHoliday, {}) ?? [];
  const activity = useQuery(
    api.leaderboard.getRecentActivity,
    session?.token ? { limit: 12, token: session.token } : "skip",
  ) ?? [];
```

Replace with:

```jsx
  const dailyRaw = useQuery(api.leaderboard.getDaily, { dailyKey: currentDailyKey });
  const holidayRaw = useQuery(api.leaderboard.getHoliday, {});
  const activityRaw = useQuery(
    api.leaderboard.getRecentActivity,
    session?.token ? { limit: 12, token: session.token } : "skip",
  );
  const daily = dailyRaw ?? [];
  const holiday = holidayRaw ?? [];
  const activity = activityRaw ?? [];
  const rowsLoading = (tab === "daily" ? dailyRaw : holidayRaw) === undefined;
  const activityLoading = !!session?.token && activityRaw === undefined;
```

`rowsLoading` is true while the currently-displayed tab's query hasn't resolved. `activityLoading` is true only when a session exists and the activity query hasn't resolved yet — a logged-out visitor never enters the loading state because `activityRaw` is `undefined` for both "skipped" and "loading", and we don't show the section either way.

- [ ] **Step 3: Render the skeleton in the leaderboard card**

Find the existing block near line 230:

```jsx
        <Reveal>
          <Card padding={0} style={{ overflow: "hidden" }}>
            {rows.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: C.textBody, ...BODY }}>
                No claims yet
              </div>
            ) : (
              rows.map((row, i) => (
                <BoardRow
                  key={row.slug}
                  row={row}
                  rank={i + 1}
                  isMe={session?.slug === row.slug}
                  isLast={i === rows.length - 1}
                  onFoul={handleFoul && row.slug !== session?.slug ? handleFoul : null}
                />
              ))
            )}
          </Card>
        </Reveal>
```

Replace with:

```jsx
        <Reveal>
          <Card padding={0} style={{ overflow: "hidden" }}>
            {rowsLoading ? (
              [0, 1, 2, 3].map((i) => (
                <BoardRowSkeleton key={i} isLast={i === 3} />
              ))
            ) : rows.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: C.textBody, ...BODY }}>
                No claims yet
              </div>
            ) : (
              rows.map((row, i) => (
                <BoardRow
                  key={row.slug}
                  row={row}
                  rank={i + 1}
                  isMe={session?.slug === row.slug}
                  isLast={i === rows.length - 1}
                  onFoul={handleFoul && row.slug !== session?.slug ? handleFoul : null}
                />
              ))
            )}
          </Card>
        </Reveal>
```

Four skeleton rows is a reasonable guess at the eventual list height — enough to fill the card without being absurd.

- [ ] **Step 4: Render the skeleton in the Recent activity card**

Find the existing block near line 261 (inside the `{loggedIn && (...)}` SectionBand for Live feed):

```jsx
          <Reveal>
            <Card padding={0} style={{ overflow: "hidden" }}>
              {activity.length === 0
                ? <div style={{ padding: 24, textAlign: "center", color: C.textBody, ...BODY }}>Nothing yet</div>
                : activity.map((e) => <EntryRow key={e._id} entry={e} />)}
            </Card>
          </Reveal>
```

Replace with:

```jsx
          <Reveal>
            <Card padding={0} style={{ overflow: "hidden" }}>
              {activityLoading ? (
                [0, 1, 2].map((i) => (
                  <BoardRowSkeleton key={i} isLast={i === 2} />
                ))
              ) : activity.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: C.textBody, ...BODY }}>Nothing yet</div>
              ) : (
                activity.map((e) => <EntryRow key={e._id} entry={e} />)
              )}
            </Card>
          </Reveal>
```

Three skeleton rows here — the activity feed is typically shorter than the leaderboard. Reuses `BoardRowSkeleton` because the EntryRow shape is similar (avatar + two lines of text + a tail).

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Vite build succeeds. Bundle size grows by ~0.5 KB for the new component.

- [ ] **Step 6: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
feat(board): skeleton rows replace the "No claims yet" flash

useQuery's undefined-during-loading was getting coerced to [] by
?? [], so the empty-state copy flashed before real data landed.
Capture the raw query results separately, render skeleton rows
while loading, and only show the empty state once the query has
resolved to [].

Applies to both the leaderboard card and the Recent activity
card. Static skeleton (no shimmer) — minimal visual noise.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review summary (run after all 5 tasks ship)

After Task 5 commits, run a quick end-of-bundle sanity check:

- [ ] **Build clean:** `npm run build` succeeds, bundle ~467 KB
- [ ] **Convex tests still green:** `npm test` shows 134/134
- [ ] **No new TypeScript / ESLint warnings:** none expected since the changes are all JSX
- [ ] **Visual smoke (optional):** `npm run dev`, log in, watch the loading state — should see skeleton rows for ~50ms then real data, instead of a "No claims yet" flash. Tap Foul on a non-self row — button is reachable. Look at the bottom edge of the Leaderboard / History cards — no orphan border line.

---

## After this bundle ships

Bundle B (Row improvements) is next. Open the Board overhaul spec at `docs/superpowers/specs/2026-05-20-board-overhaul-design.md` §5.1–5.3 and §5.9-bundle-B for the row layout (holiday-name-only, two-number verified chip, you-pill, zero-score players, participation subtitle). A separate plan doc will follow.
