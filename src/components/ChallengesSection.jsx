import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { showToast } from "../lib/useToast.js";
import { C } from "../data/colors.js";
import { BODY, MICRO_LABEL, EYEBROW, HEADING, RADIUS } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import Pill from "./primitives/Pill.jsx";
import ChallengeCard from "./ChallengeCard.jsx";
import ClaimSheet from "./ClaimSheet.jsx";

const ALL_DIFFICULTIES = ["easy", "medium", "wild"];

const DIFFICULTY_COLOR = {
  easy: C.green,
  medium: C.gold,
  wild: C.coralDeep,
};

const SORT_OPTIONS = [
  { key: "default", label: "Default" },
  { key: "pointsDesc", label: "Most points" },
  { key: "pointsAsc", label: "Least points" },
  { key: "newest", label: "Newest" },
];

function sortChallenges(list, sortKey) {
  const sorted = [...list];
  if (sortKey === "pointsDesc") return sorted.sort((a, b) => b.points - a.points);
  if (sortKey === "pointsAsc") return sorted.sort((a, b) => a.points - b.points);
  if (sortKey === "newest") return sorted.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
  const order = { easy: 0, medium: 1, wild: 2 };
  return sorted.sort((a, b) => {
    const d = (order[a.difficulty] ?? 9) - (order[b.difficulty] ?? 9);
    if (d !== 0) return d;
    return b.points - a.points;
  });
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChallengesSection() {
  const { gamesLive, currentDayNumber, currentDailyKey } = useGameState();
  const challenges = useQuery(api.challenges.listActive) ?? [];
  const session = useSession();
  const token = session?.token;
  const mySlug = session?.slug;
  const activity = useQuery(
    api.leaderboard.getRecentActivity,
    token ? { limit: 100, token } : "skip",
  ) ?? [];
  const claim = useMutation(api.entries.claim);
  const unclaim = useMutation(api.entries.unclaim);

  const [activeChallenge, setActiveChallenge] = useState(null);
  const [filters, setFilters] = useState(() => new Set(ALL_DIFFICULTIES));
  const [sortKey, setSortKey] = useState("default");
  const [claimsOpen, setClaimsOpen] = useState(true);

  const visibleChallenges = useMemo(() => {
    const filtered = challenges.filter((c) => filters.has(c.difficulty));
    return sortChallenges(filtered, sortKey);
  }, [challenges, filters, sortKey]);

  if (!gamesLive) {
    return (
      <Card>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18 }}>
          Games kick off after breakfast (Day 1).
        </div>
        <div style={{ ...BODY, marginTop: 8 }}>
          Once Khari or Kai pulls the trigger, this is where you'll claim challenges.
        </div>
      </Card>
    );
  }

  const mineToday = activity.filter(
    (e) => e.subjectSlug === mySlug && e.dailyKey === currentDailyKey,
  );
  const totalToday = mineToday.reduce(
    (sum, e) => (e.status === "disputed" ? sum : sum + e.points),
    0,
  );

  const mineRecent = activity.filter((e) => e.subjectSlug === mySlug).slice(0, 8);

  const toggleFilter = (d) => {
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      if (next.size === 0) ALL_DIFFICULTIES.forEach((x) => next.add(x));
      return next;
    });
  };

  const handleCardTap = async (challenge) => {
    if (challenge.bonus) {
      setActiveChallenge(challenge);
      return;
    }
    if (!token) {
      showToast({ message: "Not logged in", accent: C.coralDeep });
      return;
    }
    try {
      const entryId = await claim({ token, challengeId: challenge.challengeId });
      showToast({
        message: `+${challenge.points} · ${challenge.title}`,
        icon: challenge.icon,
        durationMs: 4000,
        action: { label: "Undo", onClick: () => unclaim({ token, entryId }).catch(() => {}) },
      });
    } catch (err) {
      showToast({ message: err.message || "Claim failed", accent: C.coralDeep });
    }
  };

  return (
    <section style={{ margin: "16px 0" }}>
      {/* SINGLE HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...EYEBROW, color: C.gold, marginBottom: 4 }}>
          Day {currentDayNumber} · The hunt
        </div>
        <div style={{ ...HEADING.h2, color: C.dark }}>What did you just do?</div>
      </div>

      {/* TODAY CHIP STRIP */}
      <button
        type="button"
        onClick={() => setClaimsOpen((o) => !o)}
        style={{
          width: "100%", background: `${C.gold}10`, border: `1px solid ${C.gold}25`,
          borderRadius: RADIUS.md, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          marginBottom: 12,
        }}
      >
        <span style={{ ...MICRO_LABEL, color: C.gold }}>Today</span>
        <span style={{
          fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18,
          color: totalToday >= 0 ? C.green : C.coralDeep,
        }}>
          {totalToday >= 0 ? "+" : ""}{totalToday}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody }}>
          {mineToday.length} claim{mineToday.length === 1 ? "" : "s"}
        </span>
        <span style={{ color: C.textBody }}>{claimsOpen ? "▴" : "▾"}</span>
      </button>

      {claimsOpen && mineToday.length > 0 && (
        <Card padding={0} style={{ marginBottom: 16, overflow: "hidden" }}>
          {mineToday.map((e) => (
            <div key={e._id} style={{
              padding: "8px 14px",
              borderBottom: `1px solid ${C.sandDark}`,
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: "Nunito, sans-serif", fontSize: 13,
              opacity: e.status === "disputed" ? 0.5 : 1,
              textDecoration: e.status === "disputed" ? "line-through" : "none",
            }}>
              <span style={{ fontSize: 16 }}>{e.labelIcon}</span>
              <span style={{ flex: 1 }}>{e.label}</span>
              <span style={{ color: C.textBody, fontSize: 11 }}>{formatTime(e.createdAt)}</span>
              <strong style={{ color: e.points >= 0 ? C.green : C.coralDeep }}>
                {e.points >= 0 ? "+" : ""}{e.points}
              </strong>
              {e.status === "verified" && <span>🛡</span>}
            </div>
          ))}
        </Card>
      )}
      {claimsOpen && mineToday.length === 0 && (
        <div style={{
          fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.textBody,
          marginBottom: 16, marginLeft: 4,
        }}>
          Nothing claimed yet. Tap a challenge below.
        </div>
      )}

      {/* FILTER + SORT */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
        marginBottom: 12,
      }}>
        {ALL_DIFFICULTIES.map((d) => (
          <Pill
            key={d}
            active={filters.has(d)}
            accent={DIFFICULTY_COLOR[d]}
            onClick={() => toggleFilter(d)}
            aria-pressed={filters.has(d)}
            style={{ textTransform: "capitalize" }}
          >
            {d} ({challenges.filter((c) => c.difficulty === d).length})
          </Pill>
        ))}
        <span style={{ flex: 1 }} />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          aria-label="Sort challenges"
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 12, fontWeight: 800,
            padding: "6px 10px",
            borderRadius: RADIUS.pill,
            border: `1px solid ${C.sandDark}`,
            background: C.white,
            color: C.textBody,
            cursor: "pointer",
          }}
        >
          {SORT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* CHALLENGE GRID */}
      <div style={{ display: "grid", gap: 8 }}>
        {visibleChallenges.map((c) => (
          <ChallengeCard key={c.challengeId} challenge={c} onClaim={handleCardTap} />
        ))}
      </div>

      {activeChallenge && <ClaimSheet challenge={activeChallenge} onClose={() => setActiveChallenge(null)} />}

      {/* MY RECENT */}
      {mineRecent.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>My recent</div>
          <Card padding={0} style={{ overflow: "hidden" }}>
            {mineRecent.map((e) => (
              <div key={e._id} style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${C.sandDark}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                opacity: e.status === "disputed" ? 0.5 : 1,
                textDecoration: e.status === "disputed" ? "line-through" : "none",
                fontFamily: "Nunito, sans-serif", fontSize: 13,
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{e.labelIcon}</span>
                  <span>{e.label}</span>
                </span>
                <span style={{ fontWeight: 700 }}>
                  {e.points >= 0 ? "+" : ""}{e.points}
                  {e.status === "verified" ? " 🛡" : ""}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </section>
  );
}
