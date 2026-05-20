# End-Day Button + Wheel Takeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the day-rollover trigger from `/admin` onto the Board page as an explicit **End Day** action, and replace the inline `RevealFlow` card with a full-screen takeover overlay that reveals the scoreboard and spins the wheel. Adds hard-lock guards so prior-day entries can no longer be vouched/disputed after the day rolls over.

**Architecture:** Three independent backend guards (vouch lock, dispute lock, trigger idempotency) ship first via TDD. Then a single new component (`EndDayTakeover`) wraps the existing `RevealFlow` in a fixed-position overlay. Finally `LeaderboardPage` gets the End Day button, the takeover wiring, and a pending-reveal banner replacing the inline card. The admin fallback stays on `/admin` with a relabel.

**Tech Stack:** React 18, Convex (mutations + live queries), Vite, Vitest + convex-test for backend tests. No new dependencies.

**Reference:** Spec at `docs/superpowers/specs/2026-05-20-end-day-wheel-takeover-design.md`.

---

## File Structure

**Modify:**
- `convex/entries.ts` — guard `vouch` + `dispute` on `entry.dailyKey !== state.currentDailyKey`
- `convex/entries.test.ts` — two new lock tests
- `convex/rollovers.ts` — idempotency guard on `trigger`
- `convex/rollovers.test.ts` — one new idempotency test
- `src/routes/LeaderboardPage.jsx` — End Day button, confirm sheet, takeover wiring, pending-reveal banner replaces inline `RevealFlow`
- `src/routes/AdminPage.jsx` — relabel manual rollover button as "(fallback)"

**Create:**
- `src/components/EndDayTakeover.jsx` — fixed-position overlay wrapping `RevealFlow`, refuses to close until forfeit recorded

**Untouched (reused):**
- `src/components/RevealFlow.jsx` — rendered inside the takeover instead of inline on the Board
- `src/components/games/WheelOfFortune.jsx`
- `convex/rollovers.ts → recordForfeit`, `get`, `listAll`, `undoLast`
- `src/components/primitives/BottomSheet.jsx` — used for the End Day confirm sheet

---

## Task 1: Hard-lock guard on `entries.vouch`

**Files:**
- Modify: `convex/entries.ts:47-71`
- Modify: `convex/entries.test.ts` (append test inside `describe("entries.vouch")` block at line 147)

- [ ] **Step 1: Write the failing test**

Append this test inside the `describe("entries.vouch", () => { ... })` block, just before its closing `});` near line 147 in `convex/entries.test.ts`:

```ts
it("rejects vouching after the day rolls over", async () => {
  const t = convexTest(schema);
  await seedSession(t, "kai", "tok-kai");
  await seedSession(t, "kyanna", "tok-kyanna");
  let entryId: any;
  await t.run(async (ctx) => {
    // game has advanced to day-2 but the entry was created on day-1
    await ctx.db.insert("gameState", {
      gamesLive: true,
      currentDayNumber: 2,
      currentDailyKey: "day-2",
      updatedAt: Date.now(),
    });
    entryId = await ctx.db.insert("entries", {
      type: "challenge", subjectSlug: "kai", challengeId: "x",
      points: 10, status: "active", vouchCount: 0, disputeCount: 0,
      dailyKey: "day-1", createdAt: Date.now(),
    });
  });
  await expect(t.mutation(api.entries.vouch, { token: "tok-kyanna", entryId }))
    .rejects.toThrow(/day is locked/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/entries.test.ts -t "rejects vouching after the day rolls over"`
Expected: FAIL — the test runs but the mutation succeeds (no guard yet), so the `rejects.toThrow` assertion fails.

- [ ] **Step 3: Add the hard-lock guard**

Edit `convex/entries.ts`. The current `vouch` handler (lines 47–71) starts with `requireSession`, then loads the entry, then the self-vouch check. Add the lock guard between the self-vouch check and the duplicate-reaction check:

