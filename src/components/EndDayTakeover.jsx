import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";
import RevealFlow from "./RevealFlow.jsx";
import { isDailyScavengerActive } from "../data/dailyScavenger.js";

export default function EndDayTakeover({ open, dayNumber, onClose }) {
  const rollover = useQuery(
    api.rollovers.get,
    open && dayNumber ? { dayNumber } : "skip",
  );

  const [slotDone, setSlotDone] = useState(false);

  useEffect(() => { setSlotDone(false); }, [rollover?._id]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const newDailyKey = rollover ? `day-${rollover.dayNumber + 1}` : null;
  const slotActive = newDailyKey ? isDailyScavengerActive(newDailyKey) : false;
  const canClose = !!rollover?.forfeitId && (!slotActive || slotDone);

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
            <RevealFlow rollover={rollover} onSlotDone={() => setSlotDone(true)} />
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
