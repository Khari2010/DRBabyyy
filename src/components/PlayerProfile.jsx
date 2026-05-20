import { C } from "../data/colors.js";
import { FLIGHTS } from "../data/flights.js";
import { PRESENCE } from "../data/presence.js";
import { displayName } from "../lib/displayName.js";
import Reveal from "./Reveal.jsx";

export const ProfileCard = ({ player, index, onOpen, holidayMap }) => (
  <Reveal delay={index * 0.08} style={{ flex: "0 0 auto" }}>
    <div
      onClick={onOpen}
      style={{
        width: 220, paddingTop: 70, cursor: "pointer", userSelect: "none",
        position: "relative",
        transition: "all 0.3s ease",
        animation: player.mystery ? "mysteryWobble 4s ease-in-out infinite" : "none",
      }}
    >
      {player.mystery && (
        <div style={{
          position: "absolute", top: 4, right: 4, zIndex: 3,
          fontFamily: "'Dela Gothic One', sans-serif", fontSize: 10,
          color: C.white, background: C.coral,
          padding: "5px 10px", borderRadius: 10, letterSpacing: 1.5,
          boxShadow: `0 4px 12px ${C.coral}66`,
          transform: "rotate(8deg)",
        }}>TBC</div>
      )}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 2,
        width: 130, height: 130, borderRadius: "50%", overflow: "hidden",
        border: player.mystery ? `4px dashed ${player.color}` : `4px solid ${player.color}`,
        boxShadow: `0 8px 24px ${player.color}40, 0 0 0 6px ${C.white}`,
        background: player.mystery
          ? `linear-gradient(135deg, ${C.purple}, ${C.pink})`
          : `linear-gradient(135deg, ${player.color}30, ${player.color}10)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {player.mystery ? (
          <span style={{
            fontFamily: "'Dela Gothic One', sans-serif", fontSize: 72,
            color: C.white, textShadow: "0 4px 16px rgba(0,0,0,0.25)",
            lineHeight: 1,
          }}>{player.initial || "?"}</span>
        ) : (
          <img src={player.avatar} alt={player.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }} />
        )}
      </div>
      <div style={{
        background: `linear-gradient(170deg, ${C.white} 0%, ${player.color}12 100%)`,
        border: player.mystery ? `2px dashed ${player.color}66` : `2px solid ${player.color}30`,
        borderRadius: 24,
        boxShadow: `0 8px 32px ${player.color}18`,
        padding: "72px 16px 20px",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 8, textAlign: "center",
      }}>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 13, color: player.color, letterSpacing: 3 }}>#{player.num}</div>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18, color: C.dark, lineHeight: 1.2 }}>{player.mystery ? player.name : displayName(player.slug, holidayMap, player.name)}</div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, color: C.white, background: player.color, padding: "5px 16px", borderRadius: 16, letterSpacing: 0.5, textTransform: "uppercase" }}>{player.title}</div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: C.textBody, marginTop: 4, animation: "tapPulse 2.5s ease-in-out infinite" }}>tap to view profile</div>
      </div>
    </div>
  </Reveal>
);

export const ProfileModal = ({ player, onClose, holidayMap, catchphraseMap }) => {
  if (!player) return null;
  const presence = PRESENCE.find((p) => p.name === player.name);
  const playerFlights = FLIGHTS.filter((f) => f.who.includes(player.name));
  const shownName = player.mystery ? player.name : displayName(player.slug, holidayMap, player.name);
  const catchphrase = !player.mystery && catchphraseMap ? catchphraseMap[player.slug] : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        animation: "modalFadeIn 0.3s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "90vw", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
          background: C.white, borderRadius: 28,
          boxShadow: `0 24px 80px rgba(0,0,0,0.3), 0 0 0 1px ${player.color}22`,
          animation: "modalScaleIn 0.3s cubic-bezier(0.16,1,0.3,1)",
          position: "relative",
        }}
        className="no-scrollbar"
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 3,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.25)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Nunito, sans-serif", fontSize: 18, color: C.white, fontWeight: 700,
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          }}
        >
          ✕
        </button>

        <div style={{
          borderRadius: "28px 28px 0 0",
          position: "relative", overflow: "hidden",
          minHeight: 380,
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          background: player.mystery
            ? `linear-gradient(135deg, ${C.purple}, ${C.pink} 60%, ${C.coral})`
            : "transparent",
        }}>
          {player.mystery ? (
            <>
              {["?", "?", "?", "?", "?", "?"].map((q, i) => (
                <span key={i} style={{
                  position: "absolute",
                  fontFamily: "'Dela Gothic One', sans-serif",
                  color: "rgba(255,255,255,0.18)",
                  fontSize: [120, 80, 60, 100, 70, 90][i],
                  top: ["8%", "55%", "20%", "70%", "10%", "60%"][i],
                  left: ["10%", "75%", "70%", "8%", "50%", "40%"][i],
                  animation: `float ${4 + i}s ease-in-out infinite`,
                  animationDelay: `${i * 0.4}s`,
                  pointerEvents: "none",
                }}>{q}</span>
              ))}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontFamily: "'Dela Gothic One', sans-serif", fontSize: 220,
                  color: "rgba(255,255,255,0.85)",
                  textShadow: "0 8px 40px rgba(0,0,0,0.25)",
                  lineHeight: 1,
                }}>{player.initial || "?"}</span>
              </div>
            </>
          ) : (
            <img src={player.avatar} alt={player.name} loading="lazy" decoding="async" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center 10%",
            }} />
          )}
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(180deg, transparent 30%, ${player.color}44 60%, ${player.color}DD 85%, ${player.color} 100%)`,
          }} />
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px 24px" }}>
            <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: 4, marginBottom: 4 }}>#{player.num}</div>
            <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 32, color: C.white, textShadow: "0 2px 12px rgba(0,0,0,0.3)", marginBottom: 8 }}>{shownName}</div>
            <div style={{ display: "inline-block", fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12, color: C.white, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "6px 20px", borderRadius: 16, letterSpacing: 1.5, textTransform: "uppercase" }}>{player.title}</div>
          </div>
        </div>

        <div style={{ padding: "24px 24px 28px" }}>
          {player.role && (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10, color: player.color, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Role</div>
              <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 14, color: C.dark }}>{player.role}</div>
            </div>
          )}
          {catchphrase && (
            <div style={{ textAlign: "center", marginBottom: 20, padding: "12px 16px", background: `${player.color}10`, borderLeft: `3px solid ${player.color}`, borderRadius: 8 }}>
              <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 15, color: C.dark, lineHeight: 1.4, fontStyle: "italic" }}>
                “{catchphrase}”
              </div>
            </div>
          )}
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 15, color: C.textBody, lineHeight: 1.8, fontWeight: 600, textAlign: "center", marginBottom: 24 }}>{player.bio}</div>

          {presence && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
              <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, color: player.color, background: `${player.color}12`, padding: "6px 14px", borderRadius: 12, letterSpacing: 0.3 }}>Arrives: {presence.start} May</span>
              <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, color: player.color, background: `${player.color}12`, padding: "6px 14px", borderRadius: 12, letterSpacing: 0.3 }}>Departs: {presence.end} May</span>
            </div>
          )}

          {player.mystery ? (
            <div style={{ textAlign: "center", padding: "16px 12px", border: `2px dashed ${player.color}55`, borderRadius: 16, background: `${player.color}08` }}>
              <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 14, color: player.color, marginBottom: 6 }}>NO FLIGHT BOOKED</div>
              <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody, fontWeight: 600, lineHeight: 1.5 }}>If they say yes, we'll find a seat. Until then — pure speculation.</div>
            </div>
          ) : (
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10, color: C.textBody, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, textAlign: "center", opacity: 0.5 }}>Flights</div>
          )}
          {!player.mystery && playerFlights.map((f) => (
            <div key={f.id} style={{ background: `${player.color}08`, borderRadius: 16, padding: "14px 16px", marginBottom: 8, border: `1px solid ${player.color}15` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10, color: C.white, background: f.type === "Outbound" ? C.turquoise : C.coral, padding: "3px 10px", borderRadius: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>{f.type}</span>
                <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 11, color: C.textBody }}>{f.date}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18, color: C.dark }}>{f.from.code}</div>
                  <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: C.textBody, fontWeight: 700 }}>{f.depart}</div>
                </div>
                <div style={{ flex: 1, textAlign: "center", padding: "0 8px" }}>
                  <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: C.textBody, fontWeight: 700 }}>{f.duration}</div>
                  <div style={{ height: 2, background: `linear-gradient(90deg, ${player.color}44, ${player.color}, ${player.color}44)`, borderRadius: 2, margin: "4px 0" }} />
                  {f.stops ? <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 9, color: player.color, fontWeight: 800 }}>via {f.stopCity}</div> : <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 9, color: C.green, fontWeight: 800 }}>Direct</div>}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18, color: C.dark }}>{f.to.code}</div>
                  <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: C.textBody, fontWeight: 700 }}>{f.arrive}</div>
                </div>
              </div>
              <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: C.textBody, fontWeight: 600, textAlign: "center", marginTop: 8 }}>{f.flight} · {f.aircraft}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
