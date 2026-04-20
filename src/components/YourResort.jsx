import { RESORT } from "../data/resort.js";
import { C } from "../data/colors.js";

export default function YourResort({ player }) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        border: `1px solid ${player.color}1A`,
      }}
    >
      {/* Top stripe in player colour */}
      <div style={{ height: 4, background: player.color }} />

      <div style={{ padding: "22px 20px" }}>
        {/* Title + stars */}
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: "clamp(20px, 4.5vw, 26px)",
            color: C.dark,
            lineHeight: 1.2,
            marginBottom: 6,
          }}
        >
          {RESORT.name}
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 13,
            color: C.textBody,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {"⭐".repeat(RESORT.stars)}
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.textBody,
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          {RESORT.address}
        </div>

        {/* All-inclusive pill */}
        {RESORT.allInclusive && (
          <div
            style={{
              display: "inline-block",
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 10,
              color: C.white,
              background: player.color,
              padding: "5px 12px",
              borderRadius: 10,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            All-Inclusive
          </div>
        )}

        {/* Included grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {RESORT.included.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: `${player.color}08`,
                borderRadius: 12,
                padding: "8px 10px",
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  color: C.dark,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Check-in / out */}
        <div
          style={{
            borderTop: `1px solid ${player.color}22`,
            paddingTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.textBody,
            fontWeight: 700,
          }}
        >
          <span>Check-in: {RESORT.checkIn}</span>
          <span>Check-out: {RESORT.checkOut}</span>
        </div>

        {/* Phone */}
        <div
          style={{
            marginTop: 10,
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.textBody,
            fontWeight: 600,
          }}
        >
          📞 {RESORT.phone}
        </div>
      </div>
    </div>
  );
}
