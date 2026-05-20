# Board Row Improvements — Implementation Plan (Bundle B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the row-level improvements from §5.1 and §5.3 of the Board Overhaul spec — holiday-name canonicalization, full-crew rendering with muted zero-scorers, two-number verified chip, "you" pill, and participation subtitle. Five small tasks, all in one file.

**Architecture:** All changes are to `src/routes/LeaderboardPage.jsx`. We reuse the existing `useHolidayNameMap` + `displayName` helpers (already used by `RevealFlow` and `EntryRow`) so name canonicalization is just swapping fallbacks. Zero-score players are synthesised inside the page component (no backend query change — the server already returns only scoring players, and the client merges in the rest from `PLAYERS`).

**Tech Stack:** React 18, Convex live queries, Vite. No new deps.

**Reference:** Spec at `docs/superpowers/specs/2026-05-20-board-overhaul-design.md` §5.1–5.3. This is **Bundle B** of five (Polish ✅ → **Row** → Drill-down → Rollover rewrite → Wheel preview).

---

## File Structure

**Modified (only this file):**
- `src/routes/LeaderboardPage.jsx`

No new components needed. No tests added — this codebase has no React component tests; we rely on `npm run build` + the existing 134 Convex tests staying green.

**Untouched but worth knowing:**
- `src/lib/displayName.js` — `displayName(slug, map, fallback?)` and `useHolidayNameMap()` already exist
- `src/data/players.js` — `PLAYERS` array (8 entries, ordered by `id`) is the canonical crew list
- `src/components/EntryRow.jsx` — already uses `displayName`, so the Recent activity feed is on holiday names with no further work
- `src/components/SectionHeader.jsx` — already has a `tagline` prop; we just pipe a new string into it

---

## Task 1: Holiday name canonicalization on the leaderboard rows and history

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

**Context:** The leaderboard `BoardRow` and the inline History row currently render `{p?.name ?? row.slug}` — the legal name. The Recent activity feed already uses `displayName` via `EntryRow`. To make the Board consistent, plumb `useHolidayNameMap()` through `LeaderboardPage` and pass `holidayMap` into `BoardRow`. Use `displayName(slug, holidayMap)` everywhere we currently fall back to `p?.name ?? slug`.

- [ ] **Step 1: Extend the page-level imports**

Find the existing import block at the top of `src/routes/LeaderboardPage.jsx`. Look for the line:

```jsx
import { useSession } from "../lib/useSession.js";
```

Add immediately after it:

```jsx
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
```

- [ ] **Step 2: Call `useHolidayNameMap` inside the page component**

Find the existing hook calls near the top of `LeaderboardPage` (right after the `useSession` line). Look for the existing block that starts with:

```jsx
  const session = useSession();
  const loggedIn = !!session;
```

Add immediately after it:

```jsx
  const holidayMap = useHolidayNameMap();
```

This is a single hook call returning an already-cached Convex query, so it's cheap.

- [ ] **Step 3: Extend `BoardRow` to accept `holidayMap`**

Find the `BoardRow` function signature (currently): `function BoardRow({ row, rank, onFoul, isMe, isLast }) {`

Replace with:

```jsx
function BoardRow({ row, rank, onFoul, isMe, isLast, holidayMap }) {
```

Find inside `BoardRow` the line that renders the player's name:

```jsx
        }}>{p?.name ?? row.slug}</div>
```

Replace with:

```jsx
        }}>{displayName(row.slug, holidayMap, p?.name)}</div>
```

`displayName(slug, map, fallback)` returns the holiday name if present, else the supplied fallback, else the slug. Passing `p?.name` as fallback preserves the existing behaviour when the holiday name isn't set.

Also find inside `BoardRow` the `onClick` for the Foul button (currently): `onClick={() => onFoul({ slug: row.slug, name: p?.name ?? row.slug })}`

Replace with:

```jsx
          onClick={() => onFoul({ slug: row.slug, name: displayName(row.slug, holidayMap, p?.name) })}
```

This ensures the Foul modal shows the holiday name too.

