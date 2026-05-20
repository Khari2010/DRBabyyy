# Games Page Phase 2 — Long-List Polish Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking. UI-only — verify with `npm run build 2>&1 | tail -5`. One commit per task, explicit `git add <paths>`. Dispatch sequential sonnet implementer subagents.

**Goal:** Fix the "wall of 55 cards" introduced by phase 1's unified-list change. Adds search, smart truncation, claimed-today visual state, a "hot" sort option, and a small category chip — all on `/player/:slug/games`.

**Architecture:** All changes live in `src/components/ChallengesSection.jsx` (filter chain) and `src/components/ChallengeCard.jsx` (per-card visual). No new primitives, no backend changes (uses the existing `api.leaderboard.getRecentActivity` query for heat data).

**Tech Stack:** React 18 + Vite + Convex queries (existing), inline styles via design tokens.

---

## File Structure

- `src/components/ChallengesSection.jsx` — adds search state, truncation state, heatMap memo, "hot" sort option, threads `done` into `ChallengeCard`.
- `src/components/ChallengeCard.jsx` — accepts `done` and renders category chip + claimed-today state.

---

## Task 1: Search input toggle

**Why:** With 55 challenges in the list, finding a specific one ("where's bachata?") requires scrolling. A search icon that expands to an input fixes the "I know it's in there" case.

**Files:**
- Modify: `src/components/ChallengesSection.jsx`

- [ ] **Step 1: Add search state and filter into the memo**

At the top of the `ChallengesSection` component, add state:

```jsx
const [searchOpen, setSearchOpen] = useState(false);
const [searchTerm, setSearchTerm] = useState("");
```

Find the `visibleChallenges` useMemo. Extend its filter chain so search applies BEFORE sort:

```jsx
const visibleChallenges = useMemo(() => {
  let filtered = challenges.filter((c) => filters.has(c.difficulty));
  const q = searchTerm.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      (c.category ?? "").toLowerCase().includes(q)
    );
  }
  return sortChallenges(filtered, sortKey);
}, [challenges, filters, sortKey, searchTerm]);
```

- [ ] **Step 2: Add the search icon button to the filter row**

Find the JSX block that renders the filter pills and sort dropdown (`<div style={{ display: "flex", flexWrap: "wrap", gap: 8, ...`). Right before the `<select>`, add a search toggle button:

```jsx
<button
  type="button"
  onClick={() => {
    setSearchOpen((o) => {
      const next = !o;
      if (!next) setSearchTerm(""); // closing clears the term
      return next;
    });
  }}
  aria-label={searchOpen ? "Close search" : "Search challenges"}
  aria-pressed={searchOpen}
  style={{
    background: searchOpen ? `${C.gold}25` : "rgba(0,0,0,0.04)",
    border: "none",
    borderRadius: RADIUS.pill,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1,
    color: searchOpen ? C.gold : C.textBody,
  }}
>
  🔍
</button>
```

- [ ] **Step 3: Render the input below the filter row when open**

Directly after the closing `</div>` of the filter+sort row, add:

```jsx
{searchOpen && (
  <input
    type="search"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder="Search by title or category…"
    autoFocus
    style={{
      width: "100%",
      padding: "10px 12px",
      borderRadius: RADIUS.md,
      border: `1px solid ${C.sandDark}`,
      fontFamily: "Nunito, sans-serif",
      fontSize: 14,
      color: C.dark,
      background: C.white,
      outline: "none",
      marginBottom: 12,
    }}
  />
)}
```

