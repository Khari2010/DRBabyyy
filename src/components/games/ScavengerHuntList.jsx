import { useState } from "react";
import { SCAVENGER_CATEGORIES, itemsByCategory } from "../../data/scavenger.js";
import { C } from "../../data/colors.js";
import { RADIUS } from "../../data/design.js";
import Card from "../primitives/Card.jsx";

// Local-only ticking for the visual pass. Wires to backend later when
// scavenger-hunt mechanics are decided.
export default function ScavengerHuntList() {
  const [checked, setChecked] = useState({});

  const toggle = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 20,
      }}
    >
      {SCAVENGER_CATEGORIES.map((cat) => {
        const items = itemsByCategory(cat.id);
        return (
          <Card key={cat.id}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingBottom: 12,
                marginBottom: 10,
                borderBottom: `1px solid ${C.sandDark}`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: `${cat.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {cat.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: 16,
                    color: C.dark,
                    lineHeight: 1.1,
                  }}
                >
                  {cat.label}
                </div>
                <div
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 11,
                    color: C.textBody,
                    fontWeight: 700,
                  }}
                >
                  {items.length} to find
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((item) => {
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
                      background: isChecked ? `${cat.color}10` : "transparent",
                      border: `1px solid ${isChecked ? cat.color : "transparent"}`,
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
                        border: `2px solid ${isChecked ? cat.color : C.sandDark}`,
                        background: isChecked ? cat.color : "transparent",
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
      })}
    </div>
  );
}
