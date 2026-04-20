import { RESORT } from "../data/resort.js";
import { C } from "../data/colors.js";

const ACCENT = C.gold;

export default function YourResort() {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 28,
        overflow: "hidden",
        boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
        border: `1px solid ${ACCENT}22`,
      }}
    >
      {/* Top stripe — section accent, not player colour */}
      <div style={{ height: 6, background: `linear-gradient(90deg, ${ACCENT}, ${C.coral}, ${ACCENT})` }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 0,
        }}
      >
        {/* Left: Resort hero */}
        <div
          style={{
            background: `linear-gradient(145deg, ${ACCENT}18, ${ACCENT}08 60%, ${C.sand})`,
            padding: "32px 28px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", top: -30, right: -30,
            width: 120, height: 120, borderRadius: "50%",
            background: `${ACCENT}1A`, pointerEvents: "none",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Stars */}
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontSize: 16,
                marginBottom: 10,
                letterSpacing: 2,
              }}
            >
              {"⭐".repeat(RESORT.stars)}
            </div>

            {/* Name */}
            <div
              style={{
                fontFamily: "'Dela Gothic One', sans-serif",
                fontSize: "clamp(24px, 4vw, 32px)",
                color: C.dark,
                lineHeight: 1.1,
                marginBottom: 12,
              }}
            >
              {RESORT.name}
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
                  background: ACCENT,
                  padding: "6px 14px",
                  borderRadius: 12,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 16,
                  boxShadow: `0 4px 12px ${ACCENT}55`,
                }}
              >
                All-Inclusive · Adults Only
              </div>
            )}

            {/* Address */}
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontSize: 13,
                color: C.textBody,
                lineHeight: 1.6,
                fontWeight: 600,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 15 }}>📍</span>
              <span>{RESORT.address}</span>
            </div>
          </div>
        </div>

        {/* Right: What's included */}
        <div
          style={{
            padding: "32px 28px",
            background: C.white,
          }}
        >
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 11,
              color: ACCENT,
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            What's Included
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 10,
            }}
          >
            {RESORT.included.map((item, i) => {
              const tints = [C.gold, C.coral, C.turquoise, C.purple, C.green, C.sky];
              const tint = tints[i % tints.length];
              return (
                <div
                  key={item.label}
                  style={{
                    background: `${tint}15`,
                    border: `1px solid ${tint}22`,
                    borderRadius: 14,
                    padding: "14px 10px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{item.icon}</span>
                  <span
                    style={{
                      fontFamily: "Nunito, sans-serif",
                      fontWeight: 800,
                      fontSize: 11,
                      color: C.dark,
                      lineHeight: 1.2,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom info row: check-in / check-out / phone */}
      <div
        style={{
          borderTop: `1px solid ${ACCENT}22`,
          background: `${C.sand}`,
          padding: "16px 24px",
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        {[
          { label: "Check-in", value: RESORT.checkIn, icon: "🔑" },
          { label: "Check-out", value: RESORT.checkOut, icon: "👋" },
          { label: "Phone", value: RESORT.phone, icon: "📞" },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: `${ACCENT}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {row.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 900,
                  fontSize: 9,
                  color: C.textBody,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                {row.label}
              </div>
              <div
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 12,
                  color: C.dark,
                  lineHeight: 1.3,
                }}
              >
                {row.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
