import { TRIP_INFO } from "../data/resort.js";
import { C } from "../data/colors.js";

const TILE_TINTS = [C.green, C.coral, C.turquoise, C.gold, C.purple, C.sky];

export default function TripEssentials() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 10,
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
              borderRadius: 16,
              padding: "14px 14px",
              boxShadow: `0 4px 14px ${tint}12`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: `${tint}18`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: C.white,
                boxShadow: `0 4px 10px ${tint}2A`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
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