```ts
export const vouch = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.subjectSlug === playerSlug) throw new Error("cannot react to own entry");

    const state = await getGameState(ctx);
    if (state && entry.dailyKey !== state.currentDailyKey) {
      throw new Error("day is locked");
    }

    const existing = await ctx.db
      .query("entryReactions")
      .withIndex("by_entry_and_player", (q) => q.eq("entryId", entryId).eq("playerSlug", playerSlug))
      .unique();
    if (existing) throw new Error("already reacted");

    await ctx.db.insert("entryReactions", { entryId, playerSlug, reaction: "vouch", at: Date.now() });

    const newCount = entry.vouchCount + 1;
    const patch: Record<string, any> = { vouchCount: newCount };
    if (entry.status === "active" && newCount >= 1) {
      patch.status = "verified";
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(entryId, patch);
  },
});
```

`getGameState` is already imported from `./helpers` on line 4 — no import change needed.

- [ ] **Step 4: Run the full vouch suite to verify pass + no regressions**

Run: `npx vitest run convex/entries.test.ts -t "entries.vouch"`
Expected: all four tests pass — the three pre-existing tests (verified flip, self-vouch, double vouch) plus the new lock test.

- [ ] **Step 5: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "$(cat <<'EOF'
feat(entries): hard-lock vouch on prior-day entries

Reject vouching when entry.dailyKey != gameState.currentDailyKey.
Once the day rolls over the loser is final.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Hard-lock guard on `entries.dispute`

**Files:**
- Modify: `convex/entries.ts:73-97`
- Modify: `convex/entries.test.ts` (append test inside `describe("entries.dispute")` block at line 184)

- [ ] **Step 1: Write the failing test**

Append this test inside the `describe("entries.dispute", () => { ... })` block, just before its closing `});` near line 184 in `convex/entries.test.ts`:

```ts
it("rejects disputing after the day rolls over", async () => {
  const t = convexTest(schema);
  await seedSession(t, "kai", "tok-kai");
  await seedSession(t, "kyanna", "tok-kyanna");
  let entryId: any;
  await t.run(async (ctx) => {
    await ctx.db.insert("gameState", {
      gamesLive: true,
      currentDayNumber: 2,
      currentDailyKey: "day-2",
      updatedAt: Date.now(),
    });
    entryId = await ctx.db.insert("entries", {
      type: "challenge", subjectSlug: "kai", challengeId: "x",
      points: 10, status: "active", vouchCount: 0, disputeCount: 0,
      dailyKey: "day-1", createdAt: Date.now(),
    });
  });
  await expect(t.mutation(api.entries.dispute, { token: "tok-kyanna", entryId }))
    .rejects.toThrow(/day is locked/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/entries.test.ts -t "rejects disputing after the day rolls over"`
Expected: FAIL — mutation succeeds, assertion misses.

- [ ] **Step 3: Add the hard-lock guard**

Edit `convex/entries.ts`. Mirror the guard placement from Task 1 — between the self-react check and the duplicate-reaction check:

```ts
export const dispute = mutation({
  args: { token: v.string(), entryId: v.id("entries") },
  handler: async (ctx, { token, entryId }) => {
    const { playerSlug } = await requireSession(ctx, token);
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("unknown entry");
    if (entry.subjectSlug === playerSlug) throw new Error("cannot react to own entry");

    const state = await getGameState(ctx);
    if (state && entry.dailyKey !== state.currentDailyKey) {
      throw new Error("day is locked");
    }

    const existing = await ctx.db
      .query("entryReactions")
      .withIndex("by_entry_and_player", (q) => q.eq("entryId", entryId).eq("playerSlug", playerSlug))
      .unique();
    if (existing) throw new Error("already reacted");

    await ctx.db.insert("entryReactions", { entryId, playerSlug, reaction: "dispute", at: Date.now() });

    const newCount = entry.disputeCount + 1;
    const patch: Record<string, any> = { disputeCount: newCount };
    if (entry.status === "active" && newCount >= 2) {
      patch.status = "disputed";
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(entryId, patch);
  },
});
```

