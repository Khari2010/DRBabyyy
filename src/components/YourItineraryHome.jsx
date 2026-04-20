import { useRef, useState, useEffect } from "react";
import { DAYS } from "../data/itinerary.js";
import { flightsForPlayer } from "../data/flights.js";
import { C } from "../data/colors.js";

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
  heroBeach: "/images/group/hero-beach.jpg",
  heroTown: "/images/group/hero-town.jpg",
  heroMarket: "/images/group/hero-market.jpg",
  heroScenic: "/images/group/hero-scenic.jpg",
  heroColonial: "/images/group/hero-colonial.jpg",
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

function DayCard({ day, dayIndex, isActive, isPresent, playerColor, onClick }) {
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
        flex: "0 0 auto",
        width: 280,
        minHeight: 180,
        borderRadius: 24,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        transform: isActive ? "scale(1.03)" : hovered ? "scale(1.0)" : "scale(0.96)",
        boxShadow: baseShadow + presentBoost,
        background: C.white,
        border: `3px solid ${borderColor}`,
        userSelect: "none",
        scrollSnapAlign: "center",
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
              {day.dow} — {day.title}
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
          {"\u201C"}{day.tagline}{"\u201D"}
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
          {isActive ? "Showing plan ▲" : "Tap for plan ▼"}
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
        maxWidth: 640,
        margin: "0 auto",
        background: C.white,
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: `0 16px 48px ${accent}1F`,
        border: `1px solid ${accent}22`,
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
            {"\u201C"}{day.tagline}{"\u201D"}
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
  );
}

export default function YourItineraryHome({ player }) {
  // Start on the player's first present day if they have one; otherwise day 0.
  const firstPresentIdx = DAYS.findIndex((d) => d.who.includes(player.name));
  const [activeDay, setActiveDay] = useState(firstPresentIdx === -1 ? 0 : firstPresentIdx);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateArrows = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < maxScroll - 4);
    };
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, []);

  const scrollToDay = (i) => {
    setActiveDay(i);
    const el = scrollRef.current;
    if (el?.children[i]) {
      el.children[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  const scrollByCard = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector("[data-day-card]");
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 280;
    el.scrollBy({ left: dir * (cardWidth + 16), behavior: "smooth" });
  };

  const activeDayData = DAYS[activeDay];
  const activeIsPresent = activeDayData.who.includes(player.name);
  const presenceNote = !activeIsPresent ? presenceNoteFor(player, activeDayData) : null;

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        .itinerary-home-scroll::-webkit-scrollbar { display: none; }
        .itinerary-home-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .itinerary-home-arrow { display: none; }
        @media (min-width: 720px) {
          .itinerary-home-arrow { display: flex !important; align-items: center; justify-content: center; }
        }
      `}</style>

      {/* Selector chip row */}
      <div
        className="itinerary-home-scroll"
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
              {d.date.split(" ")[0]}
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

      {/* Desktop arrows */}
      {canScrollLeft && (
        <button
          aria-label="Previous day"
          onClick={() => scrollByCard(-1)}
          className="itinerary-home-arrow"
          style={{
            position: "absolute",
            left: 4,
            top: "54%",
            transform: "translateY(-50%)",
            zIndex: 2,
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: C.white,
            border: "none",
            boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
            cursor: "pointer",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 18,
            color: C.dark,
          }}
        >
          ‹
        </button>
      )}
      {canScrollRight && (
        <button
          aria-label="Next day"
          onClick={() => scrollByCard(1)}
          className="itinerary-home-arrow"
          style={{
            position: "absolute",
            right: 4,
            top: "54%",
            transform: "translateY(-50%)",
            zIndex: 2,
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: C.white,
            border: "none",
            boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
            cursor: "pointer",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 18,
            color: C.dark,
          }}
        >
          ›
        </button>
      )}

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="itinerary-home-scroll"
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          padding: "8px 28px 24px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {DAYS.map((d, i) => (
          <DayCard
            key={d.date}
            day={d}
            dayIndex={i}
            isActive={activeDay === i}
            isPresent={d.who.includes(player.name)}
            playerColor={player.color}
            onClick={() => scrollToDay(i)}
          />
        ))}
      </div>

      {/* Details panel */}
      <div style={{ padding: "12px 12px 0" }}>
        <DayDetails
          day={activeDayData}
          dayIndex={activeDay}
          player={player}
          presenceNote={presenceNote}
        />
      </div>
    </div>
  );
}
