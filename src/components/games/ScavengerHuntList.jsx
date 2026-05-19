import { useState } from "react";
import { SCAVENGER_ITEMS } from "../../data/scavenger.js";
import { C } from "../../data/colors.js";
import { RADIUS } from "../../data/design.js";
import Card from "../primitives/Card.jsx";

// Categories are intentionally hidden for now — items render as one flat list.
// Per-item category color is kept as a subtle accent for the checked state.
export default function ScavengerHuntList() {
  const [checked, setChecked] = useState({});

  const toggle = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const accent = C.coralDeep;
  const foundCount = Object.values(checked).filter(Boolean).length;

  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          paddingBottom: 12,
          marginBottom: 12,
          borderBottom: `1px solid ${C.sandDark}`,
        }}
      >
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 18,
            color: C.dark,
            lineHeight: 1.1,
          }}
        >
          Find these
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.textBody,
            fontWeight: 800,
          }}
        >
          {foundCount} / {SCAVENGER_ITEMS.length}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 6,
        }}
      >
        {SCAVENGER_ITEMS.map((item) => {
          const isChecked = !!checked[item.id];
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: RADIUS.sm,
                background: isChecked ? `${accent}10` : "transparent",
                border: `1px solid ${isChecked ? accent : "transparent"}`,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                fontFamily: "Nunito, sans-serif",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${isChecked ? accent : C.sandDark}`,
                  background: isChecked ? accent : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: C.white,
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                {isChecked ? "✓" : ""}
              </div>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.dark,
                  textDecoration: isChecked ? "line-through" : "none",
                  opacity: isChecked ? 0.6 : 1,
                  flex: 1,
                }}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
