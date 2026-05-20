import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { SCAVENGER_ITEMS, SCAVENGER_CATEGORIES } from "../data/scavenger.js";
import { C } from "../data/colors.js";
import { EYEBROW, HEADING, BODY, MICRO_LABEL, RADIUS } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import Pill from "./primitives/Pill.jsx";
import ScavengerCard from "./ScavengerCard.jsx";
import ScavengerClaimSheet from "./ScavengerClaimSheet.jsx";

export default function ScavengerSection() {
  const { gamesLive, currentDayNumber, currentDailyKey } = useGameState();
  const session = useSession();
  const mySlug = session?.slug;
  const mine = useQuery(api.scavenger.getMyFinds, session?.token ? { token: session.token } : "skip") ?? [];

  const [category, setCategory] = useState("all");
  const [active, setActive] = useState(null);

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

  const visible = useMemo(() => {
    if (category === "all") return SCAVENGER_ITEMS;
    return SCAVENGER_ITEMS.filter((i) => i.category === category);
  }, [category]);

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

  return (
    <section style={{ margin: "16px 0" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...EYEBROW, color: C.gold, marginBottom: 4 }}>
          Day {currentDayNumber} · Hunt the resort
        </div>
        <div style={{ ...HEADING.h2, color: C.dark }}>What did you find?</div>
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
          {todayFinds.length} find{todayFinds.length === 1 ? "" : "s"}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <Pill active={category === "all"} accent={C.gold} onClick={() => setCategory("all")}>All</Pill>
        {SCAVENGER_CATEGORIES.map((c) => (
          <Pill
            key={c.id}
            active={category === c.id}
            accent={c.color}
            onClick={() => setCategory(c.id)}
          >
            {c.icon} {c.label}
          </Pill>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {visible.map((item) => (
          <ScavengerCard
            key={item.id}
            item={item}
            mine={mineByItem.get(item.id) ?? null}
            mySlug={mySlug}
            onTap={setActive}
          />
        ))}
      </div>

      {active && <ScavengerClaimSheet item={active} onClose={() => setActive(null)} />}
    </section>
  );
}
