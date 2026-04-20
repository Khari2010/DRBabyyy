import { PRESENCE, TRIP_START_DAY, TRIP_END_DAY } from "../data/presence.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

const TOTAL_DAYS = TRIP_END_DAY - TRIP_START_DAY + 1;

function overlaps(a, b) {
  return a.start <= b.end && b.start <= a.end;
}

// Find the contiguous window of days where the most people overlap.
function largestOverlapWindow() {
  let bestCount = 0;
  let bestStart = TRIP_START_DAY;
  let bestEnd = TRIP_START_DAY;
  let currentCount = -1;
  let currentStart = TRIP_START_DAY;

  for (let d = TRIP_START_DAY; d <= TRIP_END_DAY; d++) {
    const count = PRESENCE.filter((p) => d >= p.start && d <= p.end).length;
    if (count !== currentCount) {
      if (currentCount > bestCount) {
        bestCount = currentCount;
        bestStart = currentStart;
        bestEnd = d - 1;
      }
      currentCount = count;
      currentStart = d;
    }
  }
  if (currentCount > bestCount) {
    bestCount = currentCount;
    bestStart = currentStart;
    bestEnd = TRIP_END_DAY;
  }
  return { count: bestCount, start: bestStart, end: bestEnd };
}

function findAvatar(name) {
  return PLAYERS.find((p) => p.name === name);
}

function PresenceRow({ p, isYou }) {
  const startPct = ((p.start - TRIP_START_DAY) / (TOTAL_DAYS - 1)) * 100;
  const endPct = ((p.end - TRIP_START_DAY) / (TOTAL_DAYS - 1)) * 100;
  const widthPct = Math.max(endPct - startPct, 0);
  const player = findAvatar(p.name);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "clamp(6px, 2vw, 12px)",
        marginBottom: 10,
        padding: isYou ? "8px 10px" : "4px 10px",
        borderRadius: 14,
        background: isYou ? C.white : "transparent",
        boxShadow: isYou ? `0 6px 20px ${p.color}22` : "none",
        border: isYou ? `2px solid ${C.white}` : "2px solid transparent",
        outline: isYou ? `1px solid ${p.color}33` : "none",
        transition: "all 0.3s ease",
        minWidth: 0,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: isYou ? 34 : 28,
          height: isYou ? 34 : 28,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: `0 0 0 2px ${p.color}`,
          background: C.sand,
        }}
      >
        {player?.avatar ? (
          <img
            src={player.avatar}
            alt={p.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
            {player?.emoji ?? p.name[0]}
          </div>
        )}
      </div>

      {/* Name */}
      <div
        style={{
          width: "clamp(48px, 15vw, 68px)",
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: isYou ? 13 : 12,
          color: C.dark,
          flexShrink: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {isYou ? "You" : p.name}
      </div>

      {/* Bar */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          position: "relative",
          height: isYou ? 18 : 12,
          background: `${C.dark}08`,
          borderRadius: 999,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${startPct}%`,
            width: `${widthPct}%`,
            background: p.color,
            borderRadius: 999,
            boxShadow: isYou ? `0 2px 10px ${p.color}66` : `0 1px 3px ${p.color}33`,
          }}
        />
      </div>

      {/* Day range label */}
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: "clamp(10px, 2.5vw, 11px)",
          color: p.color,
          background: `${p.color}14`,
          padding: "3px 6px",
          borderRadius: 8,
          flexShrink: 0,
          letterSpacing: 0.3,
          whiteSpace: "nowrap",
        }}
      >
        {p.start}–{p.end}
      </div>
    </div>
  );
}

export default function YourStay({ player }) {
  const mine = PRESENCE.find((p) => p.name === player.name);

  // Put the logged-in player's row first.
  const ordered = mine
    ? [mine, ...PRESENCE.filter((p) => p.name !== player.name)]
    : PRESENCE;

  const nights = mine ? mine.end - mine.start : 0;
  const overlap = largestOverlapWindow();

  const overlapping = mine
    ? PRESENCE.filter((p) => p.name !== player.name && overlaps(mine, p))
    : [];

  return (
    <div
      style={{
        background: C.white,
        borderRadius: 28,
        padding: "clamp(20px, 5vw, 28px) clamp(16px, 4vw, 24px)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
        border: `1px solid ${player.color}1A`,
      }}
    >
      {mine && (
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: "clamp(24px, 5vw, 32px)",
              color: C.dark,
              lineHeight: 1.15,
            }}
          >
            {mine.start} May → {mine.end} May
          </div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontSize: 14,
              color: C.textBody,
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            <span style={{ color: player.color, fontWeight: 900 }}>{nights} night{nights === 1 ? "" : "s"}</span>
            {" "}in Punta Cana
          </div>
        </div>
      )}

      {/* Presence chart on cream background */}
      <div
        style={{
          background: C.sand,
          borderRadius: 20,
          padding: "20px clamp(10px, 3vw, 16px) 16px",
        }}
      >
        <style>{`
          @media (max-width: 480px) {
            .presence-axis-day:nth-child(odd) { visibility: hidden; }
          }
        `}</style>
        {ordered.map((p) => (
          <PresenceRow
            key={p.name}
            p={p}
            isYou={mine && p.name === mine.name}
          />
        ))}
        {/* Day axis — visually aligned under the pill bar (approximate) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 10,
            paddingLeft: "clamp(92px, 28vw, 118px)",
            paddingRight: "clamp(44px, 12vw, 52px)",
          }}
        >
          {Array.from({ length: TOTAL_DAYS }, (_, i) => (
            <div
              key={i}
              className="presence-axis-day"
              style={{
                flex: 1,
                textAlign: "center",
                fontFamily: "Nunito, sans-serif",
                fontSize: "clamp(10px, 2.5vw, 11px)",
                fontWeight: 800,
                color: C.textBody,
                opacity: 0.55,
              }}
            >
              {TRIP_START_DAY + i}
            </div>
          ))}
        </div>
      </div>

      {/* Summary line */}
      {overlap.count > 1 && (
        <div
          style={{
            marginTop: 18,
            padding: "14px 16px",
            borderRadius: 14,
            background: `${player.color}0C`,
            border: `1px solid ${player.color}22`,
            fontFamily: "Nunito, sans-serif",
            fontSize: 13,
            color: C.textBody,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: C.dark, fontWeight: 900 }}>
            {nights} night{nights === 1 ? "" : "s"}
          </span>
          {" — most of the squad overlaps days "}
          <span style={{ color: player.color, fontWeight: 900 }}>
            {overlap.start}–{overlap.end}
          </span>
        </div>
      )}

      {/* Your crew on your days */}
      {overlapping.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 10,
              color: C.textBody,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            Your crew on your days
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {overlapping.map((p) => (
              <span
                key={p.name}
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 12,
                  color: p.color,
                  background: `${p.color}14`,
                  padding: "6px 12px",
                  borderRadius: 10,
                }}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
