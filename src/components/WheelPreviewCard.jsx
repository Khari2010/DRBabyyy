import { useState } from "react";
import { FORFEITS } from "../data/forfeits.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

export default function WheelPreviewCard() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: C.white,
      borderRadius: RADIUS.md,
      border: `1px solid ${C.sandDark}`,
      marginBottom: 16,
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: "transparent",
          border: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 14,
          color: C.dark,
          cursor: "pointer",
        }}
      >
        <span>🎰 What's on the wheel</span>
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          borderTop: `1px solid ${C.sandDark}`,
          padding: "12px 16px",
        }}>
          {FORFEITS.map((f) => (
            <div key={f.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 0",
              fontFamily: "Nunito, sans-serif",
              fontSize: 13,
              color: C.dark,
            }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
