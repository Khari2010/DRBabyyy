import { daysForPlayer, DAY_ACCENTS } from "../data/itinerary.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

function CrewDots({ who, currentName }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 9,
          color: C.textBody,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginRight: 4,
        }}
      >
        Crew today
      </span>
      {who.map((name) => {
        const p = PLAYERS.find((pl) => pl.name === name);
        const color = p?.color ?? C.textBody;
        const isMe = name === currentName;
        return (
          <span
            key={name}
            title={name}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: color,
              boxShadow: isMe ? `0 0 0 2px ${C.white}, 0 0 0 4px ${color}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

function DayCard({ day, accent, currentName }) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 20,
        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        border: `1px solid ${accent}22`,
        overflow: "hidden",
      }}
    >
      {/* Header band */}
      <div
        style={{
          background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
          padding: "14px 18px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "inline-block",
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 10,
              color: C.white,
              background: accent,
              padding: "4px 10px",
              borderRadius: 10,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {day.dow} · {day.date}
          </div>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 20,
              color: C.dark,
              lineHeight: 1.2,
            }}
          >
            {day.title}
          </div>
          {day.tagline && (
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontStyle: "italic",
                fontSize: 13,
                color: C.textBody,
                marginTop: 2,
              }}
            >
              {day.tagline}
            </div>
          )}
        </div>
        {day.cost && (
          <div
            style={{
              flexShrink: 0,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 11,
              color: accent,
              background: C.white,
              padding: "5px 10px",
              borderRadius: 10,
              border: `1px solid ${accent}33`,
            }}
          >
            {day.cost}
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: "12px 18px 4px" }}>
        {day.items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "8px 0",
              borderTop: i > 0 ? `1px solid ${C.sandDark}` : "none",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: `${accent}14`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 900,
                  fontSize: 12,
                  color: C.dark,
                }}
              >
                {item.time}
              </div>
              <div
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontSize: 13,
                  color: C.textBody,
                  lineHeight: 1.4,
                }}
              >
                {item.activity}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Crew */}
      <div
        style={{
          padding: "10px 18px 14px",
          borderTop: `1px solid ${C.sandDark}`,
        }}
      >
        <CrewDots who={day.who} currentName={currentName} />
      </div>
    </div>
  );
}

export default function YourItinerary({ player }) {
  const days = daysForPlayer(player.name);

  if (days.length === 0) {
    return (
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          color: C.textBody,
          textAlign: "center",
          padding: "20px 0",
        }}
      >
        No scheduled days yet.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        paddingLeft: 12,
      }}
    >
      {/* Vertical timeline line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 12,
          bottom: 12,
          width: 2,
          background: `linear-gradient(180deg, ${player.color}55, ${player.color}11)`,
          borderRadius: 2,
        }}
      />
      <div style={{ display: "grid", gap: 14, paddingLeft: 12 }}>
        {days.map((day, i) => (
          <DayCard
            key={day.date}
            day={day}
            accent={DAY_ACCENTS[i % DAY_ACCENTS.length]}
            currentName={player.name}
          />
        ))}
      </div>
    </div>
  );
}
