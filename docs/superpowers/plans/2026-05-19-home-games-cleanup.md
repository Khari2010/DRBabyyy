# Home + Games Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Iterate the trip-app per Khari's first-night review notes. Trim the home page to the essentials now that the crew is on the ground. Add day comments, adventure comments, and adventure suggestions. Polish the games page so the player can see what they've already tagged. Land light "flow state" design touches.

**Architecture:** Same stack as the existing build. Three new Convex tables (`dayComments`, `activityComments`, `activitySuggestions`) with their CRUD layers. Day-aware itinerary defaulting via a small helper that reads Dominican Republic (AST, UTC-4) local time. Existing primitives drive all new UI.

**Tech Stack:** Vite + React 18, Convex 1.35, react-router-dom 7, Vitest 4 + `convex-test`. Design tokens in `src/data/design.js`; primitives in `src/components/primitives/*`.

---

## File structure

### Modified Convex files
```
convex/
  schema.ts                                  ← +3 tables
  dayComments.ts                             ← NEW
  dayComments.test.ts                        ← NEW
  activityComments.ts                        ← NEW
  activityComments.test.ts                   ← NEW
  activitySuggestions.ts                     ← NEW
  activitySuggestions.test.ts                ← NEW
  admin.ts                                   ← (optional) extend resetGame to wipe new tables
```

### Modified / new frontend files
```
src/lib/
  drTime.js                                  ← NEW: DR-local-time helpers (today-day-of-month, currentTripDayIndex)
src/components/
  HolidayNameEditor.jsx                      ← MODIFIED: collapsed-by-default once set
  DayCommentThread.jsx                       ← NEW
  ActivityCommentThread.jsx                  ← NEW
  ProposeActivityForm.jsx                    ← NEW
  TodaysClaims.jsx                           ← NEW
src/routes/
  HomePage.jsx                               ← MODIFIED: remove countdown; condense
  PlayerPage.jsx                             ← MODIFIED: collapse holiday name; condense; confirm questionnaire hidden
  PlayerGamesPage.jsx                        ← MODIFIED: top TodaysClaims panel; better header narrative
  AdminPage.jsx                              ← MODIFIED: add activity suggestions draft queue
src/components/
  YourItineraryHome.jsx                      ← MODIFIED: default to today's day; simpler card; comments thread
  AdventuresPanel.jsx                        ← MODIFIED: smaller cards; collapsible details; comments; propose
  ChallengesSection.jsx                      ← MODIFIED: improved heading copy
```

### Commit cadence
One commit per task. Each task ends with a `git commit` step.

---

# Phase 1 — Quick UI wins (no backend)

Goal: visible cleanup before the first claim of the trip. No Convex changes.

---

## Task 1.1: DR-time helper

**Files:**
- Create: `src/lib/drTime.js`
- Create: `src/lib/drTime.test.js`

- [ ] **Step 1: Write the test file**

```js
// src/lib/drTime.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { drDayOfMonth, currentTripDayIndex } from "./drTime.js";

describe("drDayOfMonth", () => {
  it("returns the day-of-month in DR time (UTC-4)", () => {
    // 18 May 2026 03:00 UTC = 17 May 2026 23:00 DR. Should return 17.
    const utc = new Date(Date.UTC(2026, 4, 18, 3, 0, 0));
    expect(drDayOfMonth(utc)).toBe(17);
  });

  it("returns same day when UTC and DR are on the same calendar day", () => {
    // 19 May 2026 18:00 UTC = 19 May 2026 14:00 DR.
    const utc = new Date(Date.UTC(2026, 4, 19, 18, 0, 0));
    expect(drDayOfMonth(utc)).toBe(19);
  });
});

describe("currentTripDayIndex", () => {
  const TRIP_DAYS = [
    { date: "18 May" }, { date: "19 May" }, { date: "20 May" },
    { date: "21 May" }, { date: "22 May" }, { date: "23 May" },
    { date: "24 May" }, { date: "25 May" }, { date: "26 May" },
    { date: "27 May" }, { date: "28 May" }, { date: "29 May" },
  ];

  it("returns 0 before trip starts", () => {
    const utc = new Date(Date.UTC(2026, 4, 16, 12, 0, 0));
    expect(currentTripDayIndex(TRIP_DAYS, utc)).toBe(0);
  });

  it("returns matching index when today is a trip day", () => {
    // 21 May DR = match index 3
    const utc = new Date(Date.UTC(2026, 4, 21, 14, 0, 0));
    expect(currentTripDayIndex(TRIP_DAYS, utc)).toBe(3);
  });

  it("returns last index when trip is over", () => {
    const utc = new Date(Date.UTC(2026, 5, 5, 12, 0, 0));
    expect(currentTripDayIndex(TRIP_DAYS, utc)).toBe(TRIP_DAYS.length - 1);
  });
});
```

- [ ] **Step 2: Run, expect failures**

```bash
npx vitest run src/lib/drTime.test.js
```

Expected: module-not-found / import failure.

- [ ] **Step 3: Implement `src/lib/drTime.js`**

```js
// DR (Atlantic Standard Time) is UTC-4 year-round (no DST).
const DR_OFFSET_HOURS = -4;

export function drDayOfMonth(now = new Date()) {
  const shifted = new Date(now.getTime() + DR_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.getUTCDate();
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function drMonthName(now = new Date()) {
  const shifted = new Date(now.getTime() + DR_OFFSET_HOURS * 60 * 60 * 1000);
  return MONTH_NAMES[shifted.getUTCMonth()];
}

// Returns the index in `days` whose date string ("18 May" etc) matches today
// in DR. Falls back to 0 before the trip, last index after.
export function currentTripDayIndex(days, now = new Date()) {
  if (!Array.isArray(days) || days.length === 0) return 0;
  const today = drDayOfMonth(now);
  const month = drMonthName(now);
  const todayStr = `${today} ${month}`;

  const idx = days.findIndex((d) => d.date === todayStr);
  if (idx >= 0) return idx;

  // Before first day → 0; after last day → last index
  const firstDay = parseInt(days[0].date, 10);
  const lastDay = parseInt(days[days.length - 1].date, 10);
  if (today < firstDay) return 0;
  if (today > lastDay) return days.length - 1;

  // Today is between but not exactly matching (rare edge case) → closest day before
  let nearest = 0;
  for (let i = 0; i < days.length; i++) {
    if (parseInt(days[i].date, 10) <= today) nearest = i;
  }
  return nearest;
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
npx vitest run src/lib/drTime.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/drTime.js src/lib/drTime.test.js
git commit -m "feat(lib): drTime helpers (drDayOfMonth, currentTripDayIndex)"
```

---

## Task 1.2: Remove countdown + condense home page band

**Files:**
- Modify: `src/routes/HomePage.jsx`