- [ ] **Step 4: Run the full dispute suite to verify pass + no regressions**

Run: `npx vitest run convex/entries.test.ts -t "entries.dispute"`
Expected: all three tests pass — flips-after-2 (pre-existing), verified-final (pre-existing), and the new lock test.

- [ ] **Step 5: Commit**

```bash
git add convex/entries.ts convex/entries.test.ts
git commit -m "$(cat <<'EOF'
feat(entries): hard-lock dispute on prior-day entries

Reject disputing when entry.dailyKey != gameState.currentDailyKey,
mirroring the vouch lock.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Idempotency guard on `rollovers.trigger`

**Why:** Spec §7 flags that two End-Day taps in a row currently advance the day twice. The Board UI will guard against rapid taps, but the backend should refuse a double-close even if the client races. The check: if a rollover row already exists for `closingDay + 1`, a prior `trigger` has already advanced past `closingDay`.

**Files:**
- Modify: `convex/rollovers.ts:9-89`
- Modify: `convex/rollovers.test.ts` (append test inside `describe("rollovers.trigger")` block at line 67)

- [ ] **Step 1: Write the failing test**

Append this test inside the `describe("rollovers.trigger", () => { ... })` block, before its closing `});` near line 67 in `convex/rollovers.test.ts`:

```ts
it("rejects a second trigger for the same closing day", async () => {
  const t = convexTest(schema);
  await setupAdmins(t);
  await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // kickoff → Day 1
  await t.mutation(api.rollovers.trigger, { token: "tok-khari" }); // close Day 1 → Day 2

  // Manually rewind gameState back to Day 1 to simulate a stale client retrying
  await t.run(async (ctx) => {
    const state = await ctx.db.query("gameState").first();
    await ctx.db.patch(state!._id, {
      currentDayNumber: 1,
      currentDailyKey: "day-1",
      updatedAt: Date.now(),
    });
  });

  await expect(t.mutation(api.rollovers.trigger, { token: "tok-khari" }))
    .rejects.toThrow(/day already closed/);
});
```

Rationale for the rewind: convex-test runs mutations transactionally, so a "race" inside one mutation isn't reproducible. The rewind simulates the equivalent end state — a `closingDay+1` rollover row already exists when `trigger` runs against `closingDay`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/rollovers.test.ts -t "rejects a second trigger for the same closing day"`
Expected: FAIL — mutation succeeds (no guard yet), advancing to Day 2 again.

- [ ] **Step 3: Add the idempotency guard**

Edit `convex/rollovers.ts`. Add the guard immediately after `closingDay` is captured (line 36), before the entries query:

```ts
    const closingKey = state.currentDailyKey;
    const closingDay = state.currentDayNumber;

    const nextDayRollover = await ctx.db
      .query("rollovers")
      .withIndex("by_day_number", (q) => q.eq("dayNumber", closingDay + 1))
      .first();
    if (nextDayRollover) throw new Error("day already closed");

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_daily_key", (q) => q.eq("dailyKey", closingKey))
      .collect();
```

The rest of the handler stays unchanged.

- [ ] **Step 4: Run the full trigger suite to verify pass + no regressions**

Run: `npx vitest run convex/rollovers.test.ts`
Expected: all tests pass — the four pre-existing `trigger` tests, the three `recordForfeit` tests, the two `get` tests, the four `undoLast` tests, and the new idempotency test.

- [ ] **Step 5: Commit**

```bash
git add convex/rollovers.ts convex/rollovers.test.ts
git commit -m "$(cat <<'EOF'
fix(rollovers): reject trigger when the day is already closed

Prevents a double-tap on End Day from advancing the day twice by
checking whether a placeholder rollover for the next day already
exists.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Build `EndDayTakeover` component

A fixed-position overlay (z-index above `BottomSheet` and `BottomNav`) that mounts the existing `RevealFlow` against a dark backdrop. The takeover refuses to close until `rollover.forfeitId` is set — only then does the close button appear.

**Files:**
- Create: `src/components/EndDayTakeover.jsx`

- [ ] **Step 1: Create the file with the overlay skeleton**

Create `src/components/EndDayTakeover.jsx`:

```jsx
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";
import RevealFlow from "./RevealFlow.jsx";

