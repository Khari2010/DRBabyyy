import { PRESENCE, TRIP_START_DAY, TRIP_END_DAY } from "../data/presence.js";
import { C } from "../data/colors.js";

const TOTAL_DAYS = TRIP_END_DAY - TRIP_START_DAY + 1;

function overlaps(a, b) {
  return a.start <= b.end && b.start <= a.end;
}

function PresenceRow({ p, isYou }) {
  const startPct = ((p.start - TRIP_START_DAY) / (TOTAL_DAYS - 1)) * 100;
  const endPct = ((p.end - TRIP_START_DAY) / (TOTAL_DAYS - 1)) * 100;
  const widthPct = Math.max(endPct - startPct, 0);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
        opacity: isYou ? 1 : 0.55,
      }}
    >
      <div
        style={{
          width: 56,
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 12,
          color: C.dark,
          flexShrink: 0,
        }}
      >
        {isYou ? "You" : p.name}
      </div>
      <div
        style={{
          flex: 1,
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
            boxShadow: isYou ? `0 2px 8px ${p.color}55` : "none",
          }}
        />
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

  const overlapping = mine
    ? PRESENCE.filter((p) => p.name !== player.name && overlaps(mine, p))
    : [];

  return (
    <div
      style={{
        background: C.white,
        borderRadius: 24,
        padding: "20px 18px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        border: `1px solid ${player.color}22`,
      }}
    >
      {mine && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 20,
              color: C.dark,
              lineHeight: 1.2,
            }}
          >
            {mine.start} May → {mine.end} May
          </div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontSize: 13,
              color: C.textBody,
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {nights} night{nights === 1 ? "" : "s"} in Punta Cana
          </div>
        </div>
      )}

      {/* Presence chart */}
      <div
        style={{
          background: C.sand,
          borderRadius: 16,
          padding: "14px 14px 12px",
        }}
      >
        {ordered.map((p) => (
          <PresenceRow
            key={p.name}
            p={p}
            isYou={mine && p.name === mine.name}
          />
        ))}
        {/* Day labels */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 6,
            paddingLeft: 66,
          }}
        >
          {Array.from({ length: TOTAL_DAYS }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: "center",
                fontFamily: "Nunito, sans-serif",
                fontSize: 9,
                fontWeight: 800,
                color: C.textBody,
                opacity: 0.6,
              }}
            >
              {TRIP_START_DAY + i}
            </div>
          ))}
        </div>
      </div>

      {/* Your crew on your days */}
      {overlapping.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 10,
              color: C.textBody,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Your crew on your days
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {overlapping.map((p) => (
              <span
                key={p.name}
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 11,
                  color: p.color,
                  background: `${p.color}14`,
                  padding: "5px 10px",
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