- [ ] **Step 4: Pass `holidayMap` at the `BoardRow` call site**

Find the existing `rows.map(...)` block. The current call site reads (with line breaks):

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
                  onFoul={handleFoul && row.slug !== session?.slug ? handleFoul : null}
                />
              ))
```

- [ ] **Step 5: Swap the History inline row to use `displayName`**

Find the existing `history.map(...)` block. Inside the JSX for each history row, look for:

```jsx
                      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: C.dark }}>
                        Day {r.dayNumber} · {player?.name ?? r.loserSlug}
                      </div>
```

Replace with:

```jsx
                      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: C.dark }}>
                        Day {r.dayNumber} · {displayName(r.loserSlug, holidayMap, player?.name)}
                      </div>
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
refactor(board): use holiday names on leaderboard + history rows

Recent activity was already using displayName via EntryRow; this
brings the leaderboard rows, foul-modal target name, and history
row in line. Legal names retire to admin/login.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Show all crew, with zero-score players muted at the bottom

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

**Context:** Today the board shows only players who've claimed at least one entry. For "see who's actually playing today," that's not enough — you want zero-scorers visible too, so you can tell that Camara hasn't started yet. Merge `PLAYERS` into the displayed list, place zero-scorers at the bottom in `PLAYERS` order, and pass an `isZero` flag to `BoardRow` so it can render them muted.

- [ ] **Step 1: Build the merged row list**

Find the existing line in `LeaderboardPage`:

```jsx
  const rows = tab === "daily" ? daily : holiday;
```

Replace with:

```jsx
  const rowsBase = tab === "daily" ? daily : holiday;
  const rows = useMemo(() => {
    const scoringSlugs = new Set(rowsBase.map((r) => r.slug));
    const zeros = PLAYERS
      .filter((p) => !scoringSlugs.has(p.slug))
      .map((p) => ({
        slug: p.slug,
        total: 0,
        claimCount: 0,
        verifiedCount: 0,
        earliestAt: Infinity,
        isZero: true,
      }));
    return [...rowsBase, ...zeros];
  }, [rowsBase]);
```

`useMemo` is already imported in this file (added in Bundle A Task 2). The merged list keeps the server's sort for scoring rows, then appends zero-scorers in `PLAYERS` order (which is by `id` 1-8, a stable canonical order).

- [ ] **Step 2: Extend `BoardRow` to accept `isZero`**

Find the existing `BoardRow` signature (post-Task 1):

```jsx
function BoardRow({ row, rank, onFoul, isMe, isLast, holidayMap }) {
```

Replace with:

```jsx
function BoardRow({ row, rank, onFoul, isMe, isLast, holidayMap, isZero }) {
```

- [ ] **Step 3: Mute the row when `isZero` is set**

Find the outer wrapper `<div>` inside `BoardRow`:

```jsx
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderBottom: isLast ? undefined : `1px solid ${C.sandDark}`,
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
      opacity: isZero ? 0.55 : 1,
    }}>
```

- [ ] **Step 4: Skip the rank/medal column for zero-score rows**

Find inside `BoardRow` the rank/medal column:

```jsx
      <div style={{
        width: 28, textAlign: "center",
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 18, color: C.textBody,
      }}>
        {medal ?? rank}
      </div>
```

Replace with:

```jsx
      <div style={{
        width: 28, textAlign: "center",
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 18, color: C.textBody,
      }}>
        {isZero ? "" : (medal ?? rank)}
      </div>
```

This preserves the 28-px-wide spacer so all rows line up, but leaves the slot blank for zero-scorers (no misleading "rank 5 = 5th best" when they have 0 points).

- [ ] **Step 5: Swap the verified line for "no claims yet" when zero**

Find inside `BoardRow` the existing two-line text block — specifically the sub-line:

```jsx
        <div style={{
          fontSize: 11, color: C.textBody, fontFamily: "Nunito, sans-serif",
        }}>
          {row.claimCount} claim{row.claimCount === 1 ? "" : "s"} · {row.verifiedCount} 🛡
        </div>
```

