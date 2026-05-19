import { useState } from "react";
import { DAYS } from "../data/itinerary.js";
import { currentTripDayIndex } from "../lib/drTime.js";
import { flightsForPlayer } from "../data/flights.js";
import { C } from "../data/colors.js";
import DayCommentThread from "./DayCommentThread.jsx";

// Same colour + image mapping as the home page itinerary section.
const DAY_COLORS = [
  C.turquoise,
  C.sky,
  C.coral,
  C.gold,
  C.green,
  C.coralDeep,
  C.purple,
  C.pink,
  C.cyan,
  C.blue,
  C.gold,
  C.coral,
];
const IMAGES = {
  heroBeach: "/images/group/hero-beach.webp",
  heroTown: "/images/group/hero-town.webp",
  heroMarket: "/images/group/hero-market.webp",
  heroScenic: "/images/group/hero-scenic.webp",
  heroColonial: "/images/group/hero-colonial.webp",
};
const DAY_IMAGES = [
  "heroBeach",
  "heroColonial",
  "heroTown",
  "heroMarket",
  "heroScenic",
  "heroColonial",
  "heroBeach",
  "heroTown",
  "heroColonial",
  "heroMarket",
  "heroBeach",
  "heroColonial",
];

// Parse a day's "DD MMM" date string into a Date in 2026.
function parseDayDate(s) {
  const [dayStr, monStr] = s.split(" ");
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  return new Date(2026, months[monStr] ?? 4, Number(dayStr));
}

// Build a contextual note for a day the player isn't present for, using flights.
function presenceNoteFor(player, day) {
  const flights = flightsForPlayer(player.name);
  if (!flights.length) return null;
  const outbound = flights.find((f) => f.type === "Outbound");
  const ret = flights.find((f) => f.type === "Return");
  const dayDate = parseDayDate(day.date);
  if (outbound && dayDate < parseDayDate(outbound.date)) {
    return `You arrive ${outbound.date}`;
  }
  if (ret && dayDate > parseDayDate(ret.date)) {
    return "You've flown home";
  }
  return null;
}

function CollapsedDayRow({ day, isPresent, isToday, playerColor, onClick }) {
  const accentColor = isPresent ? playerColor : C.textBody;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        borderRadius: 14,
        border: `1px solid ${C.sandDark}`,
        background: isToday ? `${C.coralDeep}08` : C.white,
        cursor: "pointer",
        textAlign: "left",
        opacity: isPresent ? 1 : 0.6,
      }}
    >
      {isToday && (
        <span style={{
          position: "absolute", top: -8, left: 12,
          background: C.coralDeep, color: C.white,
          fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 9,
          padding: "2px 8px", borderRadius: 999, letterSpacing: 1,
        }}>
          TODAY
        </span>
      )}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        minWidth: 44,
      }}>
        <div style={{
          fontFamily: "Nunito, sans-serif", fontWeight: 900,
          fontSize: 10, letterSpacing: 0.8, color: accentColor,
          textTransform: "uppercase",
        }}>{day.dow}</div>
        <div style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 22, color: C.dark, lineHeight: 1,
        }}>{day.date.split(" ")[0]}</div>
      </div>
      <div style={{ width: 1, height: 28, background: C.sandDark }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 16, color: C.dark, lineHeight: 1.1,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{day.title}</div>
        {day.tagline && (
          <div style={{
            fontFamily: "Nunito, sans-serif", fontSize: 12,
            color: C.textBody, marginTop: 2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{day.tagline}</div>
        )}
      </div>
      {isPresent && (
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: playerColor, marginRight: 4,
          flexShrink: 0,
        }} />
      )}
      <span style={{ color: C.textBody, fontFamily: "Nunito, sans-serif", flexShrink: 0 }}>▾</span>
    </button>
  );
}

