import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { itemById } from "../data/scavenger.js";
import { dailyItemsFor, isDailyScavengerActive } from "../data/dailyScavenger.js";
import { C } from "../data/colors.js";
import { EYEBROW, HEADING, BODY, MICRO_LABEL, RADIUS } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import ScavengerCard from "./ScavengerCard.jsx";
import ScavengerClaimSheet from "./ScavengerClaimSheet.jsx";
import DailyScavengerReveal from "./DailyScavengerReveal.jsx";

const LS_KEY = (slug) => `scav:lastRevealedDay:${slug ?? "anon"}`;

export default function ScavengerSection() {
  const { gamesLive, currentDayNumber, currentDailyKey } = useGameState();
  const session = useSession();
  const mySlug = session?.slug;
  const mine = useQuery(api.scavenger.getMyFinds, session?.token ? { token: session.token } : "skip") ?? [];

  const [active, setActive] = useState(null);
  const [showReveal, setShowReveal] = useState(false);

  const dailyMode = isDailyScavengerActive(currentDailyKey);
  const dailyItemIds = dailyMode ? (dailyItemsFor(currentDailyKey) ?? []) : null;
  const dailyItems = useMemo(
    () => (dailyMode ? dailyItemIds.map((id) => itemById(id)).filter(Boolean) : []),
    [dailyMode, dailyItemIds],
  );

  const mineByItem = useMemo(() => {
    const m = new Map();
    for (const e of mine) {
      const prev = m.get(e.scavengerItemId);
      if (!prev || (prev.status === "disputed" && e.status !== "disputed")) {
        m.set(e.scavengerItemId, e);
      }
    }
    return m;
  }, [mine]);

  const todayFinds = mine.filter((e) => e.dailyKey === currentDailyKey && e.status !== "disputed");
  const todayPoints = todayFinds.reduce((s, e) => s + e.points, 0);

  useEffect(() => {
    if (!dailyMode || !mySlug || !currentDailyKey) return;
    try {
      const last = window.localStorage.getItem(LS_KEY(mySlug));
      if (last !== currentDailyKey) setShowReveal(true);
    } catch {
      // localStorage unavailable — skip the reveal silently
    }
  }, [dailyMode, mySlug, currentDailyKey]);

  const dismissReveal = () => {
    try {
      if (mySlug && currentDailyKey) {
        window.localStorage.setItem(LS_KEY(mySlug), currentDailyKey);
      }
    } catch {
      // ignore
    }
    setShowReveal(false);
  };

  if (!gamesLive) {
    return (
      <Card>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18 }}>
          The hunt opens with the games.
        </div>
        <div style={{ ...BODY, marginTop: 8 }}>
          Once Day 1 kicks off, this is where you'll log resort sightings.
        </div>
      </Card>
    );
  }

  if (!dailyMode) {
    return (
      <Card>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18 }}>
          Hunt resumes tomorrow.
        </div>
        <div style={{ ...BODY, marginTop: 8 }}>
          The daily 4-item hunt picks up at the next day rollover.
        </div>
      </Card>
    );
  }

  const isPracticeDay = currentDailyKey === "day-1";

  return (
    <section style={{ margin: "16px 0" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...EYEBROW, color: C.gold, marginBottom: 4 }}>
          Day {currentDayNumber} · Today's hunt
        </div>
        <div style={{ ...HEADING.h2, color: C.dark }}>Find one from each category.</div>
      </div>

      <div style={{
        background: `${C.gold}10`, border: `1px solid ${C.gold}25`,
        borderRadius: RADIUS.md, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
      }}>
        <span style={{ ...MICRO_LABEL, color: C.gold }}>Today</span>
        <span style={{
          fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18, color: C.green,
        }}>+{todayPoints}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody }}>
          {todayFinds.length} of 4
        </span>
      </div>

      {isPracticeDay && (
        <div style={{
          padding: "10px 14px",
          background: `${C.gold}15`,
          border: `1px dashed ${C.gold}55`,
          borderRadius: RADIUS.md,
          color: C.dark,
          fontFamily: "Nunito, sans-serif",
          fontSize: 13,
          marginBottom: 12,
        }}>
          <strong>Practice round</strong> — Day 1 finds count today but not toward Holiday.
        </div>
      )}

      {showReveal ? (
        <Card padding={0} style={{ overflow: "hidden", marginBottom: 12 }}>
          <DailyScavengerReveal
            dailyKey={currentDailyKey}
            isFirstReveal={isPracticeDay}
            onDone={dismissReveal}
          />
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {dailyItems.map((item) => (
            <ScavengerCard
              key={item.id}
              item={item}
              mine={mineByItem.get(item.id) ?? null}
              onTap={setActive}
            />
          ))}
        </div>
      )}

      {active && <ScavengerClaimSheet item={active} onClose={() => setActive(null)} />}
    </section>
  );
}