- [ ] **Step 4: Build + verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChallengesSection.jsx
git commit -m "feat(games): search input toggle in challenges filter row"
```

---

## Task 2: Default to 8 cards + "Show all 55" button

**Why:** Scrolling through 55 cards is fatigue. Default view shows a manageable 8; user opts in to the full list.

**Files:**
- Modify: `src/components/ChallengesSection.jsx`

- [ ] **Step 1: Add truncation state + constant**

Near the other `useState` calls in `ChallengesSection`, add:

```jsx
const TRUNCATE_AT = 8;
const [showAll, setShowAll] = useState(false);
```

When the user changes a filter or runs a search, the truncation should reset so they're not staring at an empty list under the "Show all" button. Add a `useEffect` (or inline reset logic) to reset `showAll` to false whenever `searchTerm`, `filters`, or `sortKey` change — but ONLY meaningfully when not already showing all:

```jsx
useEffect(() => {
  setShowAll(false);
}, [searchTerm, sortKey, filters]);
```

(Adding `useEffect` may require updating the React import at the top of the file.)

- [ ] **Step 2: Compute the truncated view**

After `visibleChallenges` is computed, compute the truncated slice. If a search term is active, never truncate — search results should show everything:

```jsx
const hasSearch = searchTerm.trim().length > 0;
const truncated = !showAll && !hasSearch && visibleChallenges.length > TRUNCATE_AT;
const shownChallenges = truncated ? visibleChallenges.slice(0, TRUNCATE_AT) : visibleChallenges;
const hiddenCount = visibleChallenges.length - TRUNCATE_AT;
```

- [ ] **Step 3: Render `shownChallenges` instead of `visibleChallenges` in the grid**

Replace the map line in the grid:

```jsx
{shownChallenges.map((c) => (
  <ChallengeCard key={c.challengeId} challenge={c} onClaim={handleCardTap} />
))}
```

(`done` prop comes in Task 3.)

- [ ] **Step 4: Add the "Show all" button below the grid**

Directly after the closing `</div>` of the grid, before the `<ClaimSheet ...>` line:

```jsx
{truncated && (
  <button
    type="button"
    onClick={() => setShowAll(true)}
    style={{
      width: "100%",
      marginTop: 12,
      padding: "12px 14px",
      borderRadius: RADIUS.md,
      border: `1px solid ${C.sandDark}`,
      background: C.white,
      fontFamily: "Nunito, sans-serif",
      fontWeight: 800,
      fontSize: 13,
      color: C.textBody,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    }}
  >
    Show all {visibleChallenges.length} <span style={{ color: C.gold }}>→</span>
  </button>
)}
```

- [ ] **Step 5: Build + verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ChallengesSection.jsx
git commit -m "feat(games): show 8 challenges by default with 'Show all N' expand"
```

---

## Task 3: "Already claimed today" visual state on cards

**Why:** With 55 cards, accidentally tapping a duplicate of something you already did today is easy. Dim claimed cards so the eye lands on unclaimed ones first.

**Files:**
- Modify: `src/components/ChallengeCard.jsx`
- Modify: `src/components/ChallengesSection.jsx`

- [ ] **Step 1: Accept a `done` prop on ChallengeCard**

Open `src/components/ChallengeCard.jsx` and update the component to accept `done`. Render a faint checkmark and 50% opacity when `done === true`:

```jsx
export default function ChallengeCard({ challenge, onClaim, done = false }) {
  const dColor = DIFFICULTY_COLOR[challenge.difficulty] ?? C.dark;
  return (
    <button
      type="button"
      data-claim="true"
      onClick={() => onClaim(challenge)}
      style={{
        all: "unset",
        display: "block",
        cursor: "pointer",
        width: "100%",
        opacity: done ? 0.5 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <Card padding={14}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 28, lineHeight: 1, position: "relative" }}>
            {challenge.icon}
            {done && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: -6,
                  bottom: -2,
                  fontSize: 14,
                  background: C.green,
                  color: C.white,
                  borderRadius: 999,
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  fontWeight: 900,
                }}
              >
                ✓
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 16,
              color: C.dark,
              lineHeight: 1.2,
              textDecoration: done ? "line-through" : "none",
              textDecorationThickness: "2px",
              textDecorationColor: C.sandDark,
            }}>
              {challenge.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 10,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: dColor,
                  background: `${dColor}18`,
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                {DIFFICULTY_LABEL[challenge.difficulty] ?? "—"}
              </span>
              {challenge.bonus && (
                <span style={{
                  fontFamily: "Nunito, sans-serif",
                  fontSize: 11,
                  color: C.textBody,
                }}>
                  Bonus: {challenge.bonus}
                </span>
              )}
            </div>
          </div>
          <div style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 22,
            color: dColor,
            flexShrink: 0,
          }}>
            +{challenge.points}
          </div>
        </div>
      </Card>
    </button>
  );
}
```

Note: keep `data-claim="true"` from Task 13 (phase 1).

- [ ] **Step 2: Build a set of claimed-today IDs in `ChallengesSection` and pass `done`**

In `ChallengesSection.jsx`, after `mineToday` is computed, build the set:

```jsx
const claimedTodayIds = new Set(
  mineToday.map((e) => e.challengeId).filter(Boolean)
);
```

Then in the map call inside the grid, pass the prop:

```jsx
{shownChallenges.map((c) => (
  <ChallengeCard
    key={c.challengeId}
    challenge={c}
    done={claimedTodayIds.has(c.challengeId)}
    onClaim={handleCardTap}
  />
))}
```

