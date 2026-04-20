import { C } from "../data/colors.js";
import YourCountdown from "./YourCountdown.jsx";
import YourStay from "./YourStay.jsx";
import YourResort from "./YourResort.jsx";
import TripEssentials from "./TripEssentials.jsx";

export default function AboutYourHoliday({ player, myFlights }) {
  return (
    <section
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "0 clamp(16px, 4vw, 20px)",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <div
        style={{
          background: C.sand,
          borderRadius: 24,
          boxShadow: "0 18px 48px rgba(0,0,0,0.06)",
          padding: "clamp(20px, 5vw, 32px)",
          boxSizing: "border-box",
        }}
      >
        {/* Internal header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 11,
              color: C.turquoise,
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            About Your Holiday
          </div>
          <h2
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: "clamp(24px, 6vw, 40px)",
              margin: 0,
              color: C.dark,
              lineHeight: 1.05,
            }}
          >
            The dashboard
          </h2>
          <div
            style={{
              marginTop: 10,
              fontFamily: "Nunito, sans-serif",
              fontSize: "clamp(13px, 1.4vw, 15px)",
              color: C.textBody,
              fontWeight: 600,
              lineHeight: 1.55,
              maxWidth: 560,
              margin: "10px auto 0",
            }}
          >
            Your trip at a glance — countdown, stay, flights, hotel, essentials.
          </div>
        </div>

        {/* Top row: countdown + stay */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <YourCountdown player={player} />
          <YourStay player={player} compact />
        </div>

        {/* Flights row */}
        {myFlights.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 900,
                fontSize: 10,
                color: C.sky,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              Your flights
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 10,
              }}
            >
              {myFlights.map((f) => (
                <div
                  key={f.id}
                  style={{
                    background: `${player.color}0C`,
                    borderRadius: 16,
                    padding: "14px 16px",
                    border: `1px solid ${player.color}22`,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
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
                        fontWeight: 800,
                        fontSize: 12,
                        color: C.dark,
                      }}
                    >
                      {f.date}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: C.dark }}>{f.from.code}</div>
                      <div style={{ fontSize: 11, color: C.textBody }}>{f.from.city}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: C.textBody, marginBottom: 4 }}>
                        {f.duration}
                        {f.stops ? ` · via ${f.stopCity}` : ""}
                      </div>
                      <div
                        style={{
                          height: 2,
                          background: `linear-gradient(90deg, ${player.color}44, ${player.color}, ${player.color}44)`,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: C.dark }}>{f.to.code}</div>
                      <div style={{ fontSize: 11, color: C.textBody }}>{f.to.city}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.textBody, marginTop: 10, fontWeight: 600 }}>
                    {f.depart} → {f.arrive} · {f.flight} · {f.aircraft}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotel row */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 10,
              color: C.gold,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            Where you're staying
          </div>
          <YourResort compact />
        </div>

        {/* Essentials row */}
        <div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 10,
              color: C.green,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            Good to know
          </div>
          <TripEssentials />
        </div>
      </div>
    </section>
  );
}
