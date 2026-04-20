import { daysForPlayer, DAY_ACCENTS } from "../data/itinerary.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

function CrewRow({ who, currentName, accent }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 10,
          color: accent,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginRight: 4,
        }}
      >
        Your crew today
      </span>
      {who.map((name) => {
        const p = PLAYERS.find((pl) => pl.name === name);
        const color = p?.color ?? C.textBody;
        const isMe = name === currentName;
        return (
          <div
            key={name}
            title={name}
            style={{
              width: isMe ? 30 : 26,
              height: isMe ? 30 : 26,
              borderRadius: "50%",
              overflow: "hidden",
              background: color,
              boxShadow: isMe
                ? `0 0 0 3px ${C.white}, 0 0 0 5px ${color}, 0 2px 10px ${color}66`
                : `0 0 0 2px ${C.white}, 0 1px 4px rgba(0,0,0,0.1)`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {p?.avatar ? (
              <img
                src={p.avatar}
                alt={name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
              />
            ) : (
              <span style={{ fontSize: 12 }}>{p?.emoji ?? name[0]}</span>
            )}
          </div>
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
        borderRadius: 24,
        boxShadow: `0 10px 30px ${accent}18`,
        border: `1px solid ${accent}22`,
        overflow: "hidden",
      }}
    >
      {/* Date strip — coloured band top */}
      <div
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accent}DD)`,
          padding: "14px clamp(16px, 4vw, 20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 10,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            {day.dow}
          </div>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 22,
              color: C.white,
              lineHeight: 1,
            }}
          >
            {day.date}
          </div>
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
              padding: "6px 12px",
              borderRadius: 10,
              boxShadow: `0 4px 12px ${accent}44`,
            }}
          >
            {day.cost}
          </div>
        )}
      </div>

      {/* Title + tagline */}
      <div style={{ padding: "18px clamp(16px, 4vw, 22px) 4px" }}>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: "clamp(20px, 3vw, 24px)",
            color: C.dark,
            lineHeight: 1.1,
            marginBottom: 6,
          }}
        >
          {day.title}
        </div>
        {day.tagline && (
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontStyle: "italic",
              fontSize: 14,
              color: C.textBody,
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            {"\u201C"}{day.tagline}{"\u201D"}
          </div>
        )}

        {/* Items */}
        <div>
          {day.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "10px 0",
                borderTop: i > 0 ? `1px solid ${C.sandDark}` : "none",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: `${accent}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
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
                    fontSize: 10,
                    color: accent,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {item.time}
                </div>
                <div
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: C.dark,
                    lineHeight: 1.4,
                    marginTop: 2,
                  }}
                >
                  {item.activity}
                </div>
                {item.note && (
                  <div
                    style={{
                      fontFamily: "Nunito, sans-serif",
                      fontSize: 11,
                      color: C.textBody,
                      fontWeight: 600,
                      marginTop: 3,
                      opacity: 0.75,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crew */}
      <div
        style={{
          padding: "14px clamp(16px, 4vw, 22px) 16px",
          borderTop: `1px solid ${C.sandDark}`,
          background: `${accent}08`,
        }}
      >
        <CrewRow who={day.who} currentName={currentName} accent={accent} />
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
    <div style={{ display: "grid", gap: 18 }}>
      {days.map((day, i) => (
        <DayCard
          key={day.date}
          day={day}
          accent={DAY_ACCENTS[i % DAY_ACCENTS.length]}
          currentName={player.name}
        />
      ))}
    </div>
  );
}