- [ ] **Step 3: Build + verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ChallengeCard.jsx src/components/ChallengesSection.jsx
git commit -m "feat(games): dim + checkmark cards already claimed today"
```

---

## Task 4: "Hot" sort — recently claimed by the crew (last 24h)

**Why:** Surfaces what's actually happening on the trip right now. Creates social proof and lightweight FOMO without a dedicated leaderboard view.

**Files:**
- Modify: `src/components/ChallengesSection.jsx`

- [ ] **Step 1: Compute a heatMap from the existing `activity` array**

The component already queries `api.leaderboard.getRecentActivity` with `limit: 100`. Add a memo that counts challenge claims in the last 24h:

```jsx
const heatMap = useMemo(() => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const map = new Map();
  for (const e of activity) {
    if (e.type !== "challenge" || !e.challengeId) continue;
    if (e.createdAt < oneDayAgo) continue;
    if (e.status === "disputed") continue;
    map.set(e.challengeId, (map.get(e.challengeId) ?? 0) + 1);
  }
  return map;
}, [activity]);
```

Place this near the other memos in the component.

- [ ] **Step 2: Move the sort logic inline so it can see heatMap**

The current `sortChallenges` helper lives at module scope and doesn't have access to component state. The cleanest move: keep the existing function for the 4 stateless sorts, and inline the "hot" branch in the `visibleChallenges` memo.

Replace the body of the `visibleChallenges` useMemo:

```jsx
const visibleChallenges = useMemo(() => {
  let filtered = challenges.filter((c) => filters.has(c.difficulty));
  const q = searchTerm.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      (c.category ?? "").toLowerCase().includes(q)
    );
  }
  if (sortKey === "hot") {
    return [...filtered].sort((a, b) => {
      const ha = heatMap.get(a.challengeId) ?? 0;
      const hb = heatMap.get(b.challengeId) ?? 0;
      if (hb !== ha) return hb - ha;
      return b.points - a.points;
    });
  }
  return sortChallenges(filtered, sortKey);
}, [challenges, filters, sortKey, searchTerm, heatMap]);
```

- [ ] **Step 3: Add "Hot" to `SORT_OPTIONS`**

Update the module-level constant:

```jsx
const SORT_OPTIONS = [
  { key: "default", label: "Default" },
  { key: "hot", label: "🔥 Hot" },
  { key: "pointsDesc", label: "Most points" },
  { key: "pointsAsc", label: "Least points" },
  { key: "newest", label: "Newest" },
];
```

- [ ] **Step 4: Build + verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ChallengesSection.jsx
git commit -m "feat(games): 'Hot' sort option ranks by crew claims in last 24h"
```

---

## Task 5: Category chip on ChallengeCard

**Why:** 55 visually similar cards. Adding a small category chip (`BEACH`, `DRINKS`, `LOCAL`, `WILD`, `SQUAD`, etc.) gives the grid visual texture so it doesn't read as one beige column.

**Files:**
- Modify: `src/components/ChallengeCard.jsx`

- [ ] **Step 1: Add the category chip next to the difficulty chip**

Open `src/components/ChallengeCard.jsx`. Inside the second-row flex container (the one that holds the difficulty chip + optional bonus), insert the category chip immediately after the difficulty chip:

```jsx
{challenge.category && (
  <span
    style={{
      fontFamily: "Nunito, sans-serif",
      fontWeight: 700,
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: C.textBody,
      background: "rgba(0,0,0,0.04)",
      borderRadius: 999,
      padding: "2px 8px",
    }}
  >
    {challenge.category}
  </span>
)}
```

Note the deliberate visual hierarchy: difficulty chip uses a tinted accent color (loud); category chip uses neutral gray (quiet). The difficulty stays the primary signal; category is contextual flavor.

- [ ] **Step 2: Build + verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ChallengeCard.jsx
git commit -m "feat(games): category chip on ChallengeCard"
```

---

## Self-Review

**Spec coverage:**
- ✅ Search affordance — Task 1
- ✅ Default to 8 + show all — Task 2
- ✅ Done state on claimed-today cards — Task 3
- ✅ Hot sort — Task 4
- ✅ Category chip — Task 5

**Placeholder scan:** No TBDs, every step has runnable code or commands.

**Type/name consistency:**
- `searchTerm`, `searchOpen`, `setSearchTerm`, `setSearchOpen` — consistent across Tasks 1 and 2.
- `heatMap` — single source in Task 4.
- `done` prop on ChallengeCard — defined in Task 3 (default `false`), consumed in same task.
- `shownChallenges` (Task 2) vs `visibleChallenges` (filtered+sorted) — distinct names, no collision.

**Order-of-operations:**
- Tasks 1 → 2 → 3 → 4 → 5 all touch `ChallengesSection.jsx` and/or `ChallengeCard.jsx`. Run sequentially. Each commit must build green before the next subagent starts.

---

## Execution Handoff

Plan saved. Subagent-driven sequential execution.