function DayCard({ day, dayIndex, isActive, isPresent, playerColor, onClick, isToday }) {
  const [hovered, setHovered] = useState(false);
  const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
  const imgKey = DAY_IMAGES[dayIndex % DAY_IMAGES.length];

  // When the player IS on this day, bias the card's accent toward the player
  // colour for the border + shadow boost.
  const activeColor = isPresent ? playerColor : color;

  const borderColor = isActive
    ? activeColor
    : isPresent
      ? `${playerColor}66`
      : "transparent";

  const baseShadow = isActive
    ? isPresent
      ? `0 16px 48px ${playerColor}33, 0 0 0 2px ${playerColor}44`
      : `0 16px 48px ${color}33`
    : hovered
      ? `0 12px 36px ${color}22`
      : "0 4px 16px rgba(0,0,0,0.08)";

  const presentBoost = isPresent && !isActive ? `, 0 0 0 2px ${playerColor}22` : "";

  return (
    <div
      data-day-card
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        minHeight: 180,
        borderRadius: 24,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        transform: isActive ? "scale(1.01)" : hovered ? "scale(1.0)" : "scale(0.99)",
        boxShadow: baseShadow + presentBoost,
        background: C.white,
        border: `3px solid ${borderColor}`,
        userSelect: "none",
        opacity: isPresent ? 1 : 0.45,
        filter: isPresent ? "none" : "grayscale(0.6)",
      }}
    >
      <div
        style={{
          height: 100,
          backgroundImage: `url(${IMAGES[imgKey]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, ${color}88 0%, ${color}DD 100%)`,
          }}
        />

        {/* TODAY ribbon */}
        {isToday && (
          <div style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 4,
            background: C.coralDeep,
            color: C.white,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 10,
            padding: "3px 10px",
            borderRadius: 999,
            letterSpacing: 1,
          }}>
            TODAY
          </div>
        )}

        {/* You're here pill (top-left to avoid clashing with resort/cost) */}
        {isPresent && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 3,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 9,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: C.white,
              background: playerColor,
              padding: "4px 9px",
              borderRadius: 10,
              boxShadow: `0 4px 12px ${playerColor}55`,
            }}
          >
            You're here
          </div>
        )}

        {(day.status === "resort" || day.status === "mixed" || day.cost) && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 3,
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: "flex-end",
              maxWidth: "60%",
            }}
          >
            {(day.status === "resort" || day.status === "mixed") && (
              <span
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 900,
                  fontSize: 9,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: C.white,
                  background: "rgba(255,255,255,0.18)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  padding: "4px 9px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                🏝️ Resort
              </span>
            )}
            {day.cost && (
              <span
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 900,
                  fontSize: 9,
                  letterSpacing: 0.5,
                  color: color,
                  background: C.white,
                  padding: "4px 9px",
                  borderRadius: 10,
                  boxShadow: `0 4px 12px ${color}33`,
                }}
              >
                {day.cost}
              </span>
            )}
          </div>
        )}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: 16,
            display: "flex",
            alignItems: "flex-end",
            height: "100%",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: C.white,
                opacity: 0.85,
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
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 10,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {day.title}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: C.textBody,
            fontStyle: "italic",
            marginBottom: 4,
          }}
        >
          {"“"}{day.tagline}{"”"}
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 10,
            fontWeight: 700,
            color: C.textBody,
            opacity: 0.5,
            marginBottom: 8,
          }}
        >
          {day.who.join(", ")}
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 11,
            fontWeight: 800,
            color: activeColor,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {isActive ? "Tap to collapse ▲" : "Tap for plan ▼"}
        </div>
      </div>
    </div>
  );
}

