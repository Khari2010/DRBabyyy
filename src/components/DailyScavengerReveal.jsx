import { useEffect, useState } from "react";
import { dailyItemsFor } from "../data/dailyScavenger.js";
import { itemById, itemsByCategory, SCAVENGER_CATEGORIES } from "../data/scavenger.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

const REEL_ORDER = ["food", "plant", "animal", "object"];
const STAGGER_MS = 1000;
const FIRST_REEL_DELAY_MS = 500;
const TICK_INTERVAL_MS = 80;

function Reel({ category, finalItem, locked }) {
  const cat = SCAVENGER_CATEGORIES.find((c) => c.id === category);
  const poolItems = itemsByCategory(category);
  const [tickIdx, setTickIdx] = useState(0);

  useEffect(() => {
    if (locked) return;
    const id = setInterval(() => setTickIdx((i) => (i + 1) % poolItems.length), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [locked, poolItems.length]);

  const display = locked ? finalItem : poolItems[tickIdx % poolItems.length];

  return (
    <div
      style={{
        flex: 1,
        background: cat?.color ?? C.dark,
        color: C.white,
        borderRadius: RADIUS.md,
        padding: "16px 8px",
        textAlign: "center",
        minWidth: 70,
        transition: "transform 0.3s ease",
        transform: locked ? "scale(1.04)" : "scale(1)",
        boxShadow: locked ? `0 4px 12px ${C.dark}33` : "none",
      }}
    >
      <div style={{
        fontFamily: "Nunito, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        opacity: 0.85,
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}>
        {cat?.label ?? category}
      </div>
      <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 6 }}>
        {display?.icon ?? "❓"}
      </div>
      <div style={{
        fontFamily: "Nunito, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        minHeight: 28,
        opacity: locked ? 1 : 0.7,
      }}>
        {locked ? display?.name : "—"}
      </div>
    </div>
  );
}

export default function DailyScavengerReveal({ dailyKey, onDone, isFirstReveal = false }) {
  const ids = dailyItemsFor(dailyKey);
  const [lockedCount, setLockedCount] = useState(0);

  useEffect(() => {
    if (!ids) return;
    const timers = ids.map((_, i) =>
      setTimeout(
        () => setLockedCount((c) => Math.max(c, i + 1)),
        FIRST_REEL_DELAY_MS + i * STAGGER_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [dailyKey]);

  if (!ids) return null;

  const finalItems = ids.map((id) => itemById(id));
  const allLocked = lockedCount >= ids.length;

  return (
    <div style={{
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      alignItems: "center",
    }}>
      <div style={{
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 20,
        textAlign: "center",
        color: C.dark,
      }}>
        {isFirstReveal ? "The real game starts now." : "Today's hunt"}
      </div>
      <div style={{
        display: "flex",
        gap: 8,
        width: "100%",
        maxWidth: 480,
      }}>
        {REEL_ORDER.map((cat, i) => {
          const item = finalItems[i];
          const matchesCategory = item?.category === cat;
          return (
            <Reel
              key={cat}
              category={cat}
              finalItem={matchesCategory ? item : null}
              locked={lockedCount > i}
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={onDone}
        disabled={!allLocked}
        style={{
          marginTop: 8,
          padding: "12px 28px",
          borderRadius: RADIUS.md,
          border: 0,
          background: allLocked ? C.green : `${C.dark}55`,
          color: C.white,
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 14,
          cursor: allLocked ? "pointer" : "not-allowed",
          transition: "background 0.3s ease",
        }}
      >
        Continue
      </button>
    </div>
  );
}
