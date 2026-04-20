import { TRIP_INFO } from "../data/resort.js";
import { C } from "../data/colors.js";

export default function TripEssentials() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 10,
      }}
    >
      {TRIP_INFO.map((item) => (
        <div
          key={item.key}
          style={{
            background: C.white,
            borderRadius: 16,
            padding: "16px 14px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 32, lineHeight: 1 }}>{item.icon}</div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 10,
              color: C.textBody,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {item.key}
          </div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: C.dark,
              lineHeight: 1.4,
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
