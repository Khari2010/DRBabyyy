import { useEffect, useState } from "react";
import { C } from "../data/colors.js";

const NAV_ITEMS = [
  { id: "about", label: "About" },
  { id: "adventures", label: "Adventures" },
  { id: "itinerary", label: "Itinerary" },
  { id: "game", label: "The Game" },
  { id: "crew", label: "The Crew" },
];

function useScrollSpy(ids, offset = 80) {
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: `-${offset}px 0px -50% 0px`, threshold: 0 },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids, offset]);
  return activeId;
}

// Mirrors home's StickyNav: fixed, hidden until you've scrolled ~85% of the
// viewport, blurred glass background, coral pill highlight on the active id.
// The accent is per-player so the nav feels native to the dashboard.
export default function PlayerStickyNav({ accent = C.coral }) {
  const activeId = useScrollSpy(NAV_ITEMS.map((n) => n.id));
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () =>
      setShow(window.scrollY > window.innerHeight * 0.85);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transform: show ? "translateY(0)" : "translateY(-100%)",
        opacity: show ? 1 : 0,
        transition:
          "transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease",
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        padding: "12px 0",
      }}
    >
      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          overflowX: "auto",
          padding: "0 16px",
        }}
      >
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById(item.id)
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 11,
              padding: "6px 14px",
              borderRadius: 20,
              border: "none",
              textDecoration: "none",
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "all 0.3s ease",
              background: activeId === item.id ? accent : "rgba(0,0,0,0.04)",
              color: activeId === item.id ? C.white : C.textBody,
              letterSpacing: 0.5,
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
