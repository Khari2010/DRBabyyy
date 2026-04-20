import { TRIP_INFO } from "../data/resort.js";
import { C } from "../data/colors.js";

const TILE_TINTS = [C.green, C.coral, C.turquoise, C.gold, C.purple, C.sky];

export default function TripEssentials() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 14,
      }}
    >
      {TRIP_INFO.map((item, i) => {
        const tint = TILE_TINTS[i % TILE_TINTS.length];
        return (
          <div
            key={item.key}
            style={{
              background: `${tint}14`,
              border: `1px solid ${tint}28`,
              borderRadius: 20,
              padding: "22px 18px",
              boxShadow: `0 6px 20px ${tint}15`,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: `${tint}18`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: C.white,
                boxShadow: `0 4px 12px ${tint}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                lineHeight: 1,
                position: "relative",
                zIndex: 1,
              }}
            >
              {item.icon}
            </div>
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 900,
                fontSize: 10,
                color: tint,
                letterSpacing: 2,
                textTransform: "uppercase",
                position: "relative",
                zIndex: 1,
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
                lineHeight: 1.45,
                position: "relative",
                zIndex: 1,
                wordBreak: "break-word",
              }}
            >
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