The public landing has a `<Countdown loaded={loaded} />` and a long stack of preview sections (AdventureMap, ProfileCard wall, PresenceChart, DayCards, Leaderboard, etc). Since logged-in users auto-redirect away, the public landing only matters for outsiders before kickoff and the brief moment after logout. Trim it to: hero / countdown-replacement, presence chart, profile cards, login CTA.

- [ ] **Step 1: Read `src/routes/HomePage.jsx`** — note the structure (it's ~1034 lines).

- [ ] **Step 2: Remove the `<Countdown />` rendering**

Find the JSX `<Countdown loaded={loaded} />` line and replace with a static hero copy block:

```jsx
<div style={{
  textAlign: "center", color: C.white,
  fontFamily: "'Dela Gothic One', sans-serif",
  fontSize: "clamp(24px, 6vw, 40px)", lineHeight: 1.1,
  margin: "24px 0",
}}>
  We're in Punta Cana.
</div>
```

Also remove the `Countdown` import line (`import Countdown from "../components/Countdown.jsx";`).

- [ ] **Step 3: Build to confirm no orphans**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build. If the `Countdown.jsx` file is now unimported anywhere else (`grep -rn "Countdown" src/`), leave the file in place — we're not pruning files in this task.

- [ ] **Step 4: Commit**

```bash
git add src/routes/HomePage.jsx
git commit -m "feat(home): remove countdown; trip is underway"
```

---

## Task 1.3: Itinerary defaults to current DR day + simpler day cards

**Files:**
- Modify: `src/components/YourItineraryHome.jsx`

The file is large (~694 lines). It renders a horizontal scrollable list of DayCards with an `activeDay` state defaulting to 0. We'll default `activeDay` to today's index via `currentTripDayIndex`. Also strip per-day cards down to: title, tagline, items list with key info (breakfast / shuttle / activities), and a "more details pending" placeholder when info is light.

- [ ] **Step 1: Read `src/components/YourItineraryHome.jsx`** — locate `useState(0)` and the DayCard component.

- [ ] **Step 2: Default activeDay to current DR trip day**

At the top of `YourItineraryHome`, add:

```jsx
import { currentTripDayIndex } from "../lib/drTime.js";
```

Change the state init from:
```jsx
const [activeDay, setActiveDay] = useState(0);
```
to:
```jsx
const [activeDay, setActiveDay] = useState(() => currentTripDayIndex(DAYS));
```

(`DAYS` is the existing import from `src/data/itinerary.js`. Confirm it's imported in this file; if not, add `import { DAYS } from "../data/itinerary.js";`.)

- [ ] **Step 3: Simplify the DayCard body**

Find the DayCard's inner JSX. Replace the over-engineered "time blocks" structure with a flatter list. Each item line shows: time (if set) + activity + optional note. If the day has fewer than 2 items, append a final line: "More details pending — drop a comment."

Concrete patch (only the items-rendering block changes — keep the day header card chrome):

```jsx
// inside DayCard's body, where items are rendered:
{day.items && day.items.length > 0 ? (
  <ul style={{
    listStyle: "none", padding: 0, margin: 0,
    display: "flex", flexDirection: "column", gap: 10,
  }}>
    {day.items.map((it, i) => (
      <li key={i} style={{
        display: "flex", alignItems: "baseline", gap: 8,
        fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.dark,
      }}>
        {it.time && (
          <span style={{
            fontWeight: 800, color: C.textBody, minWidth: 56, fontSize: 12,
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>{it.time}</span>
        )}
        <span>
          {it.icon ? `${it.icon} ` : ""}{it.activity}
          {it.note && <span style={{ color: C.textBody }}> — {it.note}</span>}
        </span>
      </li>
    ))}
  </ul>
) : null}
{(!day.items || day.items.length < 2) && (
  <div style={{
    marginTop: 12, padding: "8px 12px",
    background: C.sand, borderRadius: 8,
    fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody, fontStyle: "italic",
  }}>
    More details pending — drop a comment.
  </div>
)}
```

- [ ] **Step 4: Build + manual smoke**

```bash
npm run build 2>&1 | tail -5
```

Open `/player/khari` (or the dev itinerary page) and confirm:
- The day card that's selected by default matches today's calendar day in DR
- Days with sparse items show the "More details pending" hint

- [ ] **Step 5: Commit**

```bash
git add src/components/YourItineraryHome.jsx
git commit -m "feat(itinerary): default to current DR day; simpler day cards with pending hint"
```

---

## Task 1.4: Collapsible holiday name editor (once set)

**Files:**
- Modify: `src/components/HolidayNameEditor.jsx` (or wherever the editor lives — it was added in the user's `9bc53f8` commit)
- Modify: `src/routes/PlayerPage.jsx`

- [ ] **Step 1: Locate the editor**

```bash
grep -rln "holidayName" src/ --include="*.jsx" --include="*.js"
```

Identify the file rendering the editor UI. Confirm it uses `api.players.setMyHolidayName`. Note: there's also a `holidayNameMap` query and a `useHolidayNameMap` hook.

- [ ] **Step 2: Add a `defaultCollapsed` prop**

Modify the editor component:
1. Accept a `defaultCollapsed` prop (boolean, default false)
2. Add internal `useState(defaultCollapsed)` for `collapsed`
3. When `collapsed === true`, render a compact one-liner: "Holiday name: \<value\> — [Edit]"
4. Tapping Edit sets collapsed false → full form
5. After submit, set collapsed true again

Skeleton:

```jsx
const [collapsed, setCollapsed] = useState(defaultCollapsed && Boolean(currentName));

if (collapsed) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 12px", background: C.sand, borderRadius: 8,
      fontFamily: "Nunito, sans-serif", fontSize: 13,
    }}>
      <span style={{ flex: 1 }}>
        Holiday name: <strong>{currentName}</strong>
      </span>
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        style={{
          padding: "4px 10px", borderRadius: 6,
          background: "transparent", border: `1px solid ${C.dark}`, color: C.dark,
          fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, cursor: "pointer",
        }}
      >
        Edit
      </button>
    </div>
  );
}

// ...existing expanded form...
// In the form's onSubmit, after `await setMyHolidayName(...)`, call `setCollapsed(true)`.
```

- [ ] **Step 3: Pass `defaultCollapsed` from PlayerPage**

In `src/routes/PlayerPage.jsx`, wherever the editor is rendered, change to:

```jsx
<HolidayNameEditor defaultCollapsed />
```

- [ ] **Step 4: Build + manual smoke**

```bash
npm run build 2>&1 | tail -5
```

Open `/player/khari`. The holiday name editor should appear collapsed if your name is set, with an Edit button.

- [ ] **Step 5: Commit**

```bash
git add src/components/HolidayNameEditor.jsx src/routes/PlayerPage.jsx
git commit -m "feat(home): collapse holiday name editor when set; Edit button re-expands"
```

---

## Task 1.5: Smaller, collapsible adventure cards

**Files:**
- Modify: `src/components/AdventuresPanel.jsx`

The file is 413 lines and renders activity rows with verbose details. Make each row a tight one-liner that expands on tap.

- [ ] **Step 1: Read `src/components/AdventuresPanel.jsx`** to find the activity row rendering.

- [ ] **Step 2: Replace the verbose row with a compact collapsible row**

Track an `expandedId` state per the panel component:

```jsx
const [expandedId, setExpandedId] = useState(null);
```

Replace each rendered activity row with:

```jsx
<div key={a.id}>
  <button
    type="button"
    onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
    style={{
      width: "100%", display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", background: "transparent", border: 0,
      borderBottom: `1px solid ${C.sandDark}`, cursor: "pointer",
      textAlign: "left",
    }}
  >
    <span style={{ fontSize: 22, lineHeight: 1 }}>{a.icon ?? "📍"}</span>
    <span style={{
      flex: 1, fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 14, color: C.dark,
    }}>{a.title}</span>
    {/* status pill: planning vs booked */}
    <span style={{
      fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10, letterSpacing: 0.5,
      textTransform: "uppercase",
      color: a.status === "booked" ? C.green : C.gold,
    }}>
      {a.status === "booked" ? "Booked" : "Planning"}
    </span>
    <span style={{ color: C.textBody }}>{expandedId === a.id ? "▴" : "▾"}</span>
  </button>

  {expandedId === a.id && (
    <div style={{
      padding: "12px 16px 16px",
      background: C.sand,
      fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.dark,
    }}>
      {a.cost && <div style={{ marginBottom: 6 }}><strong>Cost:</strong> {a.cost}</div>}
      {a.duration && <div style={{ marginBottom: 6 }}><strong>Duration:</strong> {a.duration}</div>}
      {a.note && <div style={{ marginBottom: 6 }}>{a.note}</div>}
      {a.link && (
        <a href={a.link} target="_blank" rel="noreferrer"
          style={{ color: C.coralDeep, textDecoration: "underline" }}>
          More info ↗
        </a>
      )}
      {/* Vote buttons (existing onVote handler is wired) */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={() => onVote(a.id, "like")}
          style={voteStyle(myVote === "like", C.green)}>
          👍 Yes ({likeCount})
        </button>
        <button type="button" onClick={() => onVote(a.id, "dislike")}
          style={voteStyle(myVote === "dislike", C.coralDeep)}>
          👎 No ({dislikeCount})
        </button>
      </div>
    </div>
  )}
</div>
```

Define `voteStyle` near the top of the file (or inline if simpler):

```jsx
function voteStyle(active, color) {
  return {
    padding: "6px 12px", borderRadius: 8, border: 0,
    background: active ? color : "rgba(0,0,0,0.05)",
    color: active ? C.white : C.dark,
    fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12,
    cursor: "pointer",
  };
}
```

- [ ] **Step 3: Build + manual smoke**

```bash
npm run build 2>&1 | tail -5
```

Adventures should now scan as a tight list. Tap a row → expands inline with full info + vote.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdventuresPanel.jsx
git commit -m "feat(adventures): compact rows that expand on tap"
```

---

## Task 1.6: Games page — Today's claims panel at top

**Files:**
- Create: `src/components/TodaysClaims.jsx`
- Modify: `src/routes/PlayerGamesPage.jsx`

A small collapsible panel showing the claims the player has made today, with timestamps. Defaults to expanded if there are claims, collapsed otherwise. Data comes from `api.leaderboard.getRecentActivity` filtered to current `dailyKey` and `subjectSlug === mySlug`.

- [ ] **Step 1: Create `src/components/TodaysClaims.jsx`**

```jsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { C } from "../data/colors.js";
import { MICRO_LABEL } from "../data/design.js";
import Card from "./primitives/Card.jsx";

function formatTime(ms) {
  const d = new Date(ms);
  // Format as HH:MM local time.
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TodaysClaims() {
  const session = useSession();
  const token = session?.token;
  const mySlug = session?.slug;
  const { currentDailyKey } = useGameState();
  const recent = useQuery(
    api.leaderboard.getRecentActivity,
    token ? { limit: 100, token } : "skip",
  ) ?? [];

  const mineToday = recent
    .filter((e) => e.subjectSlug === mySlug && e.dailyKey === currentDailyKey)
    .sort((a, b) => b.createdAt - a.createdAt);

  const [open, setOpen] = useState(mineToday.length > 0);

  const total = mineToday.reduce(
    (sum, e) => (e.status === "disputed" ? sum : sum + e.points),
    0,
  );

  return (
    <Card padding={14} style={{ marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          background: "transparent", border: 0, padding: 0, cursor: "pointer",
        }}
      >
        <span style={{ ...MICRO_LABEL, color: C.gold }}>Today's claims</span>
        <span style={{
          fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18,
          color: total >= 0 ? C.green : C.coralDeep,
        }}>
          {total >= 0 ? "+" : ""}{total}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody,
        }}>
          {mineToday.length} claim{mineToday.length === 1 ? "" : "s"}
        </span>
        <span style={{ color: C.textBody }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && mineToday.length > 0 && (
        <ul style={{
          listStyle: "none", padding: 0, margin: "12px 0 0",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {mineToday.map((e) => (
            <li key={e._id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 0", borderTop: `1px solid ${C.sandDark}`,
              fontFamily: "Nunito, sans-serif", fontSize: 13,
              opacity: e.status === "disputed" ? 0.5 : 1,
              textDecoration: e.status === "disputed" ? "line-through" : "none",
            }}>
              <span style={{ color: C.textBody, fontSize: 11, minWidth: 48 }}>
                {formatTime(e.createdAt)}
              </span>
              <span style={{ flex: 1 }}>
                {e.type === "challenge"
                  ? (e.challengeId ?? "challenge")
                  : `foul: ${e.negativeId ?? ""}`}
              </span>
              <strong style={{
                color: e.points >= 0 ? C.green : C.coralDeep,
              }}>
                {e.points >= 0 ? "+" : ""}{e.points}
              </strong>
              {e.status === "verified" && <span>🛡</span>}
            </li>
          ))}
        </ul>
      )}

      {open && mineToday.length === 0 && (
        <div style={{
          marginTop: 10, fontFamily: "Nunito, sans-serif", fontSize: 13,
          color: C.textBody,
        }}>
          Nothing tagged yet today. Tap a challenge below.
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Render in `PlayerGamesPage.jsx`**

Edit `src/routes/PlayerGamesPage.jsx`. Add import:

```jsx
import TodaysClaims from "../components/TodaysClaims.jsx";
```

In the JSX, inside the second `<SectionBand bg="white">` band (the one wrapping ChallengesSection), before `<Reveal delay={0.05}><ChallengesSection /></Reveal>`, add:

```jsx
<Reveal>
  <TodaysClaims />
</Reveal>
```

- [ ] **Step 3: Build + manual smoke**

```bash
npm run build 2>&1 | tail -5
```

Open `/player/khari/games`. Claim a few things. The Today's claims panel updates with timestamps.

- [ ] **Step 4: Commit**

```bash
git add src/components/TodaysClaims.jsx src/routes/PlayerGamesPage.jsx
git commit -m "feat(games): collapsible Today's claims panel with timestamps + running total"
```

---

## Task 1.7: Better games heading narrative

**Files:**
- Modify: `src/components/ChallengesSection.jsx`

Replace literal "Challenges — Day N" with thematic copy.

- [ ] **Step 1: Read `src/components/ChallengesSection.jsx`** — find the `<h2>` or section header that currently reads "Challenges — Day {currentDayNumber}".

- [ ] **Step 2: Replace with**

```jsx
{gamesLive ? (
  <div style={{ marginBottom: 12 }}>
    <div style={{
      fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11,
      letterSpacing: 3, textTransform: "uppercase", color: C.gold, marginBottom: 4,
    }}>
      Day {currentDayNumber} · The hunt
    </div>
    <div style={{
      fontFamily: "'Dela Gothic One', sans-serif",
      fontSize: "clamp(22px, 5vw, 30px)", color: C.dark, lineHeight: 1.1,
    }}>
      What did you just do?
    </div>
  </div>
) : null}
```

(Replace the existing `<h2>Challenges — Day {currentDayNumber}</h2>` block.)

- [ ] **Step 3: Build + commit**

```bash
npm run build 2>&1 | tail -5
git add src/components/ChallengesSection.jsx
git commit -m "polish(games): thematic heading 'What did you just do?'"
```

---

## Task 1.8: Verify questionnaire is hidden everywhere

**Files:**
- Audit only; modify only if a render path is still exposed.

- [ ] **Step 1: Grep for usages**

```bash
grep -rn "CrewAnswersPanel\|QuestionBlock" src/ --include="*.jsx" --include="*.js"
```

Confirm every reference is either:
- Inside the component file itself (import or definition)
- A `false &&` short-circuited render

If any unguarded `<CrewAnswersPanel ... />` or `<QuestionBlock ... />` is found, wrap it with `{false && ...}` per the established convention.

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit (only if changes were needed)**

```bash
git add <whatever>
git commit -m "chore(home): ensure questionnaire UI is hidden everywhere"
```

If nothing changed, skip the commit.

---

## Task 1.9: Flow-state design polish

**Files:**
- Modify: `src/data/colors.js` (NO breaking changes — add tokens only)
- Modify: `src/routes/PlayerGamesPage.jsx` (use new accent)
- Modify: `src/components/Reveal.jsx` (slightly slower fade for a "drift" feel)

"Flow state" reads as smooth, watery, lit — turquoise + soft glow + slower easing.

- [ ] **Step 1: Add a token to colors** (additive only)

In `src/data/colors.js`, add `flow: "#5DD2D9"` (a softer turquoise) at the end of the `C` object. Don't remove or rename any existing keys.

- [ ] **Step 2: Slow down the Reveal animation**

In `src/components/Reveal.jsx`, find the `duration` and `easing` constants. Change duration from `0.8s` to `1.0s` and keep easing `cubic-bezier(0.16,1,0.3,1)`.

- [ ] **Step 3: Use the new flow accent on PlayerGamesPage hero**

In `src/routes/PlayerGamesPage.jsx`, where the eyebrow on the DashboardHero uses `player?.color ?? ACCENT`, add a subtle glow to the Card:

```jsx
<Card tint={player?.color ?? C.gold} padding={20} style={{
  boxShadow: `0 4px 20px ${player?.color ?? C.flow}30, 0 0 0 1px ${player?.color ?? C.flow}15`,
}}>
```

- [ ] **Step 4: Build + smoke**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/data/colors.js src/components/Reveal.jsx src/routes/PlayerGamesPage.jsx
git commit -m "polish: flow-state palette token + slower reveal motion + glow on hero"
```

---

# Phase 2 — Day comments

Goal: Each itinerary day card gets a comment thread so the crew can leave "I want to do this" / "I'll skip this" notes.

---

## Task 2.1: Schema + Convex `dayComments` table

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the table definition**

Inside the `defineSchema({...})` block, after `adminRoles`, add:

```ts
dayComments: defineTable({
  dayDate: v.string(),         // e.g. "21 May" — matches DAYS[i].date
  authorSlug: v.string(),
  text: v.string(),
  createdAt: v.number(),
}).index("by_day", ["dayDate"]),
```

- [ ] **Step 2: Push schema**

```bash
npx convex dev --once
```

Expected: `✔ Convex functions ready!`

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): dayComments table"
```

---

## Task 2.2: `dayComments.add` mutation + tests

**Files:**
- Create: `convex/dayComments.ts`
- Create: `convex/dayComments.test.ts`

- [ ] **Step 1: Write tests**

```ts
// convex/dayComments.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t, slug, isAdmin = false) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
    if (isAdmin) await ctx.db.insert("adminRoles", { playerSlug: slug });
  });
}

describe("dayComments.add", () => {
  it("inserts a comment with the caller as author", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.dayComments.add, {
      token: "tok-khari", dayDate: "21 May", text: "Excited for Saona",
    });
    const rows = await t.run((ctx) => ctx.db.query("dayComments").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].authorSlug).toBe("khari");
    expect(rows[0].dayDate).toBe("21 May");
    expect(rows[0].text).toBe("Excited for Saona");
  });

  it("rejects empty text", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await expect(t.mutation(api.dayComments.add, {
      token: "tok-khari", dayDate: "21 May", text: "  ",
    })).rejects.toThrow(/text required/);
  });

  it("rejects invalid session", async () => {
    const t = convexTest(schema);
    await expect(t.mutation(api.dayComments.add, {
      token: "bogus", dayDate: "21 May", text: "hi",
    })).rejects.toThrow(/invalid session/);
  });

  it("caps text at 280 chars", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    const long = "x".repeat(500);
    await t.mutation(api.dayComments.add, {
      token: "tok-khari", dayDate: "21 May", text: long,
    });
    const rows = await t.run((ctx) => ctx.db.query("dayComments").collect());
    expect(rows[0].text.length).toBe(280);
  });
});
```

- [ ] **Step 2: Run, expect failures**

```bash
npx vitest run convex/dayComments.test.ts
```

- [ ] **Step 3: Implement `convex/dayComments.ts`**

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

const MAX_TEXT = 280;

export const add = mutation({
  args: { token: v.string(), dayDate: v.string(), text: v.string() },
  handler: async (ctx, { token, dayDate, text }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const cleaned = text.trim().slice(0, MAX_TEXT);
    if (cleaned.length === 0) throw new Error("text required");
    await ctx.db.insert("dayComments", {
      dayDate, authorSlug: playerSlug, text: cleaned, createdAt: Date.now(),
    });
  },
});

export const listByDay = query({
  args: { dayDate: v.string() },
  handler: async (ctx, { dayDate }) => {
    const rows = await ctx.db
      .query("dayComments")
      .withIndex("by_day", (q) => q.eq("dayDate", dayDate))
      .collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const remove = mutation({
  args: { token: v.string(), commentId: v.id("dayComments") },
  handler: async (ctx, { token, commentId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const row = await ctx.db.get(commentId);
    if (!row) throw new Error("not found");
    if (row.authorSlug !== playerSlug) {
      // Allow admins to remove anyone's comment.
      await requireAdmin(ctx, playerSlug);
    }
    await ctx.db.delete(commentId);
  },
});
```

- [ ] **Step 4: Run tests, expect pass**

```bash
npx vitest run convex/dayComments.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add convex/dayComments.ts convex/dayComments.test.ts
git commit -m "feat(convex): dayComments.add / listByDay / remove"
```

---

## Task 2.3: `DayCommentThread` UI

**Files:**
- Create: `src/components/DayCommentThread.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import { MICRO_LABEL } from "../data/design.js";
import Avatar from "./primitives/Avatar.jsx";

function nameOf(slug) {
  return PLAYERS.find((p) => p.slug === slug)?.name ?? slug;
}
function playerOf(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

export default function DayCommentThread({ dayDate }) {
  const session = useSession();
  const token = session?.token;
  const comments = useQuery(api.dayComments.listByDay, { dayDate }) ?? [];
  const add = useMutation(api.dayComments.add);
  const remove = useMutation(api.dayComments.remove);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !token) return;
    setSubmitting(true);
    try {
      await add({ token, dayDate, text });
      setText("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const del = async (id) => {
    if (!token) return;
    if (!confirm("Delete this comment?")) return;
    try { await remove({ token, commentId: id }); } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>
        Comments ({comments.length})
      </div>

      {comments.map((c) => {
        const p = playerOf(c.authorSlug);
        const isMine = c.authorSlug === session?.slug;
        return (
          <div key={c._id} style={{
            display: "flex", gap: 8, padding: "8px 0",
            borderTop: `1px solid ${C.sandDark}`,
          }}>
            {p && <Avatar player={p} size="sm" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12,
                color: p?.color ?? C.dark,
              }}>{nameOf(c.authorSlug)}</div>
              <div style={{
                fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.dark, wordBreak: "break-word",
              }}>{c.text}</div>
            </div>
            {isMine && (
              <button type="button" onClick={() => del(c._id)}
                style={{
                  alignSelf: "flex-start", padding: "2px 8px", borderRadius: 6,
                  background: "transparent", border: `1px solid ${C.sandDark}`, color: C.textBody,
                  fontFamily: "Nunito, sans-serif", fontSize: 11, cursor: "pointer",
                }}>×</button>
            )}
          </div>
        );
      })}

      {token && (
        <form onSubmit={submit} style={{
          display: "flex", gap: 8, marginTop: 10,
        }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Drop a comment…"
            maxLength={280}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${C.sandDark}`,
              fontFamily: "Nunito, sans-serif", fontSize: 14,
            }}
          />
          <button type="submit" disabled={submitting || !text.trim()}
            style={{
              padding: "8px 14px", borderRadius: 8, border: 0,
              background: C.green, color: C.white,
              fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}>
            {submitting ? "..." : "Post"}
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render inside DayCard in `YourItineraryHome.jsx`**

Add `import DayCommentThread from "./DayCommentThread.jsx";` at the top.

Inside the expanded DayCard view (at the bottom, after the items list), add:

```jsx
<DayCommentThread dayDate={day.date} />
```

- [ ] **Step 3: Build + smoke**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/components/DayCommentThread.jsx src/components/YourItineraryHome.jsx
git commit -m "feat(itinerary): per-day comment thread"
```

---

# Phase 3 — Adventure comments

Same pattern as day comments but keyed by `activityId`.

---

## Task 3.1: Schema + `activityComments` table

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add table definition**

After `dayComments`:

```ts
activityComments: defineTable({
  activityId: v.string(),
  authorSlug: v.string(),
  text: v.string(),
  createdAt: v.number(),
}).index("by_activity", ["activityId"]),
```

- [ ] **Step 2: Push + commit**

```bash
npx convex dev --once
git add convex/schema.ts
git commit -m "feat(convex): activityComments table"
```

---

## Task 3.2: `activityComments` mutations + query + tests

**Files:**
- Create: `convex/activityComments.ts`
- Create: `convex/activityComments.test.ts`

Mirror the `dayComments` pattern exactly. The args are `{token, activityId, text}` for add and `{activityId}` for the query. Use a `MAX_TEXT = 280` cap. Reject empty.

- [ ] **Step 1: Tests** — copy `convex/dayComments.test.ts` adapting field names.

```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t, slug) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
  });
}

describe("activityComments.add", () => {
  it("inserts a comment", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.activityComments.add, {
      token: "tok-khari", activityId: "saona", text: "We have to do this",
    });
    const rows = await t.run((ctx) => ctx.db.query("activityComments").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].activityId).toBe("saona");
    expect(rows[0].text).toBe("We have to do this");
  });

  it("rejects empty text", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await expect(t.mutation(api.activityComments.add, {
      token: "tok-khari", activityId: "saona", text: " ",
    })).rejects.toThrow(/text required/);
  });
});

describe("activityComments.listByActivity", () => {
  it("returns comments for an activity ordered oldest first", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("activityComments", { activityId: "saona", authorSlug: "kai", text: "a", createdAt: 1 });
      await ctx.db.insert("activityComments", { activityId: "saona", authorSlug: "khari", text: "b", createdAt: 2 });
      await ctx.db.insert("activityComments", { activityId: "other", authorSlug: "khari", text: "c", createdAt: 3 });
    });
    const rows = await t.query(api.activityComments.listByActivity, { activityId: "saona" });
    expect(rows.map((r) => r.text)).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: Implementation `convex/activityComments.ts`**

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

const MAX_TEXT = 280;

export const add = mutation({
  args: { token: v.string(), activityId: v.string(), text: v.string() },
  handler: async (ctx, { token, activityId, text }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const cleaned = text.trim().slice(0, MAX_TEXT);
    if (cleaned.length === 0) throw new Error("text required");
    await ctx.db.insert("activityComments", {
      activityId, authorSlug: playerSlug, text: cleaned, createdAt: Date.now(),
    });
  },
});

export const listByActivity = query({
  args: { activityId: v.string() },
  handler: async (ctx, { activityId }) => {
    const rows = await ctx.db
      .query("activityComments")
      .withIndex("by_activity", (q) => q.eq("activityId", activityId))
      .collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const remove = mutation({
  args: { token: v.string(), commentId: v.id("activityComments") },
  handler: async (ctx, { token, commentId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const row = await ctx.db.get(commentId);
    if (!row) throw new Error("not found");
    if (row.authorSlug !== playerSlug) {
      await requireAdmin(ctx, playerSlug);
    }
    await ctx.db.delete(commentId);
  },
});
```

- [ ] **Step 3: Tests pass**

```bash
npx vitest run convex/activityComments.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add convex/activityComments.ts convex/activityComments.test.ts
git commit -m "feat(convex): activityComments.add / listByActivity / remove"
```

---

## Task 3.3: `ActivityCommentThread` UI

**Files:**
- Create: `src/components/ActivityCommentThread.jsx`
- Modify: `src/components/AdventuresPanel.jsx`

- [ ] **Step 1: Create the component**

It's identical to `DayCommentThread` but keyed on `activityId` and calls `api.activityComments.*`. Copy the entire content of `DayCommentThread.jsx` to `ActivityCommentThread.jsx` and replace:
- `dayDate` prop → `activityId` prop
- `api.dayComments.add` → `api.activityComments.add`
- `api.dayComments.listByDay({dayDate})` → `api.activityComments.listByActivity({activityId})`
- `api.dayComments.remove` → `api.activityComments.remove`

- [ ] **Step 2: Render inside the expanded adventure row**

In `src/components/AdventuresPanel.jsx`, inside the `{expandedId === a.id && (...)}` block from Task 1.5, after the vote buttons, add:

```jsx
import ActivityCommentThread from "./ActivityCommentThread.jsx";
// ...
<ActivityCommentThread activityId={a.id} />
```

- [ ] **Step 3: Build + commit**

```bash
npm run build 2>&1 | tail -5
git add src/components/ActivityCommentThread.jsx src/components/AdventuresPanel.jsx
git commit -m "feat(adventures): per-activity comment thread"
```

---

# Phase 4 — Suggest an adventure

Mirrors the challenges-suggestions pipeline. Crew proposes a title → admin sets a category + a placeholder cost → group votes 5-of-8 → on approval it lands as a new entry in the activities list.

---

## Task 4.1: `activitySuggestions` schema

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add tables**

```ts
activitySuggestions: defineTable({
  proposerSlug: v.string(),
  title: v.string(),
  notes: v.optional(v.string()),         // suggester's free-text rationale
  category: v.optional(v.string()),      // admin assigns (e.g. "excursion")
  cost: v.optional(v.string()),          // admin assigns (e.g. "$50pp")
  status: v.union(
    v.literal("proposed"),
    v.literal("voting"),
    v.literal("approved"),
    v.literal("rejected"),
  ),
  yesCount: v.number(),
  noCount: v.number(),
  createdAt: v.number(),
  draftedAt: v.optional(v.number()),
  resolvedAt: v.optional(v.number()),
}).index("by_status", ["status"]),

activitySuggestionVotes: defineTable({
  suggestionId: v.id("activitySuggestions"),
  voterSlug: v.string(),
  vote: v.union(v.literal("yes"), v.literal("no")),
  at: v.number(),
}).index("by_suggestion_and_voter", ["suggestionId", "voterSlug"]),
```

- [ ] **Step 2: Push + commit**

```bash
npx convex dev --once
git add convex/schema.ts
git commit -m "feat(convex): activitySuggestions + activitySuggestionVotes tables"
```

---

## Task 4.2: `activitySuggestions` mutations + tests

**Files:**
- Create: `convex/activitySuggestions.ts`
- Create: `convex/activitySuggestions.test.ts`

Mirror `convex/suggestions.ts` and its test file. Differences:
- Args use `notes` (optional) and admin draft sets `category` + `cost` (both strings) — no `points` or `difficulty`
- Approval threshold: 5 yes. Reject threshold: 5 no.
- On approval, just sets status="approved" — does NOT auto-insert into a separate `activities` table (the activities live in `src/data/activities.js` and the approved suggestion shows alongside them in the UI).

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlayer(t, slug, isAdmin = false) {
  await t.run(async (ctx) => {
    await ctx.db.insert("players", { slug, passcodeHash: null });
    await ctx.db.insert("sessions", { playerSlug: slug, token: `tok-${slug}`, createdAt: Date.now() });
    if (isAdmin) await ctx.db.insert("adminRoles", { playerSlug: slug });
  });
}

describe("activitySuggestions.create", () => {
  it("creates a proposed suggestion", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await t.mutation(api.activitySuggestions.create, {
      token: "tok-khari", title: "Hoyo Azul", notes: "natural cenote",
    });
    const rows = await t.run((ctx) => ctx.db.query("activitySuggestions").collect());
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe("Hoyo Azul");
    expect(rows[0].status).toBe("proposed");
  });

  it("rejects empty title", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari");
    await expect(t.mutation(api.activitySuggestions.create, {
      token: "tok-khari", title: "  ",
    })).rejects.toThrow(/title required/);
  });
});

describe("activitySuggestions.draft", () => {
  it("admin transitions to voting with category + cost", async () => {
    const t = convexTest(schema);
    await seedPlayer(t, "khari", true);
    await seedPlayer(t, "kai");
    await t.mutation(api.activitySuggestions.create, { token: "tok-kai", title: "Zip" });
    const s = await t.run((ctx) => ctx.db.query("activitySuggestions").first());
    await t.mutation(api.activitySuggestions.draft, {
      token: "tok-khari", suggestionId: s._id, category: "excursion", cost: "$60pp",
    });
    const after = await t.run((ctx) => ctx.db.get(s._id));
    expect(after.status).toBe("voting");
    expect(after.category).toBe("excursion");
    expect(after.cost).toBe("$60pp");
  });
});

describe("activitySuggestions.vote", () => {
  async function setupVoting(t) {
    await seedPlayer(t, "khari", true);
    for (const slug of ["kai", "kyanna", "candice", "camara", "miles", "ebony", "justin"]) {
      await seedPlayer(t, slug);
    }
    await seedPlayer(t, "proposer");
    await t.mutation(api.activitySuggestions.create, { token: "tok-proposer", title: "X" });
    const s = await t.run((ctx) => ctx.db.query("activitySuggestions").first());
    await t.mutation(api.activitySuggestions.draft, {
      token: "tok-khari", suggestionId: s._id, category: "excursion", cost: "$30pp",
    });
    return s._id;
  }

  it("5 yes → approved", async () => {
    const t = convexTest(schema);
    const id = await setupVoting(t);
    for (const slug of ["kai", "kyanna", "candice", "camara", "miles"]) {
      await t.mutation(api.activitySuggestions.vote, { token: `tok-${slug}`, suggestionId: id, vote: "yes" });
    }
    const s = await t.run((ctx) => ctx.db.get(id));
    expect(s.status).toBe("approved");
  });

  it("rejects self-vote", async () => {
    const t = convexTest(schema);
    const id = await setupVoting(t);
    await expect(t.mutation(api.activitySuggestions.vote, {
      token: "tok-proposer", suggestionId: id, vote: "yes",
    })).rejects.toThrow(/cannot vote on own/);
  });
});
```

- [ ] **Step 2: Implementation**

```ts
// convex/activitySuggestions.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, requireAdmin } from "./helpers";

const APPROVE_THRESHOLD = 5;
const REJECT_THRESHOLD = 5;

export const create = mutation({
  args: { token: v.string(), title: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, { token, title, notes }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const cleaned = title.trim();
    if (cleaned.length === 0) throw new Error("title required");
    await ctx.db.insert("activitySuggestions", {
      proposerSlug: playerSlug,
      title: cleaned,
      notes: notes?.trim().slice(0, 500) || undefined,
      status: "proposed",
      yesCount: 0,
      noCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const draft = mutation({
  args: {
    token: v.string(),
    suggestionId: v.id("activitySuggestions"),
    category: v.string(),
    cost: v.optional(v.string()),
  },
  handler: async (ctx, { token, suggestionId, category, cost }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status !== "proposed") throw new Error(`cannot draft in status ${s.status}`);
    await ctx.db.patch(suggestionId, {
      status: "voting",
      category,
      cost,
      draftedAt: Date.now(),
    });
  },
});

export const vote = mutation({
  args: {
    token: v.string(),
    suggestionId: v.id("activitySuggestions"),
    vote: v.union(v.literal("yes"), v.literal("no")),
  },
  handler: async (ctx, { token, suggestionId, vote }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status !== "voting") throw new Error(`cannot vote on suggestion in status ${s.status}`);
    if (s.proposerSlug === playerSlug) throw new Error("cannot vote on own suggestion");

    const existing = await ctx.db
      .query("activitySuggestionVotes")
      .withIndex("by_suggestion_and_voter", (q) =>
        q.eq("suggestionId", suggestionId).eq("voterSlug", playerSlug))
      .unique();
    if (existing) throw new Error("already voted");

    await ctx.db.insert("activitySuggestionVotes", {
      suggestionId, voterSlug: playerSlug, vote, at: Date.now(),
    });

    const newYes = vote === "yes" ? s.yesCount + 1 : s.yesCount;
    const newNo = vote === "no" ? s.noCount + 1 : s.noCount;
    const patch = { yesCount: newYes, noCount: newNo };

    if (newYes >= APPROVE_THRESHOLD) {
      patch.status = "approved";
      patch.resolvedAt = Date.now();
    } else if (newNo >= REJECT_THRESHOLD) {
      patch.status = "rejected";
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(suggestionId, patch);
  },
});

export const reject = mutation({
  args: { token: v.string(), suggestionId: v.id("activitySuggestions") },
  handler: async (ctx, { token, suggestionId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    await requireAdmin(ctx, playerSlug);
    const s = await ctx.db.get(suggestionId);
    if (!s) throw new Error("unknown suggestion");
    if (s.status === "approved" || s.status === "rejected") throw new Error("already resolved");
    await ctx.db.patch(suggestionId, { status: "rejected", resolvedAt: Date.now() });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("activitySuggestions").collect(),
});

export const myVote = query({
  args: { token: v.string(), suggestionId: v.id("activitySuggestions") },
  handler: async (ctx, { token, suggestionId }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return null;
    const v = await ctx.db
      .query("activitySuggestionVotes")
      .withIndex("by_suggestion_and_voter", (q) =>
        q.eq("suggestionId", suggestionId).eq("voterSlug", session.playerSlug))
      .unique();
    return v?.vote ?? null;
  },
});
```

- [ ] **Step 3: Tests pass**

```bash
npx vitest run convex/activitySuggestions.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add convex/activitySuggestions.ts convex/activitySuggestions.test.ts
git commit -m "feat(convex): activitySuggestions create / draft / vote / reject / list / myVote"
```

---

## Task 4.3: `ProposeActivityForm` UI inside AdventuresPanel

**Files:**
- Create: `src/components/ProposeActivityForm.jsx`
- Modify: `src/components/AdventuresPanel.jsx`

- [ ] **Step 1: Create the form**

```jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";
import { MICRO_LABEL } from "../data/design.js";

export default function ProposeActivityForm() {
  const session = useSession();
  const token = session?.token;
  const create = useMutation(api.activitySuggestions.create);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!token) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await create({ token, title, notes: notes || undefined });
      setTitle(""); setNotes(""); setOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 10,
          border: `1px dashed ${C.coralDeep}`, background: "transparent",
          color: C.coralDeep, fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13,
          cursor: "pointer", marginTop: 10,
        }}>
        + Suggest an adventure
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{
      padding: 12, borderRadius: 10, background: C.sand, marginTop: 10,
    }}>
      <div style={{ ...MICRO_LABEL, color: C.coralDeep, marginBottom: 8 }}>
        Suggest an adventure
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Hoyo Azul"
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: `1px solid ${C.sandDark}`, marginBottom: 8,
          fontFamily: "Nunito, sans-serif", fontSize: 14,
        }} />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)" rows={2}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: `1px solid ${C.sandDark}`,
          fontFamily: "Nunito, sans-serif", fontSize: 13, resize: "vertical",
        }} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={() => setOpen(false)}
          style={{
            flex: 1, padding: 10, borderRadius: 8,
            background: "transparent", border: `1px solid ${C.sandDark}`,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer",
          }}>Cancel</button>
        <button type="submit" disabled={submitting || !title.trim()}
          style={{
            flex: 1, padding: 10, borderRadius: 8,
            background: C.green, color: C.white, border: 0,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}>{submitting ? "..." : "Send"}</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Render in `AdventuresPanel`**

Inside `AdventuresPanel.jsx`, after the activity rows list, before closing the panel:

```jsx
<ProposeActivityForm />
```

Also: render approved activity suggestions inline (read-only) so they show up alongside the planned activities. Query them:

```jsx
const allActivitySuggestions = useQuery(api.activitySuggestions.list, {}) ?? [];
const approved = allActivitySuggestions.filter((s) => s.status === "approved");

// render approved ones with a small "Suggested by" tag:
{approved.map((s) => (
  <div key={s._id} style={{
    padding: "10px 12px", borderBottom: `1px solid ${C.sandDark}`,
    display: "flex", alignItems: "center", gap: 8,
  }}>
    <span style={{ fontSize: 18 }}>✨</span>
    <div style={{ flex: 1, fontFamily: "Nunito, sans-serif" }}>
      <div style={{ fontWeight: 700, color: C.dark }}>{s.title}</div>
      <div style={{ fontSize: 11, color: C.textBody }}>
        Suggested · {s.category} · {s.cost ?? "TBD"}
      </div>
    </div>
  </div>
))}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build 2>&1 | tail -5
git add src/components/ProposeActivityForm.jsx src/components/AdventuresPanel.jsx
git commit -m "feat(adventures): ProposeActivityForm + render approved suggestions inline"
```

---

## Task 4.4: Admin drafting queue for activity suggestions

**Files:**
- Modify: `src/routes/AdminPage.jsx`

- [ ] **Step 1: Add a section for activity-suggestion drafts**

Add a new SectionBand after the existing Suggestions section. Reuse the same draft pattern but call `api.activitySuggestions.draft` with `category` + `cost`.

Inline draft form (simpler than the challenge draft because no points):

```jsx
function ActivityDraftForm({ suggestion, onDone }) {
  const session = useSession();
  const token = session?.token;
  const draft = useMutation(api.activitySuggestions.draft);
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!category) { alert("Need category"); return; }
    try {
      await draft({ token, suggestionId: suggestion._id, category, cost: cost || undefined });
      onDone();
    } catch (err) { alert(err.message); }
  };
  return (
    <form onSubmit={submit} style={{ marginTop: 8, padding: 8, background: C.sand, borderRadius: 8 }}>
      <input value={category} onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (excursion / dining / nightlife)"
        style={{ padding: 6, marginRight: 6, fontFamily: "Nunito, sans-serif" }} />
      <input value={cost} onChange={(e) => setCost(e.target.value)}
        placeholder="Cost (optional)"
        style={{ padding: 6, fontFamily: "Nunito, sans-serif" }} />
      <button type="submit"
        style={{ marginLeft: 6, padding: 6, background: C.green, color: C.white, border: 0, borderRadius: 4 }}>
        Send to vote
      </button>
    </form>
  );
}
```

Inside `AdminPage`, query activity suggestions and render proposed/voting:

```jsx
const allActSugg = useQuery(api.activitySuggestions.list, {}) ?? [];
const actProposed = allActSugg.filter((s) => s.status === "proposed");
const actVoting = allActSugg.filter((s) => s.status === "voting");
```

JSX section (place after the existing challenge-suggestions Card):

```jsx
<Reveal>
  <SectionHeader label="Crowdsource" title="Activity ideas" accent={C.turquoise} compact />
</Reveal>
<Reveal>
  <Card>
    <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>
      Awaiting draft ({actProposed.length})
    </div>
    {actProposed.length === 0
      ? <div style={{ ...BODY, fontSize: 13 }}>No new ideas.</div>
      : actProposed.map((s) => (
        <ActivityProposedRow key={s._id} suggestion={s} />
      ))}
    {actVoting.length > 0 && (
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.sandDark}` }}>
        <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>
          Currently voting ({actVoting.length})
        </div>
        {actVoting.map((s) => (
          <div key={s._id} style={{
            padding: "6px 0", fontFamily: "Nunito, sans-serif", fontSize: 13,
          }}>
            {s.title} — {s.category} · 👍 {s.yesCount} 👎 {s.noCount}
          </div>
        ))}
      </div>
    )}
  </Card>
</Reveal>
```

Where `ActivityProposedRow` is a small inline component near the top of the file:

```jsx
function ActivityProposedRow({ suggestion }) {
  const session = useSession();
  const token = session?.token;
  const reject = useMutation(api.activitySuggestions.reject);
  const [drafting, setDrafting] = useState(false);
  return (
    <div style={{ padding: "8px 0", borderBottom: `1px solid ${C.sandDark}` }}>
      <div style={{ fontFamily: "'Dela Gothic One', sans-serif", color: C.dark }}>{suggestion.title}</div>
      {suggestion.notes && (
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody }}>
          {suggestion.notes}
        </div>
      )}
      {!drafting && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button type="button" onClick={() => setDrafting(true)}
            style={{ padding: "4px 10px", borderRadius: 6, background: C.sand, border: `1px solid ${C.sandDark}` }}>
            Draft
          </button>
          <button type="button"
            onClick={() => reject({ token, suggestionId: suggestion._id }).catch((e) => alert(e.message))}
            style={{ padding: "4px 10px", borderRadius: 6, background: C.coralDeep, color: C.white, border: 0 }}>
            Reject
          </button>
        </div>
      )}
      {drafting && (
        <ActivityDraftForm suggestion={suggestion} onDone={() => setDrafting(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build 2>&1 | tail -5
git add src/routes/AdminPage.jsx
git commit -m "feat(admin): activity-suggestions drafting queue"
```

---

# Phase 5 — Production deploy

After all Convex schemas land, deploy to prod.

## Task 5.1: Deploy to Convex prod

- [ ] **Step 1: Push functions + new schemas to prod**

```bash
npx convex deploy -y
```

Expected: deploys without schema errors. The 3 new tables (`dayComments`, `activityComments`, `activitySuggestions`, `activitySuggestionVotes`) appear in the prod deployment.

- [ ] **Step 2: Verify schema landed**

```bash
npx convex data --prod dayComments --limit 1
npx convex data --prod activityComments --limit 1
npx convex data --prod activitySuggestions --limit 1
```

Each should return "no rows" (tables exist but empty).

## Task 5.2: Merge to main + deploy site

- [ ] **Step 1: Push current feature branch / merge**

The work has been on `main` throughout — push to origin to trigger Vercel build:

```bash
git push origin main
```

Vercel auto-builds in ~1-2 minutes.

## Task 5.3: Smoke test on prod

- [ ] Visit production site on phone
- [ ] Log in → confirm auto-redirect to player page
- [ ] Add a day comment on today's day → confirm it appears
- [ ] Add an adventure comment on a sample adventure → confirm
- [ ] Suggest a new adventure → admin (other browser as Kai) drafts category + cost → 5 voters approve → confirm "Approved" appears inline in adventures list
- [ ] Claim a challenge → confirm Today's claims panel updates
- [ ] Multiple claims of same challenge → confirm timestamps differentiate them

---

# Self-review notes

**Spec coverage:**
- ✅ Holiday name collapsed when set (Task 1.4)
- ✅ Countdown removed (Task 1.2)
- ✅ Adventure cards smaller + collapsible (Task 1.5)
- ✅ Adventure comments (Phase 3)
- ✅ Suggest an adventure (Phase 4)
- ✅ Itinerary defaults to current DR day (Task 1.3)
- ✅ Simpler day cards with pending hint (Task 1.3)
- ✅ Day comments (Phase 2)
- ✅ Questionnaire hidden verified (Task 1.8)
- ✅ Today's claims panel on games page (Task 1.6)
- ✅ Improved "Challenges — Day 1" heading (Task 1.7)
- ✅ Flow-state design polish (Task 1.9)

**No placeholders** — every step has concrete code.

**Type consistency** — `dayDate` is a string ("18 May" etc) matching `DAYS[i].date`. `activityId` is the existing `a.id` from `activities.js`. `suggestionId` is `Id<"activitySuggestions">` (distinct from challenge suggestions).

**Order matters:**
- Task 1.1 (drTime) is a dependency of Task 1.3
- Phase 2 schema (Task 2.1) must land before Task 2.3 (UI)
- Phase 3 schema before Phase 3 UI
- Phase 4 schemas before Phase 4 UI
- Phase 5 (deploy) runs last

# Execution

Plan saved. Pick subagent-driven execution to plow through all 21 tasks in this session, or hand to a parallel session.