Replace with:

```jsx
        <div style={{
          fontSize: 11, color: C.textBody, fontFamily: "Nunito, sans-serif",
        }}>
          {isZero
            ? "no claims yet"
            : `${row.claimCount} claim${row.claimCount === 1 ? "" : "s"} · ${row.verifiedCount} 🛡`}
        </div>
```

The verified chip styling lands in Task 3 — this step just keeps the current shape but adds the zero-state copy.

- [ ] **Step 6: Pass `isZero` at the call site**

Find the existing `rows.map(...)` block. The current call site (post-Task 1) reads:

```jsx
              rows.map((row, i) => (
                <BoardRow
                  key={row.slug}
                  row={row}
                  rank={i + 1}
                  isMe={session?.slug === row.slug}
                  isLast={i === rows.length - 1}
                  holidayMap={holidayMap}
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
                  onFoul={handleFoul && row.slug !== session?.slug ? handleFoul : null}
                />
              ))
            )}
```

The `!!` coerces `undefined` to `false` for scoring rows that don't have the flag.

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Vite build succeeds. Bundle size ~unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
feat(board): render all crew, mute zero-score players

Merge PLAYERS into the row list so the Board shows who's playing
even when they haven't claimed yet. Zero-scorers sit at the bottom
in PLAYERS order, with reduced opacity, no rank/medal, and the
"no claims yet" copy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Two-number `verified` chip per row

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

**Context:** Vouching is the social mechanic, so the verified count deserves more visual weight than the current grey 1-liner. Render a compact pill: `N of M verified`. Green tint if all verified; neutral sand tint if some are still pending. Zero-scorers (handled in Task 2) keep the "no claims yet" text instead of the chip.

- [ ] **Step 1: Swap the sub-line for a verified chip**

Find inside `BoardRow` the sub-line (post-Task 2):

```jsx
        <div style={{
          fontSize: 11, color: C.textBody, fontFamily: "Nunito, sans-serif",
        }}>
          {isZero
            ? "no claims yet"
            : `${row.claimCount} claim${row.claimCount === 1 ? "" : "s"} · ${row.verifiedCount} 🛡`}
        </div>
```

Replace with:

```jsx
        {isZero ? (
          <div style={{
            fontSize: 11, color: C.textBody, fontFamily: "Nunito, sans-serif",
            marginTop: 2,
          }}>
            no claims yet
          </div>
        ) : (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: 999,
            background: row.verifiedCount === row.claimCount
              ? `${C.green}22`
              : C.sandDark,
            color: row.verifiedCount === row.claimCount
              ? C.green
              : C.textBody,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 700,
            fontSize: 11,
            marginTop: 2,
          }}>
            {row.verifiedCount} of {row.claimCount} verified
          </div>
        )}
```

Notes on the styling:
- `display: "inline-flex"` makes the pill hug its content
- `${C.green}22` is a hex-with-alpha shortcut — `22` is roughly 13% opacity, a soft green wash
- `marginTop: 2` matches the rhythm of the previous line so vertical spacing in the row doesn't shift

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
feat(board): verified-count pill per row

Replaces the grey "4 claims · 0 🛡" 1-liner with a compact
"N of M verified" chip. Green tint when fully verified, neutral
sand when some are still pending. Zero-scorers keep the
"no claims yet" copy from the previous step.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: "you" pill next to the current player's name

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

**Context:** Right now the only signal that a row is your own is a faint background tint. A small "you" pill next to the holiday name makes the row scannable.

- [ ] **Step 1: Add the pill next to the name**

Find inside `BoardRow` the player-name `<div>` (post-Task 1):

```jsx
        <div style={{
          fontFamily: "Nunito, sans-serif", fontWeight: 800,
          fontSize: 14, color: C.dark,
        }}>{displayName(row.slug, holidayMap, p?.name)}</div>
```

Replace with:

