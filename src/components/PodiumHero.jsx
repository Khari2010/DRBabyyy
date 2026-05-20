import { displayName } from "../lib/displayName.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";
import Avatar from "./primitives/Avatar.jsx";

function playerBySlug(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

function Sunburst() {
  // 18 alternating long/short rays in gold, low opacity. Sits behind the avatar.
  const rays = [];
  const RAY_COUNT = 18;
  const cx = 90;
  const cy = 90;
  const r1 = 70;
  const r2 = 100;
  const r2short = 86;
  for (let i = 0; i < RAY_COUNT; i++) {
    const a = (i / RAY_COUNT) * Math.PI * 2;
    const long = i % 2 === 0;
    const x1 = cx + r1 * Math.cos(a);
    const y1 = cy + r1 * Math.sin(a);
    const x2 = cx + (long ? r2 : r2short) * Math.cos(a);
    const y2 = cy + (long ? r2 : r2short) * Math.sin(a);
    rays.push(
      <line
        key={i}
        x1={x1.toFixed(2)}
        y1={y1.toFixed(2)}
        x2={x2.toFixed(2)}
        y2={y2.toFixed(2)}
        stroke={C.gold}
        strokeWidth={long ? 4 : 2.5}
        strokeLinecap="round"
        opacity={long ? 0.45 : 0.3}
      />,
    );
  }
  return (
    <svg
      width={180}
      height={180}
      viewBox="0 0 180 180"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        animation: "drSunSlowSpin 60s linear infinite",
        zIndex: 1,
      }}
      aria-hidden="true"
    >
      {rays}
    </svg>
  );
}

function PalmFrond({ side }) {
  // Decorative palm silhouette tucked behind the hero card corner.
  const isLeft = side === "left";
  return (
    <svg
      width={120}
      height={140}
      viewBox="0 0 120 140"
      style={{
        position: "absolute",
        [isLeft ? "left" : "right"]: -28,
        bottom: -24,
        transform: isLeft ? "scaleX(-1) rotate(8deg)" : "rotate(8deg)",
        opacity: 0.18,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <g fill={C.palm}>
        <path d="M60 140 C 56 100, 50 70, 42 50" stroke={C.palm} strokeWidth={3} fill="none" />
        <ellipse cx={50} cy={48} rx={26} ry={7} transform="rotate(-30 50 48)" />
        <ellipse cx={64} cy={42} rx={28} ry={7} transform="rotate(10 64 42)" />
        <ellipse cx={46} cy={62} rx={24} ry={6} transform="rotate(-55 46 62)" />
        <ellipse cx={66} cy={58} rx={26} ry={6} transform="rotate(40 66 58)" />
        <ellipse cx={42} cy={78} rx={20} ry={5} transform="rotate(-75 42 78)" />
        <ellipse cx={70} cy={72} rx={22} ry={5} transform="rotate(60 70 72)" />
      </g>
    </svg>
  );
}

function Stamp({ label }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        transform: "rotate(-6deg)",
        border: `1.5px dashed ${C.coralDeep}`,
        borderRadius: 6,
        padding: "4px 8px",
        fontFamily: "Nunito, sans-serif",
        fontWeight: 900,
        fontSize: 9,
        letterSpacing: 1.2,
        color: C.coralDeep,
        background: `${C.white}cc`,
        textTransform: "uppercase",
        lineHeight: 1.1,
        textAlign: "center",
        boxShadow: `0 1px 2px rgba(0,0,0,0.06)`,
        zIndex: 3,
      }}
      aria-hidden="true"
    >
      {label.split("\n").map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

export default function PodiumHero({
  row,
  isMe,
  holidayMap,
  isFlowWinner,
  stampLabel,
  onTap,
  onFoul,
}) {
  const p = playerBySlug(row.slug);
  const name = displayName(row.slug, holidayMap, p?.name);
  const score = row.total;
  const positive = score >= 0;

  return (
    <div
      onClick={onTap ? () => onTap(row.slug) : undefined}
      style={{
        position: "relative",
        background: `linear-gradient(155deg, ${C.sand} 0%, ${C.white} 60%, ${C.coral}18 100%)`,
        borderRadius: RADIUS.lg ?? 18,
        padding: "26px 22px 22px",
        marginBottom: 18,
        overflow: "hidden",
        boxShadow: `0 6px 24px ${C.gold}25, 0 0 0 1px ${C.gold}30, inset 0 1px 0 ${C.white}`,
        cursor: onTap ? "pointer" : "default",
      }}
    >
      <PalmFrond side="right" />
      <Stamp label={stampLabel ?? "Day 1\n20 May"} />

      <div style={{
        fontFamily: "Nunito, sans-serif",
        fontWeight: 900,
        fontSize: 10,
        letterSpacing: 1.6,
        color: C.gold,
        textTransform: "uppercase",
        textAlign: "center",
        marginBottom: 10,
      }}>
        🥇 Leading the crew
      </div>

      <div style={{
        position: "relative",
        height: 180,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Sunburst />
        {p && (
          <div style={{ position: "relative", zIndex: 2 }}>
            <Avatar player={p} size="hero" />
          </div>
        )}
      </div>

      <div style={{
        textAlign: "center",
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 26,
        color: C.dark,
        lineHeight: 1,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
      }}>
        <span>{isFlowWinner ? "👑 " : ""}{name}</span>
        {isMe && (
          <span style={{
            padding: "2px 8px",
            borderRadius: 999,
            background: C.dark,
            color: C.white,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 10,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}>
            you
          </span>
        )}
      </div>

      <div style={{
        textAlign: "center",
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 72,
        lineHeight: 1,
        color: positive ? C.green : C.coralDeep,
        textShadow: `0 2px 0 ${C.white}`,
        letterSpacing: -2,
        marginBottom: 12,
      }}>
        {positive ? "+" : ""}{score}
      </div>

      <div style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        {row.claimCount > 0 && (
          <span style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: row.verifiedCount === row.claimCount ? `${C.green}22` : C.sandDark,
            color: row.verifiedCount === row.claimCount ? C.green : C.textBody,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 0.4,
          }}>
            {row.verifiedCount} of {row.claimCount} verified
          </span>
        )}
        {onFoul && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFoul({ slug: row.slug, name });
            }}
            title="Log a foul"
            style={{
              padding: "4px 12px",
              borderRadius: 999,
              background: "transparent",
              color: C.coralDeep,
              border: `1.5px solid ${C.coralDeep}55`,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            ⚠︎ Foul
          </button>
        )}
      </div>

      <style>{`
        @keyframes drSunSlowSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
