import { useMemo, useState } from "react";
import {
  CHALLENGES,
  CHALLENGE_CATEGORIES,
} from "../../data/challenges.js";
import { C } from "../../data/colors.js";
import { RADIUS } from "../../data/design.js";
import Pill from "../primitives/Pill.jsx";
import Card from "../primitives/Card.jsx";

const CATEGORY_ACCENTS = {
  social: C.coral,
  drinks: C.gold,
  fitness: C.green,
  content: C.cyan,
  wild: C.coralDeep,
  squad: C.blue,
  chill: C.turquoise,
};

export default function ChallengesGrouped() {
  const [activeCategory, setActiveCategory] = useState("all");

  const visibleCategories = useMemo(
    () =>
      activeCategory === "all"
        ? CHALLENGE_CATEGORIES
        : CHALLENGE_CATEGORIES.filter((c) => c.id === activeCategory),
    [activeCategory],
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: 28,
        }}
      >
        <Pill
          active={activeCategory === "all"}
          accent={C.dark}
          onClick={() => setActiveCategory("all")}
        >
          All
        </Pill>
        {CHALLENGE_CATEGORIES.map((cat) => (
          <Pill
            key={cat.id}
            active={activeCategory === cat.id}
            accent={CATEGORY_ACCENTS[cat.id] ?? C.coral}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.icon} {cat.label}
          </Pill>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {visibleCategories.map((cat) => {
          const list = CHALLENGES.filter((c) => c.category === cat.id);
          const accent = CATEGORY_ACCENTS[cat.id] ?? C.coral;
          return (
            <div key={cat.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontWeight: 900,
                    fontSize: 11,
                    color: accent,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                  }}
                >
                  {cat.icon} {cat.label}
                </span>
                <span
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.textBody,
                    opacity: 0.7,
                  }}
                >
                  {cat.blurb} · {list.length}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                {list.map((c) => (
                  <ChallengeRow key={c.id} challenge={c} accent={accent} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChallengeRow({ challenge, accent }) {
  return (
    <Card padding="12px 14px">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `${accent}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {challenge.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 13,
              color: C.dark,
              lineHeight: 1.3,
            }}
          >
            {challenge.title}
          </div>
          {challenge.bonus && (
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
                fontSize: 11,
                color: C.green,
                marginTop: 2,
              }}
            >
              {challenge.bonus}
            </div>
          )}
        </div>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 14,
            color: accent,
            background: `${accent}10`,
            padding: "4px 10px",
            borderRadius: RADIUS.sm,
            flexShrink: 0,
          }}
        >
          {challenge.points}
        </div>
      </div>
    </Card>
  );
}
