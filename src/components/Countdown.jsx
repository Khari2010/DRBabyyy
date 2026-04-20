import { useEffect, useState } from "react";
import { C } from "../data/colors.js";
import { TRIP_END } from "../lib/trip.js";

// Shared countdown built from home's 4-square digital clock.
// - `target`: a Date the countdown is counting toward.
// - `loaded`: fades in like on the hero (defaults to true for embedded use).
// - `compact`: scaled-down variant for in-section use on the dashboard.
export default function Countdown({ target, loaded = true, compact = false }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = target - now;

  // After the flight has left but we're still inside the trip window.
  if (diff <= 0 && now <= TRIP_END) {
    return (
      <div
        style={{
          opacity: loaded ? 1 : 0,
          transition: "all 0.6s ease 0.7s",
          marginTop: compact ? 0 : 24,
        }}
      >
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: compact ? "clamp(18px, 4vw, 24px)" : "clamp(20px, 5vw, 32px)",
            color: C.yellow,
            textShadow: `0 0 30px ${C.yellow}66`,
            textAlign: "center",
          }}
        >
          WE OUT HERE
        </div>
      </div>
    );
  }

  // After the trip ends entirely.
  if (diff <= 0 && now > TRIP_END) {
    return (
      <div
        style={{
          opacity: loaded ? 1 : 0,
          transition: "all 0.6s ease 0.7s",
          marginTop: compact ? 0 : 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: compact ? "clamp(16px, 3.5vw, 22px)" : "clamp(18px, 4.5vw, 28px)",
            color: C.gold,
            letterSpacing: 1,
          }}
        >
          TRIP OVER
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: compact ? 11 : 13,
            fontWeight: 800,
            color: C.textBody,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginTop: 6,
          }}
        >
          what a ride
        </div>
      </div>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  const units = [
    { val: days, label: "days" },
    { val: hours, label: "hrs" },
    { val: mins, label: "min" },
    { val: secs, label: "sec" },
  ];

  const minWidth = compact ? 44 : 56;
  const pad = compact ? "8px 10px" : "10px 12px";
  const numSize = compact ? 18 : 22;

  return (
    <div
      style={{
        display: "flex",
        gap: compact ? 8 : 10,
        justifyContent: "center",
        marginTop: compact ? 0 : 24,
        opacity: loaded ? 1 : 0,
        transform: loaded ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s ease 0.7s",
        flexWrap: "wrap",
      }}
    >
      {units.map((u) => (
        <div
          key={u.label}
          style={{
            textAlign: "center",
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: 14,
            padding: pad,
            minWidth,
          }}
        >
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: numSize,
              color: C.white,
              lineHeight: 1,
            }}
          >
            {String(u.val).padStart(2, "0")}
          </div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontSize: 9,
              fontWeight: 800,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginTop: 4,
            }}
          >
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
}
