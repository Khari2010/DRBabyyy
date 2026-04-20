import { C } from "../data/colors.js";
import { RESORT, TRIP_INFO } from "../data/resort.js";
import Reveal from "./Reveal.jsx";
import Countdown from "./Countdown.jsx";
import { getFlightDate } from "../lib/trip.js";

// Home-style "About the Holiday" band — centred eyebrow + title, then
// stacked sub-module cards. Each card uses the standard C.white / radius 20 /
// shadow 0 2px 12px rgba(0,0,0,0.04) pattern (optionally player-tinted).
export default function AboutYourHoliday({ player, myFlights }) {
  const target = getFlightDate(player);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
      {/* Countdown card */}
      <Reveal delay={0.05}>
        <CountdownCard player={player} target={target} />
      </Reveal>

      {/* Flights + Stay row */}
      <Reveal delay={0.1}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          <FlightsCard player={player} myFlights={myFlights} />
          <StayCard player={player} />
        </div>
      </Reveal>

      {/* Resort card — full-width */}
      <Reveal delay={0.15}>
        <div style={{ marginTop: 16 }}>
          <ResortCard />
        </div>
      </Reveal>

      {/* Trip essentials grid — full-width, home TRIP_INFO tile pattern */}
      <Reveal delay={0.2}>
        <div style={{ marginTop: 16 }}>
          <EssentialsCard />
        </div>
      </Reveal>
    </div>
  );
}

// ─── sub-cards ─────────────────────────────────────────────────────────────

function cardBase() {
  return {
    background: C.white,
    borderRadius: 20,
    padding: "20px 20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    boxSizing: "border-box",
  };
}

function tintedCardBase(color) {
  return {
    background: `linear-gradient(170deg, ${C.white} 0%, ${color}08 100%)`,
    border: `1px solid ${color}25`,
    boxShadow: `0 4px 20px ${color}15`,
    borderRadius: 20,
    padding: "20px 20px",
    boxSizing: "border-box",
  };
}

function Eyebrow({ children, color }) {
  return (
    <div
      style={{
        fontFamily: "Nunito, sans-serif",
        fontWeight: 900,
        fontSize: 11,
        color,
        letterSpacing: 3,
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function CountdownCard({ player, target }) {
  return (
    <div
      style={{
        ...tintedCardBase(player.color),
        textAlign: "center",
        padding: "28px 20px",
      }}
    >
      <Eyebrow color={player.color}>Countdown</Eyebrow>
      <div
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: "clamp(20px, 4vw, 26px)",
          color: C.dark,
          lineHeight: 1.1,
          marginBottom: 14,
        }}
      >
        Wheels up
      </div>
      <Countdown target={target} compact />
    </div>
  );
}

function StayCard({ player }) {
  return (
    <div style={cardBase()}>
      <Eyebrow color={player.color}>Your stay</Eyebrow>
      <div
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 20,
          color: C.dark,
          lineHeight: 1.15,
          marginBottom: 4,
        }}
      >
        {RESORT.name}
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 13,
          color: C.textBody,
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        {"⭐".repeat(RESORT.stars)} · All-Inclusive · Adults Only
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 13,
          color: C.textBody,
          fontWeight: 600,
          lineHeight: 1.6,
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          marginBottom: 12,
        }}
      >
        <span>📍</span>
        <span>{RESORT.address}</span>
      </div>
      <div
        style={{
          borderTop: `1px solid ${player.color}18`,
          paddingTop: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          fontFamily: "Nunito, sans-serif",
          fontSize: 12,
          color: C.textBody,
          fontWeight: 700,
        }}
      >
        <span>🔑 <span style={{ color: C.dark }}>{RESORT.checkIn}</span></span>
        <span>👋 <span style={{ color: C.dark }}>{RESORT.checkOut}</span></span>
      </div>
    </div>
  );
}

function FlightsCard({ player, myFlights }) {
  if (!myFlights || myFlights.length === 0) {
    return (
      <div style={cardBase()}>
        <Eyebrow color={C.sky}>Your flights</Eyebrow>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 13,
            color: C.textBody,
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          Your flight details aren't locked in yet.
        </div>
      </div>
    );
  }

  return (
    <div style={cardBase()}>
      <Eyebrow color={C.sky}>Your flights</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {myFlights.map((f) => (
          <div
            key={f.id}
            style={{
              background: `linear-gradient(170deg, ${C.white} 0%, ${player.color}08 100%)`,
              borderRadius: 16,
              padding: "12px 14px",
              border: `1px solid ${player.color}22`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 900,
                  fontSize: 10,
                  color: C.white,
                  background: f.type === "Outbound" ? C.turquoise : C.coral,
                  padding: "3px 10px",
                  borderRadius: 10,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                {f.type}
              </span>
              <span
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  color: C.textBody,
                }}
              >
                {f.date}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 4px",
                gap: 8,
              }}
            >
              <div style={{ textAlign: "center", minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: 18,
                    color: C.dark,
                  }}
                >
                  {f.from.code}
                </div>
                <div
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 10,
                    color: C.textBody,
                    fontWeight: 700,
                  }}
                >
                  {f.depart}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: "center", padding: "0 6px" }}>
                <div
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 10,
                    color: C.textBody,
                    fontWeight: 700,
                  }}
                >
                  {f.duration}
                </div>
                <div
                  style={{
                    height: 2,
                    background: `linear-gradient(90deg, ${player.color}44, ${player.color}, ${player.color}44)`,
                    borderRadius: 2,
                    margin: "4px 0",
                  }}
                />
                {f.stops ? (
                  <div
                    style={{
                      fontFamily: "Nunito, sans-serif",
                      fontSize: 9,
                      color: player.color,
                      fontWeight: 800,
                    }}
                  >
                    via {f.stopCity}
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily: "Nunito, sans-serif",
                      fontSize: 9,
                      color: C.green,
                      fontWeight: 800,
                    }}
                  >
                    Direct
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center", minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: 18,
                    color: C.dark,
                  }}
                >
                  {f.to.code}
                </div>
                <div
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 10,
                    color: C.textBody,
                    fontWeight: 700,
                  }}
                >
                  {f.arrive}
                </div>
              </div>
            </div>
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontSize: 10,
                color: C.textBody,
                fontWeight: 600,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {f.flight} · {f.aircraft}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResortCard() {
  return (
    <div style={cardBase()}>
      <Eyebrow color={C.gold}>What's included</Eyebrow>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {RESORT.included.map((item) => (
          <div
            key={item.label}
            style={{
              background: `${C.turquoise}12`,
              borderRadius: 12,
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
                fontSize: 11,
                color: C.dark,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EssentialsCard() {
  return (
    <div style={cardBase()}>
      <Eyebrow color={C.green}>Good to know</Eyebrow>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {TRIP_INFO.map((item) => (
          <div
            key={item.key}
            style={{
              background: C.white,
              borderRadius: 14,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: `1px solid ${C.sandDark}`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${C.turquoise}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 10,
                  color: C.textBody,
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                }}
              >
                {item.key}
              </div>
              <div
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.dark,
                  lineHeight: 1.4,
                }}
              >
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