function DayDetails({ day, dayIndex, player, presenceNote }) {
  const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
  const isPresent = day.who.includes(player.name);
  const accent = isPresent ? player.color : color;

  return (
    <div
      style={{
        background: C.white,
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: `0 16px 48px ${accent}1F`,
        border: `1px solid ${accent}22`,
        marginTop: 8,
      }}
    >
      {/* Header band */}
      <div
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accent}DD)`,
          padding: "20px clamp(18px, 4vw, 24px)",
          color: C.white,
        }}
      >
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: 0.9,
          }}
        >
          {day.dow} · {day.date}
        </div>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: "clamp(22px, 5vw, 28px)",
            lineHeight: 1.1,
            marginTop: 4,
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
              fontWeight: 600,
              opacity: 0.9,
              marginTop: 6,
            }}
          >
            {"“"}{day.tagline}{"”"}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {day.cost && (
            <span
              style={{
                display: "inline-block",
                fontFamily: "Nunito, sans-serif",
                fontWeight: 900,
                fontSize: 11,
                color: accent,
                background: C.white,
                padding: "5px 12px",
                borderRadius: 10,
                letterSpacing: 0.5,
              }}
            >
              {day.cost}
            </span>
          )}
          {!isPresent && presenceNote && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 11,
                color: C.white,
                background: "rgba(255,255,255,0.18)",
                padding: "5px 12px",
                borderRadius: 10,
                letterSpacing: 0.3,
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              ✈️ {presenceNote}
            </span>
          )}
          {isPresent && (
            <span
              style={{
                display: "inline-block",
                fontFamily: "Nunito, sans-serif",
                fontWeight: 900,
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: accent,
                background: C.white,
                padding: "5px 12px",
                borderRadius: 10,
              }}
            >
              You're here
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "clamp(16px, 4vw, 22px)" }}>
        {day.items && day.items.length > 0 ? (
          <ul style={{
            listStyle: "none", padding: 0, margin: 0,
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {day.items.map((it, i) => (
              <li key={i} style={{
                display: "flex", alignItems: "baseline", gap: 8,
                fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.dark,
              }}>
                {it.time && (
                  <span style={{
                    fontWeight: 800, color: C.textBody, minWidth: 56, fontSize: 12,
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>{it.time}</span>
                )}
                <span>
                  {it.icon ? `${it.icon} ` : ""}{it.activity}
                  {it.note && <span style={{ color: C.textBody }}> — {it.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {(!day.items || day.items.length < 2) && (
          <div style={{
            marginTop: 12, padding: "8px 12px",
            background: C.sand, borderRadius: 8,
            fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody, fontStyle: "italic",
          }}>
            More details pending — drop a comment.
          </div>
        )}
        <DayCommentThread dayDate={day.date} />
      </div>
    </div>
  );
}

export default function YourItineraryHome({ player }) {
  const todayIdx = currentTripDayIndex(DAYS);
  const [activeDay, setActiveDay] = useState(() => todayIdx);

  const scrollToDay = (i) => {
    setActiveDay(i);
    // Wait for React to render the newly expanded row, then scroll it into view.
    setTimeout(() => {
      const el = document.querySelector(`[data-day-row="${i}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Selector chip row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          marginBottom: 18,
          padding: "0 16px",
          flexWrap: "wrap",
        }}
      >
        {DAYS.map((d, i) => {
          const color = DAY_COLORS[i % DAY_COLORS.length];
          const present = d.who.includes(player.name);
          const isActive = activeDay === i;
          const chipBg = isActive ? (present ? player.color : color) : `${color}18`;
          const chipColor = isActive ? C.white : color;
          return (
            <button
              key={d.date}
              onClick={() => scrollToDay(i)}
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 10,
                padding: "6px 10px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                background: chipBg,
                color: chipColor,
                transition: "all 0.3s ease",
                letterSpacing: 0.3,
                opacity: present ? 1 : 0.5,
                filter: present ? "none" : "grayscale(0.4)",
                position: "relative",
              }}
            >
              {i === todayIdx && (
                <span style={{
                  position: "absolute",
                  top: -10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: C.coralDeep,
                  color: C.white,
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 900,
                  fontSize: 8,
                  padding: "1px 6px",
                  borderRadius: 999,
                  letterSpacing: 0.5,
                  whiteSpace: "nowrap",
                }}>
                  TODAY
                </span>
              )}
              <span style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                lineHeight: 1, gap: 1,
              }}>
                <span style={{ fontSize: 11, fontWeight: 900 }}>{d.date.split(" ")[0]}</span>
                <span style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
                  textTransform: "uppercase",
                  opacity: 0.7,
                }}>{d.dow}</span>
              </span>
              {present && !isActive && (
                <span
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: player.color,
                    boxShadow: `0 0 0 2px ${C.white}`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Vertical accordion list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>
        {DAYS.map((d, i) => {
          const isActive = activeDay === i;
          const present = d.who.includes(player.name);
          return (
            <div key={d.date} data-day-row={i}>
              {isActive ? (
                <DayCard
                  day={d}
                  dayIndex={i}
                  isActive={true}
                  isPresent={present}
                  isToday={i === todayIdx}
                  playerColor={player.color}
                  onClick={() => setActiveDay(activeDay === i ? -1 : i)}
                />
              ) : (
                <CollapsedDayRow
                  day={d}
                  dayIndex={i}
                  isPresent={present}
                  isToday={i === todayIdx}
                  playerColor={player.color}
                  onClick={() => scrollToDay(i)}
                />
              )}
              {isActive && (
                <DayDetails
                  day={d}
                  dayIndex={i}
                  player={player}
                  presenceNote={!present ? presenceNoteFor(player, d) : null}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
