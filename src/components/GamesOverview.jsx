import { CHALLENGES, NEGATIVE_POINTS, FORFEITS } from "../data/challenges.js";
import { C } from "../data/colors.js";

// Compute top challenges once at module load — no per-render sort.
const TOP_CHALLENGES = [...CHALLENGES].sort((a, b) => b.points - a.points).slice(0, 6);
const TOP_REWARD = TOP_CHALLENGES[0] ?? null;
const BIGGEST_PENALTY = [...NEGATIVE_POINTS].sort((a, b) => a.points - b.points)[0] ?? null;

function Stat({ label, value, sublabel, accent }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 110,
        background: C.white,
        borderRadius: 16,
        padding: "14px 12px",
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        border: `1px solid ${accent}22`,
      }}
    >
      <div
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 22,
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 9,
          color: C.textBody,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginTop: 6,
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 700,
            fontSize: 11,
            color: C.dark,
            marginTop: 4,
            lineHeight: 1.3,
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}

function ChallengeCard({ c, accent }) {
  return (
    <div
      style={{
        flex: "0 0 auto",
        width: 160,
        background: C.white,
        borderRadius: 16,
        padding: "14px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        border: `1px solid ${accent}22`,
        scrollSnapAlign: "start",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: `${accent}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          marginBottom: 10,
        }}
      >
        {c.icon}
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 13,
          color: C.dark,
          lineHeight: 1.25,
          minHeight: 32,
        }}
      >
        {c.title}
      </div>
      <div
        style={{
          marginTop: 10,
          display: "inline-block",
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 13,
          color: C.white,
          background: accent,
          padding: "4px 10px",
          borderRadius: 10,
        }}
      >
        +{c.points}
      </div>
    </div>
  );
}

export default function GamesOverview({ player }) {
  const accent = player.color;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p
        style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 14,
          color: C.textBody,
          margin: 0,
          fontWeight: 600,
          lineHeight: 1.5,
        }}
      >
        The squad's challenge system — earn points, chase forfeits.
      </p>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Stat
          label="Challenges"
          value={CHALLENGES.length}
          accent={accent}
        />
        {TOP_REWARD && (
          <Stat
            label="Top Reward"
            value={`${TOP_REWARD.points}`}
            sublabel={TOP_REWARD.title}
            accent={C.green}
          />
        )}
        {BIGGEST_PENALTY && (
          <Stat
            label="Biggest Penalty"
            value={`${BIGGEST_PENALTY.points}`}
            sublabel={BIGGEST_PENALTY.action}
            accent={C.coralDeep}
          />
        )}
      </div>

      {/* Top challenges carousel */}
      <div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 10,
            color: accent,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          High-Stakes Challenges
        </div>
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 6,
            scrollSnapType: "x mandatory",
          }}
        >
          {TOP_CHALLENGES.map((c) => (
            <ChallengeCard key={c.id} c={c} accent={accent} />
          ))}
        </div>
      </div>

      {/* Negative points */}
      <div
        style={{
          background: `${C.coralDeep}08`,
          border: `1px solid ${C.coralDeep}22`,
          borderRadius: 16,
          padding: "14px 14px",
        }}
      >
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 10,
            color: C.coralDeep,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Watch Out
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {NEGATIVE_POINTS.map((n) => (
            <span
              key={n.action}
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 11,
                color: C.coralDeep,
                background: C.white,
                padding: "6px 10px",
                borderRadius: 10,
                border: `1px solid ${C.coralDeep}33`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{n.icon}</span>
              <span>{n.action}</span>
              <span style={{ color: C.coralDeep, fontFamily: "'Dela Gothic One', sans-serif" }}>
                {n.points}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Forfeits */}
      <div
        style={{
          background: `${C.purple}08`,
          border: `1px solid ${C.purple}22`,
          borderRadius: 16,
          padding: "14px 14px",
        }}
      >
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 10,
            color: C.purple,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Forfeits
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {FORFEITS.map((f) => (
            <span
              key={f}
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
                fontSize: 11,
                color: C.purple,
                background: C.white,
                padding: "5px 10px",
                borderRadius: 999,
                border: `1px solid ${C.purple}33`,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