```jsx
        <div style={{
          fontFamily: "Nunito, sans-serif", fontWeight: 800,
          fontSize: 14, color: C.dark,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>{displayName(row.slug, holidayMap, p?.name)}</span>
          {isMe && (
            <span style={{
              padding: "1px 6px",
              borderRadius: 999,
              background: C.sand,
              border: `1px solid ${C.sandDark}`,
              color: C.textBody,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 9,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}>
              you
            </span>
          )}
        </div>
```

The change: the name `<div>` becomes a flex container with the name in a `<span>` and the pill conditionally rendered after.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
feat(board): you-pill next to current player's name

Faint background tint was the only "this is me" signal. A small
uppercase "you" pill makes the row scannable at a glance.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Participation subtitle on the section header

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

**Context:** The Board's header today shows `DAY 1 · Leaderboard` only. A subtle subtitle telling you "4 of 8 crew playing · 8 claims today" gives the page meaningful context for a glanceable use. Use the existing `tagline` prop on `SectionHeader`. The subtitle replaces the current logged-out CTA when both conditions apply — show the subtitle to logged-in users on the Today tab, and the existing CTA to logged-out users.

- [ ] **Step 1: Compute the participation values**

Find the existing block in `LeaderboardPage` that computes `currentDayEntryCount`. It looks like:

```jsx
  // Reuse the existing `daily` rows (already aggregated per player) — sum
  // `claimCount` across rows for total entry count.
  const currentDayEntryCount = daily.reduce((sum, row) => sum + row.claimCount, 0);
```

Add immediately after it:

```jsx
  const dailyPlayingCount = daily.length;
```

`daily` is the array of scoring rows (the server-side aggregation returns one row per player who has at least one entry today). So `daily.length` is the count of distinct players who've claimed today.

- [ ] **Step 2: Update the `SectionHeader` tagline**

Find the existing `<SectionHeader>` call inside the `<Reveal>` near the top of the return JSX. It looks like:

```jsx
          <SectionHeader
            label={gamesLive ? `Day ${currentDayNumber}` : "Pre-trip"}
            title="Leaderboard"
            tagline={loggedIn ? null : "Log in to see activity, vouches, and forfeit history."}
            accent={ACCENT}
            compact
          />
```

Replace the `tagline` prop value with this conditional:

```jsx
          <SectionHeader
            label={gamesLive ? `Day ${currentDayNumber}` : "Pre-trip"}
            title="Leaderboard"
            tagline={
              !loggedIn
                ? "Log in to see activity, vouches, and forfeit history."
                : tab === "daily" && gamesLive
                ? `${dailyPlayingCount} of ${PLAYERS.length} crew playing · ${currentDayEntryCount} claim${currentDayEntryCount === 1 ? "" : "s"} today`
                : null
            }
            accent={ACCENT}
            compact
          />
```

Behaviour matrix:
- Logged out → existing CTA copy (unchanged)
- Logged in, Today tab, games live → new participation subtitle
- Logged in, Holiday tab → no tagline (the metric framing only makes sense for the day)
- Logged in, pre-trip → no tagline (no day to summarise)

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
feat(board): participation subtitle on the section header

Logged-in viewers on the Today tab now see
"N of M crew playing · K claims today" under the title. Holiday
tab and pre-trip stay clean; logged-out users still get the
login CTA.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review summary (run after all 5 tasks ship)

After Task 5 commits:

- [ ] **Build clean:** `npm run build` succeeds, bundle ~467 KB
- [ ] **Convex tests still green:** `npm test` shows 134/134 (no backend touched)
- [ ] **Visual smoke (optional):** `npm run dev`, log in. Today tab should show all 8 crew (scorers at top, non-scorers muted at the bottom). Your row has a "you" pill. Each scoring row has a "N of M verified" pill — green if all verified. Section header shows the participation subtitle. Names are holiday names everywhere on the Board, Live feed, and History.

---

## After this bundle ships

Bundle C (player drill-down) is next. Open the spec at `docs/superpowers/specs/2026-05-20-board-overhaul-design.md` §5.2 — tappable rows opening a BottomSheet with that player's claims, vouches, finds, fouls. A separate plan doc will follow.
