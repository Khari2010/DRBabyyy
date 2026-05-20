import { useEffect, useState } from "react";
import { dailyItemsFor } from "../data/dailyScavenger.js";
import { itemById, itemsByCategory, SCAVENGER_CATEGORIES } from "../data/scavenger.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

const REEL_ORDER = ["food", "plant", "animal", "object"];
const STAGGER_MS = 1000;
const FIRST_REEL_DELAY_MS = 500;
const TICK_INTERVAL_MS = 80;

function Checkmark() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: C.white,
        color: C.green,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 16,
        lineHeight: 1,
        boxShadow: `0 2px 8px rgba(0,0,0,0.25), 0 0 0 2px ${C.green}`,
        animation: "drFindBounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      ✓
    </div>
  );
}

function Reel({ category, finalItem, locked, find, interactive, onClick }) {
  const cat = SCAVENGER_CATEGORIES.find((c) => c.id === category);
  const poolItems = itemsByCategory(category);
  const [tickIdx, setTickIdx] = useState(0);

  useEffect(() => {
    if (locked) return;
    const id = setInterval(() => setTickIdx((i) => (i + 1) % poolItems.length), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [locked, poolItems.length]);

  const display = locked ? finalItem : poolItems[tickIdx % poolItems.length];
  const claimed = locked && !!find && find.status !== "disputed";
  const verified = claimed && find.status === "verified";
  const tappable = interactive && locked && !claimed;

  const baseStyle = {
    position: "relative",
    flex: 1,
    background: cat?.color ?? C.dark,
    color: C.white,
    borderRadius: RADIUS.md,
    padding: "16px 8px 14px",
    textAlign: "center",
    minWidth: 70,
    border: 0,
    fontFamily: "Nunito, sans-serif",
    transition: "transform 0.3s ease, box-shadow 0.3s ease, filter 0.3s ease",
    transform: locked && !claimed ? "scale(1.04)" : "scale(1)",
    boxShadow: claimed
      ? `0 0 0 2px ${C.green}, 0 6px 16px ${C.green}33`
      : locked
        ? `0 4px 12px ${C.dark}33`
        : "none",
    filter: claimed ? "saturate(0.85)" : "none",
    cursor: tappable ? "pointer" : "default",
  };

  const Inner = (
    <>
      {claimed && <Checkmark />}
      <div style={{
        fontSize: 11,
        fontWeight: 800,
        opacity: 0.9,
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.7,
      }}>
        {cat?.label ?? category}
      </div>
      <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 6 }}>
        {display?.icon ?? "❓"}
      </div>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        minHeight: 28,
        opacity: locked ? 1 : 0.7,
        lineHeight: 1.2,
      }}>
        {locked ? display?.name : "—"}
      </div>
      <div style={{
        marginTop: 8,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        opacity: locked ? 0.9 : 0,
        minHeight: 12,
      }}>
        {claimed
          ? (verified ? "Verified" : "Found")
          : tappable ? "Tap to log" : ""}
      </div>
    </>
  );

  if (!tappable) {
    return <div style={baseStyle}>{Inner}</div>;
  }
  return (
    <button type="button" onClick={onClick} style={baseStyle}>
      {Inner}
    </button>
  );
}

export default function DailyScavengerReveal({
  dailyKey,
  onDone,
  isFirstReveal = false,
  interactive = false,
  skipIntro = false,
  findsByItemId,
  onItemTap,
}) {
  const ids = dailyItemsFor(dailyKey);
  const [lockedCount, setLockedCount] = useState(skipIntro && ids ? ids.length : 0);

  useEffect(() => {
    if (!ids) return;
    if (skipIntro) {
      setLockedCount(ids.length);
      return;
    }
    setLockedCount(0);
    const timers = ids.map((_, i) =>
      setTimeout(
        () => setLockedCount((c) => Math.max(c, i + 1)),
        FIRST_REEL_DELAY_MS + i * STAGGER_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [dailyKey, skipIntro, ids]);

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
      {!interactive && (
        <div style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 20,
          textAlign: "center",
          color: C.dark,
        }}>
          {isFirstReveal ? "The real game starts now." : "Today's hunt"}
        </div>
      )}
      <div style={{
        display: "flex",
        gap: 8,
        width: "100%",
        maxWidth: 480,
      }}>
        {REEL_ORDER.map((cat, i) => {
          const item = finalItems[i];
          const matchesCategory = item?.category === cat;
          const find = item && findsByItemId ? findsByItemId.get(item.id) : null;
          return (
            <Reel
              key={cat}
              category={cat}
              finalItem={matchesCategory ? item : null}
              locked={lockedCount > i}
              find={find}
              interactive={interactive}
              onClick={item && onItemTap ? () => onItemTap(item) : undefined}
            />
          );
        })}
      </div>
      {!interactive && (
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
      )}
      <style>{`
        @keyframes drFindBounce {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
