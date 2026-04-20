import { useRef, useState, useEffect } from "react";
import { daysForPlayer, DAY_ACCENTS } from "../data/itinerary.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

function CrewAvatars({ who, currentName, accent }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <span
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 10,
          color: accent,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginRight: 4,
        }}
      >
        Your crew today
      </span>
      {who.map((name) => {
        const p = PLAYERS.find((pl) => pl.name === name);
        const color = p?.color ?? C.textBody;
        const isMe = name === currentName;
        return (
          <div
            key={name}
            title={name}
            style={{
              width: isMe ? 28 : 24,
              height: isMe ? 28 : 24,
              borderRadius: "50%",
              overflow: "hidden",
              background: color,
              boxShadow: isMe
                ? `0 0 0 2px ${C.white}, 0 0 0 4px ${color}, 0 2px 8px ${color}55`
                : `0 0 0 2px ${C.white}, 0 1px 3px rgba(0,0,0,0.1)`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {p?.avatar ? (
              <img
                src={p.avatar}
                alt={name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
              />
            ) : (
              <span style={{ fontSize: 12, color: C.white }}>{p?.emoji ?? name[0]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DayModal({ day, accent, currentName, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "dayModalFade 0.25s ease",
      }}
    >
      <style>{`
        @keyframes dayModalFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dayModalPop { from { opacity: 0; transform: scale(0.94) translateY(12px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: C.white,
          borderRadius: 24,
          boxShadow: `0 24px 80px rgba(0,0,0,0.3), 0 0 0 1px ${accent}22`,
          animation: "dayModalPop 0.3s cubic-bezier(0.16,1,0.3,1)",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 3,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Nunito, sans-serif",
            fontSize: 16,
            color: C.white,
            fontWeight: 700,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          ✕
        </button>

        {/* Coloured band header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}DD)`,
            padding: "22px clamp(18px, 4vw, 24px)",
            color: C.white,
            borderRadius: "24px 24px 0 0",
          }}
        >
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              opacity: 0.85,
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
          {day.cost && (
            <div
              style={{
                display: "inline-block",
                marginTop: 12,
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
            </div>
          )}
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

          {/* Crew */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: `1px solid ${C.sandDark}`,
            }}
          >
            <CrewAvatars who={day.who} currentName={currentName} accent={accent} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DayCard({ day, accent, onOpen }) {
  return (
    <div
      onClick={onOpen}
      style={{
        flex: "0 0 auto",
        width: "min(300px, 80vw)",
        scrollSnapAlign: "center",
        background: C.white,
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: `0 10px 30px ${accent}1A`,
        border: `1px solid ${accent}22`,
        cursor: "pointer",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 16px 36px ${accent}2A`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = `0 10px 30px ${accent}1A`;
      }}
    >
      {/* Coloured band */}
      <div
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accent}DD)`,
          padding: "14px 16px",
          color: C.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            background: "rgba(255,255,255,0.22)",
            padding: "4px 10px",
            borderRadius: 999,
          }}
        >
          {day.dow} · {day.date}
        </span>
        {day.cost && (
          <span
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 10,
              color: accent,
              background: C.white,
              padding: "3px 9px",
              borderRadius: 8,
              letterSpacing: 0.4,
            }}
          >
            {day.cost}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 20,
            color: C.dark,
            lineHeight: 1.15,
            marginBottom: 4,
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
              color: C.textBody,
              marginBottom: 12,
              lineHeight: 1.4,
            }}
          >
            {"\u201C"}{day.tagline}{"\u201D"}
          </div>
        )}

        {/* Preview items (first 3) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {day.items.slice(0, 3).map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
              <span
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  color: C.textBody,
                  lineHeight: 1.35,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.activity}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            color: accent,
            textTransform: "uppercase",
            letterSpacing: 1,
            padding: "6px 12px",
            borderRadius: 999,
            background: `${accent}14`,
          }}
        >
          View day →
        </div>
      </div>
    </div>
  );
}

export default function YourItineraryCarousel({ player }) {
  const days = daysForPlayer(player.name);
  const scrollRef = useRef(null);
  const [openIndex, setOpenIndex] = useState(null);
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
  }, [days.length]);

  const scrollByCard = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector("[data-day-card]");
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 280;
    el.scrollBy({ left: dir * (cardWidth + 14), behavior: "smooth" });
  };

  if (days.length === 0) {
    return (
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          color: C.textBody,
          textAlign: "center",
          padding: "20px 0",
        }}
      >
        No scheduled days yet.
      </div>
    );
  }

  const openDay = openIndex !== null ? days[openIndex] : null;
  const openAccent =
    openIndex !== null ? DAY_ACCENTS[openIndex % DAY_ACCENTS.length] : C.coral;

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        .itinerary-carousel::-webkit-scrollbar { display: none; }
        .itinerary-carousel { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Desktop arrows */}
      {canScrollLeft && (
        <button
          aria-label="Previous day"
          onClick={() => scrollByCard(-1)}
          style={{
            position: "absolute",
            left: 4,
            top: "50%",
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
            display: "none",
          }}
          className="itinerary-arrow itinerary-arrow-left"
        >
          ‹
        </button>
      )}
      {canScrollRight && (
        <button
          aria-label="Next day"
          onClick={() => scrollByCard(1)}
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
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
            display: "none",
          }}
          className="itinerary-arrow itinerary-arrow-right"
        >
          ›
        </button>
      )}
      <style>{`
        @media (min-width: 720px) {
          .itinerary-arrow { display: flex !important; align-items: center; justify-content: center; }
        }
      `}</style>

      <div
        ref={scrollRef}
        className="itinerary-carousel"
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          gap: 14,
          padding: "4px 20px 20px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {days.map((day, i) => (
          <div key={day.date} data-day-card style={{ display: "flex" }}>
            <DayCard
              day={day}
              accent={DAY_ACCENTS[i % DAY_ACCENTS.length]}
              onOpen={() => setOpenIndex(i)}
            />
          </div>
        ))}
      </div>

      {openDay && (
        <DayModal
          day={openDay}
          accent={openAccent}
          currentName={player.name}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