export default function EndDayTakeover({ open, dayNumber, onClose }) {
  const rollover = useQuery(
    api.rollovers.get,
    open && dayNumber ? { dayNumber } : "skip",
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const canClose = !!rollover?.forfeitId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: C.dark,
        zIndex: 950,
        display: "flex",
        flexDirection: "column",
        animation: "drTakeoverFade 0.35s ease",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 520 }}>
          {rollover ? (
            <RevealFlow rollover={rollover} />
          ) : (
            <div style={{
              color: C.white,
              textAlign: "center",
              fontFamily: "Nunito, sans-serif",
              padding: 32,
            }}>
              Loading…
            </div>
          )}
        </div>
      </div>

      {canClose && (
        <div style={{ padding: "16px 16px 24px", textAlign: "center" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "12px 24px",
              borderRadius: RADIUS.md,
              background: C.white,
              color: C.dark,
              border: 0,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Take it like a champ ✕
          </button>
        </div>
      )}

      <style>{`
        @keyframes drTakeoverFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
```

Design notes locked in here:
- `zIndex: 950` sits above `BottomNav` (90), `FoulModal` (100), `BottomSheet` (150), `Toast` (200), `LogoutChip` (80), and `LoggedInChip` (900) — but still below the global toast layer at 1000 (`LoginModal`, `PhotoLightbox`) so error toasts inside the takeover still render.
- `document.body.style.overflow = "hidden"` prevents the background Board from scrolling underneath.
- No backdrop click handler — closing requires the explicit button, and the button only appears after `forfeitId` is set.
- `RevealFlow` is rendered inside a max-width 520 column to match the existing card width on the Board.

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: Vite build succeeds. Bundle output size should bump by ~1 KB (the new component is small and reuses everything else).

- [ ] **Step 3: Commit**

```bash
git add src/components/EndDayTakeover.jsx
git commit -m "$(cat <<'EOF'
feat(end-day): add EndDayTakeover overlay component

Full-screen overlay wrapping RevealFlow. Refuses to dismiss until
the wheel has recorded a forfeit. Wired up to a Board button in
the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Add the End Day button to the Board (no takeover wiring yet)

This task adds the button + confirm sheet + entry-count gate. The button calls `trigger` and shows a toast on success — wiring it to open the takeover happens in Task 6 once everything is in place.

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

- [ ] **Step 1: Add the new imports + queries + mutation**

In `src/routes/LeaderboardPage.jsx`, add to the existing import block at lines 1–19:

```jsx
import { useMutation } from "convex/react";
import BottomSheet from "../components/primitives/BottomSheet.jsx";
import { showToast } from "../lib/useToast.js";
```

(`useQuery` is already imported on line 2; extend it to `import { useQuery, useMutation } from "convex/react";` rather than adding a new line.)

Inside the component (after the existing `useQuery` calls near line 106), add:

```jsx
  const isAdmin = useQuery(
    api.admin.isAdmin,
    session?.token ? { token: session.token } : "skip",
  );

  // Reuse the existing `daily` rows (already aggregated per player) — sum
  // `claimCount` across rows for total entry count.
  const currentDayEntryCount = daily.reduce((sum, row) => sum + row.claimCount, 0);

  const trigger = useMutation(api.rollovers.trigger);
  const [endDayConfirm, setEndDayConfirm] = useState(false);
  const [endDayPending, setEndDayPending] = useState(false);

  const canEndDay = !!isAdmin && gamesLive && currentDayEntryCount > 0 && !endDayPending;

  const handleEndDay = async () => {
    if (!session?.token) return;
    setEndDayPending(true);
    try {
      await trigger({ token: session.token });
      setEndDayConfirm(false);
      showToast({ message: `Day ${currentDayNumber} closed.`, accent: C.gold });
    } catch (err) {
      showToast({ message: err.message || "End Day failed", accent: C.coralDeep });
    } finally {
      setEndDayPending(false);
    }
  };
```

Note: this task computes `canEndDay` but does NOT yet open a takeover on success — that comes in Task 6. The button currently just closes the confirm sheet and toasts.

- [ ] **Step 2: Render the End Day button next to the tab pills**

Find the existing tab-pill row in `LeaderboardPage.jsx` (currently lines 130–135):

```jsx
        <Reveal>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "center" }}>
            <Pill active={tab === "daily"} accent={ACCENT} onClick={() => setTab("daily")}>Today</Pill>
            <Pill active={tab === "holiday"} accent={ACCENT} onClick={() => setTab("holiday")}>Holiday</Pill>
          </div>
        </Reveal>
```

Replace with this version that adds an End Day button on the right when `canEndDay`:

```jsx
        <Reveal>
          <div style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}>
            <Pill active={tab === "daily"} accent={ACCENT} onClick={() => setTab("daily")}>Today</Pill>
            <Pill active={tab === "holiday"} accent={ACCENT} onClick={() => setTab("holiday")}>Holiday</Pill>
            {canEndDay && (
              <button
                type="button"
                onClick={() => setEndDayConfirm(true)}
                style={{
                  marginLeft: 8,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: C.coralDeep,
                  color: C.white,
                  border: 0,
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                End Day {currentDayNumber}
              </button>
            )}
          </div>
        </Reveal>
```

- [ ] **Step 3: Render the confirm sheet at the bottom of the component**

Just before the existing `{foulTarget && (...)}` block near line 215, add:

```jsx
      <BottomSheet open={endDayConfirm} onClose={() => !endDayPending && setEndDayConfirm(false)}>
        <h3 style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 20,
          color: C.dark,
          margin: "8px 0 12px",
          textAlign: "center",
        }}>
          End Day {currentDayNumber}?
        </h3>
        <p style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 14,
          color: C.textBody,
          lineHeight: 1.45,
          textAlign: "center",
          margin: "0 0 20px",
        }}>
          This locks all of today's claims and reveals the loser.
          You can undo from <strong>/admin</strong> if needed.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => setEndDayConfirm(false)}
            disabled={endDayPending}
            style={{
              padding: "12px 20px",
              borderRadius: RADIUS.md,
              background: C.sand,
              color: C.dark,
              border: `1.5px solid ${C.sandDark}`,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              cursor: endDayPending ? "default" : "pointer",
              opacity: endDayPending ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleEndDay}
            disabled={endDayPending}
            style={{
              padding: "12px 20px",
              borderRadius: RADIUS.md,
              background: C.coralDeep,
              color: C.white,
              border: 0,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              cursor: endDayPending ? "default" : "pointer",
              opacity: endDayPending ? 0.7 : 1,
            }}
          >
            {endDayPending ? "Ending…" : "End Day"}
          </button>
        </div>
      </BottomSheet>
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds. The button only renders for admin + games-live + entries-exist, so non-admin/pre-trip views are unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
feat(board): add admin-only End Day button + confirm sheet

Visible only when isAdmin && gamesLive && current-day has claims.
Tap opens a BottomSheet confirm; confirm calls rollovers.trigger
and toasts. Wheel takeover wiring lands in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire the takeover + remove inline RevealFlow + pending-reveal banner

The Board currently renders `<RevealFlow rollover={lastClosed} />` inline whenever there's a pending reveal (lines 124–128). This task removes that, wires the End Day flow to open the new takeover, and adds a small admin-only banner that reopens the takeover if the original session was lost.

**Files:**
- Modify: `src/routes/LeaderboardPage.jsx`

- [ ] **Step 1: Add takeover open state + extend handleEndDay**

At the top of the component, alongside the `endDayConfirm` state added in Task 5, add:

```jsx
  const [takeoverOpen, setTakeoverOpen] = useState(false);
  const [takeoverDay, setTakeoverDay] = useState(null);
```

Update `handleEndDay` (added in Task 5) so that on success it opens the takeover targeting the day that just closed:

```jsx
  const handleEndDay = async () => {
    if (!session?.token) return;
    setEndDayPending(true);
    const closingDay = currentDayNumber;
    try {
      await trigger({ token: session.token });
      setEndDayConfirm(false);
      setTakeoverDay(closingDay);
      setTakeoverOpen(true);
    } catch (err) {
      showToast({ message: err.message || "End Day failed", accent: C.coralDeep });
    } finally {
      setEndDayPending(false);
    }
  };
```

(The success toast from Task 5 is dropped — the takeover IS the success affordance.)

- [ ] **Step 2: Remove the inline RevealFlow, add the admin-only pending banner**

Find the current inline render at lines 124–128:

```jsx
        {loggedIn && pendingReveal && lastClosed && (
          <Reveal>
            <RevealFlow rollover={lastClosed} />
          </Reveal>
        )}
```

Replace with this admin-only banner that opens the takeover when tapped:

```jsx
        {isAdmin && pendingReveal && lastClosed && (
          <Reveal>
            <button
              type="button"
              onClick={() => {
                setTakeoverDay(lastClosed.dayNumber);
                setTakeoverOpen(true);
              }}
              style={{
                width: "100%",
                marginBottom: 16,
                padding: "14px 18px",
                borderRadius: RADIUS.md,
                background: C.coralDeep,
                color: C.white,
                border: 0,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: 0.3,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span>Day {lastClosed.dayNumber} is unresolved — open the wheel</span>
              <span aria-hidden="true">▶</span>
            </button>
          </Reveal>
        )}
```

The `RevealFlow` import on line 15 of the original file is no longer used at the Board level — but Task 4's `EndDayTakeover` imports it from inside the takeover, so we keep the file. **Remove** the line `import RevealFlow from "../components/RevealFlow.jsx";` from `LeaderboardPage.jsx`.

- [ ] **Step 3: Render the takeover at the bottom of the component**

Add the `EndDayTakeover` import near the top of the file (alongside the other component imports at lines 9–19):

```jsx
import EndDayTakeover from "../components/EndDayTakeover.jsx";
```

Just before the existing `{foulTarget && ...}` block (where the confirm sheet was added in Task 5), render the takeover:

```jsx
      <EndDayTakeover
        open={takeoverOpen}
        dayNumber={takeoverDay}
        onClose={() => {
          setTakeoverOpen(false);
          setTakeoverDay(null);
        }}
      />
```

- [ ] **Step 4: Verify the build + tests still green**

Run: `npm run build && npm test`
Expected: Build succeeds; all 132 tests pass (131 from prior session + the 3 new backend tests from Tasks 1–3).

- [ ] **Step 5: Commit**

```bash
git add src/routes/LeaderboardPage.jsx
git commit -m "$(cat <<'EOF'
feat(board): wire End Day to the wheel takeover

Successful End Day opens EndDayTakeover targeting the day that
just closed. Inline RevealFlow on the Board is replaced by an
admin-only re-entry banner that reopens the takeover if the
session was lost mid-flow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Relabel the AdminPage manual rollover as fallback

Keep the existing admin trigger as backup — but make it visually clear it's no longer the canonical flow.

**Files:**
- Modify: `src/routes/AdminPage.jsx:200-209`

- [ ] **Step 1: Update the label + description**

Find the existing block at lines 200–209:

```jsx
            <div style={{ ...BODY, fontSize: 13, marginBottom: 14 }}>
              {state.gamesLive
                ? "Tap to lock today's scores and reveal the loser."
                : "Tap to kick off Day 1 and unlock claiming."}
            </div>
            <ActionButton onClick={handleRollover} variant="primary">
              {state.gamesLive
                ? `Trigger rollover → Day ${state.currentDayNumber + 1}`
                : "Start the games"}
            </ActionButton>
```

Replace with:

```jsx
            <div style={{ ...BODY, fontSize: 13, marginBottom: 14 }}>
              {state.gamesLive
                ? "Fallback — End Day lives on the Board now. Use this if the Board takeover is unavailable."
                : "Tap to kick off Day 1 and unlock claiming."}
            </div>
            <ActionButton onClick={handleRollover} variant="primary">
              {state.gamesLive
                ? `Manual rollover (fallback) → Day ${state.currentDayNumber + 1}`
                : "Start the games"}
            </ActionButton>
```

The pre-trip kickoff label/copy stays unchanged because that's still the canonical kickoff path — End Day on the Board isn't visible until `gamesLive=true`.

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/routes/AdminPage.jsx
git commit -m "$(cat <<'EOF'
chore(admin): relabel rollover button as Board fallback

The Board's End Day action is now canonical. /admin keeps the
button as insurance, but the copy makes the relationship clear.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Manual smoke pass on the dev deployment

No code; verify the flow end-to-end before merging.

- [ ] **Step 1: Start the dev environment**

In two terminals:

```bash
npx convex dev    # terminal A — convex backend
npm run dev       # terminal B — vite frontend
```

- [ ] **Step 2: Reset to a known state**

On `/admin`, tap **WIPE all entries…** to return to pre-trip. Then tap **Start the games** to kick off Day 1.

- [ ] **Step 3: Verify End Day is hidden when the day is empty**

Visit `/leaderboard`. Confirm: no End Day button visible (no entries yet for day-1).

- [ ] **Step 4: Claim an entry and confirm End Day appears**

On `/player/<your-slug>` (or whatever the claim entry point is), claim any challenge. Return to `/leaderboard`. Confirm: **End Day 1** button appears next to the Today/Holiday tabs.

- [ ] **Step 5: End the day and verify the takeover**

Tap **End Day 1** → confirm sheet appears → tap **End Day**. Confirm:
- Toast does NOT fire (takeover is the success affordance)
- Takeover overlay covers the screen with Stage 1 ("Day 1 — Closed")
- Background does not scroll
- Tap **Reveal scores ▼** → Stage 2 scoreboard
- Tap **Open the wheel ▶** → Stage 3 wheel
- Wheel spins → forfeit lands → close button appears at the bottom
- Tap **Take it like a champ ✕** → takeover dismisses, Board shows Day 2 leaderboard with the new rollover in the History section

- [ ] **Step 6: Verify the hard lock**

Try to vouch a Day 1 entry from a second logged-in account (open another browser/incognito). Confirm: the vouch fails with "day is locked".

- [ ] **Step 7: Verify the pending-reveal banner**

On `/admin`, tap **Manual rollover (fallback)** to close Day 2 without using the takeover (this skips opening the overlay). Return to `/leaderboard`. Confirm: an admin-only red banner reads "Day 2 is unresolved — open the wheel". Tap it → takeover opens at Stage 1 for Day 2.

- [ ] **Step 8: Verify the idempotency guard**

Open browser devtools, hit the convex mutation directly (or use the admin fallback twice in quick succession). Confirm: the second call fails with "day already closed". The Board state should not advance twice.

- [ ] **Step 9: If anything is off, file follow-ups but do not block merge**

The plan is shippable when steps 1–8 all pass. Any visual nits (overlap, animation timing, copy) can be follow-ups during the polish pass that comes after End-Day.

---

## Post-merge cleanup

After all eight tasks are merged:

1. **Update memory:** edit `project_leaderboard_design.md` to say "End Day lives on the Board; `/admin` keeps a fallback button only".
2. **Deploy convex:** `npx convex deploy --yes` — required for the new mutation guards to land in production.
3. **Confirm prod:** open the Vercel-hosted Board on the phone, log in as admin, repeat smoke step 5 against the production deployment.
4. **Hand off:** the polish pass (all 7 items from the handover review) is the next session's work, against the new shape of `LeaderboardPage.jsx`.
