import { useState, useEffect, useRef } from "react";

// ─── FONTS ──────────────────────────────────────────────────────────────────
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Nunito:wght@400;600;700;800;900&display=swap";

// ─── COLORS ─────────────────────────────────────────────────────────────────
const C = {
  sky: "#38BDF8",
  turquoise: "#00CEC9",
  coral: "#FF6B6B",
  coralDeep: "#E8453C",
  yellow: "#FFD93D",
  gold: "#F59E0B",
  green: "#00B894",
  palm: "#15803D",
  sand: "#FEF9EF",
  sandDark: "#F5EDE0",
  white: "#FFFFFF",
  dark: "#1A1A2E",
  darkSoft: "#2D2D44",
  textBody: "#4A4A6A",
  pink: "#F9A8D4",
  blue: "#3b82f6",
  purple: "#a855f7",
  cyan: "#06b6d4",
};

// ─── IMAGES ─────────────────────────────────────────────────────────────────
const IMAGES = {
  heroBeach: "/images/group/hero-beach.jpg",
  heroTown: "/images/group/hero-town.jpg",
  heroMarket: "/images/group/hero-market.jpg",
  heroScenic: "/images/group/hero-scenic.jpg",
  venueRestaurants: "/images/venues/restaurants.webp",
  venueExcursions: "/images/venues/excursions.webp",
  venueNightlife: "/images/venues/nightlife.webp",
};

// ─── DATA ───────────────────────────────────────────────────────────────────
const MEMBERS = ["Kai", "Khari", "Candice", "Kyanna", "Camara", "Miles"];
const FULL_GROUP = MEMBERS;

const PLAYERS = [
  { id: 1, num: "01", name: "Kai", title: "The Visionary", bio: "Content creator mode: always on. Will have every angle of the trip documented in 4K.", color: C.blue, emoji: "🎬", avatar: "/images/avatars/kai.png" },
  { id: 2, num: "02", name: "Khari", title: "The Architect", bio: "Built this entire trip from scratch. If it's planned, it's because of this one.", color: C.gold, emoji: "👑", avatar: "/images/avatars/khari.png" },
  { id: 3, num: "03", name: "Candice", title: "The Energy", bio: "First one up, last one to care. Brings the vibes that make the trip legendary.", color: C.coral, emoji: "💃", avatar: "/images/avatars/candice.png" },
  { id: 4, num: "04", name: "Kyanna", title: "The Wildcard", bio: "Quiet until she's not. Expect the unexpected — that's the whole point.", color: C.purple, emoji: "✨", avatar: "/images/avatars/kyanna.png" },
  { id: 5, num: "05", name: "Camara", title: "The Connector", bio: "Knows everyone within 30 minutes of landing. Somehow always finds the best spots.", color: C.green, emoji: "🌊", avatar: "/images/avatars/camara.png" },
  { id: 6, num: "06", name: "Miles", title: "The Legend", bio: "Moves in silence but hits different. By day 3, the resort will know his name.", color: C.cyan, emoji: "🔥", avatar: "/images/avatars/miles.png" },
];

const PRESENCE = [
  { name: "Kai", start: 18, end: 29, color: C.blue },
  { name: "Khari", start: 18, end: 29, color: C.gold },
  { name: "Candice", start: 18, end: 25, color: C.coral },
  { name: "Kyanna", start: 18, end: 25, color: C.purple },
  { name: "Camara", start: 20, end: 25, color: C.green },
  { name: "Miles", start: 20, end: 26, color: C.cyan },
];

const RESORT = {
  name: "Royalton CHIC Punta Cana",
  address: "Highway Macao, Uvero Alto Beach, Punta Cana, DO 23000",
  stars: 5,
  checkIn: "3:00 PM",
  checkOut: "12:00 PM",
  phone: "+008299548177",
  allInclusive: true,
  included: [
    { icon: "🍽️", label: "All Meals" },
    { icon: "🍹", label: "Premium Drinks" },
    { icon: "🎉", label: "Entertainment" },
    { icon: "🏊", label: "Pools & Beach" },
    { icon: "💪", label: "Gym & Spa" },
    { icon: "📶", label: "WiFi" },
  ],
};

const FLIGHTS = [
  { id: "out-main", type: "Outbound", date: "18 May", flight: "TOM566", aircraft: "Boeing 787 Dreamliner", from: { code: "BHX", city: "Birmingham" }, to: { code: "PUJ", city: "Punta Cana" }, depart: "11:00", arrive: "14:50", duration: "9h 50m", who: ["Kai", "Khari", "Candice", "Kyanna"] },
  { id: "out-cm", type: "Outbound", date: "19 May", flight: "AV121 + AV128", aircraft: "787-8 / A320", from: { code: "LHR", city: "London" }, to: { code: "PUJ", city: "Punta Cana" }, depart: "22:05", arrive: "11:25+1", duration: "18h 20m", stops: 1, stopCity: "Bogota", who: ["Camara", "Miles"] },
  { id: "return-girls", type: "Return", date: "25 May", flight: "TOM567", aircraft: "Boeing 787 Dreamliner", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "BHX", city: "Birmingham" }, depart: "16:50", arrive: "06:00+1", duration: "8h 10m", who: ["Candice", "Kyanna"] },
  { id: "return-camara", type: "Return", date: "25 May", flight: "AV137 + AV120", aircraft: "A320NEO / 787-8", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "LHR", city: "London" }, depart: "18:35", arrive: "15:35+1", duration: "16h", stops: 1, stopCity: "Bogota", who: ["Camara"] },
  { id: "return-miles", type: "Return", date: "26 May", flight: "AV137 + AV120", aircraft: "A320 / 787-8", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "LHR", city: "London" }, depart: "18:35", arrive: "15:35+1", duration: "16h", stops: 1, stopCity: "Bogota", who: ["Miles"] },
  { id: "return-boys", type: "Return", date: "29 May", flight: "TOM569", aircraft: "Boeing 787 Dreamliner", from: { code: "PUJ", city: "Punta Cana" }, to: { code: "BHX", city: "Birmingham" }, depart: "17:10", arrive: "06:15+1", duration: "8h 05m", who: ["Kai", "Khari"] },
];

const DAY_COLORS = [C.turquoise, C.sky, C.coral, C.gold, C.green, C.coralDeep, C.purple, C.pink, C.cyan, C.blue, C.gold, C.coral];
const DAY_IMAGES = ["heroBeach", "heroTown", "heroMarket", "heroScenic", "heroBeach", "heroTown", "heroMarket", "heroScenic", "heroBeach", "heroTown", "heroMarket", "heroBeach"];

const DAYS = [
  { date: "18 May", dow: "Mon", title: "Arrival Day", tagline: "Touchdown in paradise", who: ["Kai", "Khari", "Candice", "Kyanna"], items: [{ time: "11:00", activity: "Depart Birmingham (TOM566)", icon: "✈️" }, { time: "14:50", activity: "Arrive Punta Cana", icon: "🛬" }, { time: "15:30", activity: "Transfer & check-in", icon: "🚐" }, { time: "20:00", activity: "Dinner at resort", icon: "🍽️" }, { time: "22:00", activity: "Welcome Party", icon: "🎊" }] },
  { date: "19 May", dow: "Tue", title: "Chill Day", tagline: "Pool vibes & resort exploring", who: ["Kai", "Khari", "Candice", "Kyanna"], items: [{ time: "09:00", activity: "Breakfast", icon: "🌅" }, { time: "11:30", activity: "Beach & pool", icon: "🏖️" }, { time: "20:00", activity: "Dinner", icon: "🍽️" }, { time: "22:00", activity: "CHIC Angels Show", icon: "👯" }, { time: "22:05", activity: "Camara & Miles depart LHR", icon: "✈️" }] },
  { date: "20 May", dow: "Wed", title: "Full Group + Cabanna", tagline: "The squad is complete", who: FULL_GROUP, items: [{ time: "Day", activity: "Relax / Camara & Miles arrive", icon: "🛬" }, { time: "15:00", activity: "Foam Party at pool", icon: "🫧" }, { time: "19:30", activity: "Cabanna dinner (£40-80pp)", icon: "✨" }, { time: "22:00", activity: "Drinks / light night", icon: "🍹" }] },
  { date: "21 May", dow: "Thu", title: "Saona Island", tagline: "Island hopping & starfish", who: FULL_GROUP, items: [{ time: "06:30", activity: "Pickup from resort", icon: "🚐" }, { time: "09:30", activity: "Boat departure", icon: "⛵" }, { time: "11:30", activity: "Island time + lunch (£70-120pp)", icon: "🏝️" }, { time: "16:00", activity: "Return journey", icon: "🚤" }, { time: "Eve", activity: "Caribbean Night at resort", icon: "🌴" }] },
  { date: "22 May", dow: "Fri", title: "Party Boat + Games", tagline: "Open bar on the ocean", who: FULL_GROUP, items: [{ time: "AM", activity: "Free time / pool", icon: "🏊" }, { time: "14:30", activity: "Jamaican Party Boat (£50pp)", icon: "🚤" }, { time: "21:00", activity: "Game Night", icon: "🎲" }, { time: "23:00", activity: "White Party", icon: "⚪" }] },
  { date: "23 May", dow: "Sat", title: "Coco Bongo Night", tagline: "The wildest night in Punta Cana", who: FULL_GROUP, items: [{ time: "Day", activity: "Chill / pool", icon: "🏖️" }, { time: "16:00", activity: "Glow Party at pool", icon: "✨" }, { time: "21:00", activity: "Coco Bongo Show + Club (£60-100pp)", icon: "🎭" }, { time: "Late", activity: "Optional Drink Point", icon: "🍾" }] },
  { date: "24 May", dow: "Sun", title: "Scape Park + Sky Dinner", tagline: "Adventure by day, sky-high by night", who: FULL_GROUP, items: [{ time: "08:30", activity: "Leave for Scape Park", icon: "🚐" }, { time: "09:30", activity: "Scape Park (£90-130pp)", icon: "🎢" }, { time: "19:30", activity: "Dinner in the Sky (£120-180pp)", icon: "🎈" }, { time: "22:30", activity: "Optional nightlife", icon: "🌙" }] },
  { date: "25 May", dow: "Mon", title: "Departures Begin", tagline: "Bittersweet goodbyes", who: FULL_GROUP, items: [{ time: "AM", activity: "Breakfast / send-off", icon: "🌅" }, { time: "16:50", activity: "Candice & Kyanna depart (TOM567)", icon: "✈️" }, { time: "18:35", activity: "Camara departs (AV137)", icon: "✈️" }, { time: "22:30", activity: "Boys night begins", icon: "🔥" }] },
  { date: "26 May", dow: "Tue", title: "Recovery Day", tagline: "Absolutely nothing. As planned.", who: ["Kai", "Khari", "Miles"], items: [{ time: "Late AM", activity: "Wake up slowly", icon: "☕" }, { time: "Day", activity: "Pool / beach / spa", icon: "💆" }, { time: "18:35", activity: "Miles departs (AV137)", icon: "✈️" }] },
  { date: "27 May", dow: "Wed", title: "Filming Day", tagline: "Golden hour content creation", who: ["Kai", "Khari"], items: [{ time: "06:00", activity: "Sunrise filming at Macao", icon: "🌅" }, { time: "10:00", activity: "Explore / B-roll", icon: "📹" }, { time: "PM", activity: "Rest", icon: "😴" }] },
  { date: "28 May", dow: "Thu", title: "Altos de Chavon", tagline: "Last sunset, make it count", who: ["Kai", "Khari"], items: [{ time: "14:30", activity: "Depart for Altos de Chavon", icon: "🚐" }, { time: "16:00", activity: "Explore + golden hour", icon: "🌇" }, { time: "Eve", activity: "Final dinner", icon: "🍽️" }] },
  { date: "29 May", dow: "Fri", title: "Departure", tagline: "Until next time, paradise", who: ["Kai", "Khari"], items: [{ time: "AM", activity: "Pack / chill", icon: "🧳" }, { time: "13:30", activity: "Leave for airport", icon: "🚐" }, { time: "17:10", activity: "Flight home (TOM569)", icon: "✈️" }] },
];

const TRIP_INFO = [
  { key: "Timezone", value: "AST (UTC-4)", icon: "🕐" },
  { key: "UK Difference", value: "5 hours behind UK", icon: "🇬🇧" },
  { key: "Currency", value: "Dominican Peso (DOP) / USD accepted", icon: "💰" },
  { key: "Language", value: "Spanish (English at resort)", icon: "🗣️" },
  { key: "Plug Type", value: "US Type A/B — UK adapter needed!", icon: "🔌" },
  { key: "Emergency", value: "911", icon: "🚨" },
  { key: "UK Embassy", value: "+1 809-472-7111", icon: "🏛️" },
  { key: "Resort Phone", value: "+008299548177", icon: "📞" },
];

const CHALLENGES = [
  { id: 1, title: "First Splash", description: "First person in the ocean after landing", icon: "🏊", points: 10 },
  { id: 2, title: "Sunrise Chaser", description: "Catch 3 sunrises during the trip", icon: "🌅", points: 15 },
  { id: 3, title: "Content King", description: "Post the best trip reel", icon: "📸", points: 20 },
  { id: 4, title: "Iron Stomach", description: "Try every restaurant at the resort", icon: "🍽️", points: 15 },
  { id: 5, title: "Dance Floor MVP", description: "Own the dance floor at Coco Bongo", icon: "💃", points: 20 },
  { id: 6, title: "Early Bird", description: "First to breakfast 3 mornings", icon: "☀️", points: 10 },
  { id: 7, title: "Squad Goals", description: "Organise a group activity", icon: "🤝", points: 15 },
  { id: 8, title: "Last One Standing", description: "Last person awake 3 nights running", icon: "🌙", points: 15 },
];

const ACTIVITIES = [
  { id: "saona", name: "Saona Island", icon: "🏝️", description: "Full-day boat trip with open bar, starfish beach, and island BBQ lunch", price: "£70-120pp", day: "21 May", color: C.turquoise },
  { id: "party-boat", name: "Jamaican Party Boat", icon: "🚤", description: "Afternoon party cruise with open bar, music, and ocean vibes", price: "£50pp", day: "22 May", color: C.blue },
  { id: "coco-bongo", name: "Coco Bongo", icon: "🎭", description: "The wildest night in Punta Cana — live show, open bar, and non-stop party", price: "£60-100pp", day: "23 May", color: C.purple },
  { id: "scape-park", name: "Scape Park", icon: "🎢", description: "Adventure park with zip-lines, cenotes, caves, and adrenaline rushes", price: "£90-130pp", day: "24 May", color: C.green },
  { id: "sky-dinner", name: "Dinner in the Sky", icon: "🎈", description: "Fine dining suspended 150ft in the air with panoramic views", price: "£120-180pp", day: "24 May", color: C.coral },
  { id: "altos", name: "Altos de Chavón", icon: "🌇", description: "16th-century Mediterranean village replica — golden hour views and exploring", price: "Free", day: "28 May", color: C.gold },
];

const NAV_ITEMS = [
  { id: "about", label: "About the Holiday" },
  { id: "players", label: "Meet the Players" },
  { id: "itinerary", label: "Itinerary" },
  { id: "challenges", label: "Learn the Game" },
];

// ─── HOOKS ──────────────────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useScrollSpy(ids, offset = 80) {
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: `-${offset}px 0px -50% 0px`, threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids, offset]);
  return activeId;
}

// ─── COMPONENTS ─────────────────────────────────────────────────────────────
const Reveal = ({ children, delay = 0, direction = "up", style = {} }) => {
  const [ref, visible] = useReveal();
  const dirs = { up: "translateY(50px)", down: "translateY(-50px)", left: "translateX(60px)", right: "translateX(-60px)", scale: "scale(0.85)" };
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translate(0) scale(1)" : dirs[direction], transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`, ...style }}>
      {children}
    </div>
  );
};

const StickyNav = () => {
  const activeId = useScrollSpy(NAV_ITEMS.map((n) => n.id));
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > window.innerHeight * 0.85);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      transform: show ? "translateY(0)" : "translateY(-100%)",
      opacity: show ? 1 : 0,
      transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease",
      background: "rgba(255,255,255,0.75)",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(0,0,0,0.06)",
      padding: "12px 0",
    }}>
      <div className="no-scrollbar" style={{ display: "flex", justifyContent: "center", gap: 6, overflowX: "auto", padding: "0 16px" }}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => { e.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" }); }}
            style={{
              fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11,
              padding: "6px 14px", borderRadius: 20, border: "none", textDecoration: "none",
              whiteSpace: "nowrap", cursor: "pointer", transition: "all 0.3s ease",
              background: activeId === item.id ? C.coral : "rgba(0,0,0,0.04)",
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
};

const Countdown = ({ loaded }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date("2026-05-18T11:00:00+01:00");
  const diff = target - now;

  if (diff <= 0) {
    return (
      <div style={{ opacity: loaded ? 1 : 0, transition: "all 0.6s ease 0.7s", marginTop: 24 }}>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(20px, 5vw, 32px)", color: C.yellow, textShadow: `0 0 30px ${C.yellow}66` }}>
          WE OUT HERE
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

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.6s ease 0.7s" }}>
      {units.map((u) => (
        <div key={u.label} style={{ textAlign: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderRadius: 14, padding: "10px 12px", minWidth: 56 }}>
          <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 22, color: C.white, lineHeight: 1 }}>{String(u.val).padStart(2, "0")}</div>
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{u.label}</div>
        </div>
      ))}
    </div>
  );
};

const ProfileCard = ({ player, index, onOpen }) => (
  <Reveal delay={index * 0.08} style={{ flex: "0 0 auto" }}>
    <div
      onClick={onOpen}
      style={{
        width: 200, height: 300, borderRadius: 24, cursor: "pointer", userSelect: "none",
        background: `linear-gradient(170deg, ${C.white} 0%, ${player.color}15 100%)`,
        border: `3px solid ${player.color}44`,
        boxShadow: `0 8px 32px ${player.color}22`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 10, padding: 20,
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ width: 100, height: 100, borderRadius: "50%", overflow: "hidden", border: `3px solid ${player.color}55`, boxShadow: `0 4px 16px ${player.color}30` }}>
        <img src={player.avatar} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }} />
      </div>
      <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 14, color: player.color, letterSpacing: 3 }}>#{player.num}</div>
      <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 16, color: C.dark, textAlign: "center", lineHeight: 1.3 }}>{player.name}</div>
      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, color: C.white, background: player.color, padding: "4px 14px", borderRadius: 16, letterSpacing: 0.5, textTransform: "uppercase" }}>{player.title}</div>
      <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: C.textBody, marginTop: "auto", animation: "tapPulse 2.5s ease-in-out infinite" }}>tap to view profile</div>
    </div>
  </Reveal>
);

const ProfileModal = ({ player, onClose }) => {
  if (!player) return null;
  const presence = PRESENCE.find((p) => p.name === player.name);
  const playerFlights = FLIGHTS.filter((f) => f.who.includes(player.name));

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
          width: "90vw", maxWidth: 420, maxHeight: "85vh", overflowY: "auto",
          background: C.white, borderRadius: 28,
          boxShadow: `0 24px 80px rgba(0,0,0,0.3), 0 0 0 1px ${player.color}22`,
          animation: "modalScaleIn 0.3s cubic-bezier(0.16,1,0.3,1)",
          position: "relative",
        }}
        className="no-scrollbar"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 3,
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(0,0,0,0.08)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Nunito, sans-serif", fontSize: 16, color: C.textBody, fontWeight: 700,
          }}
        >
          ✕
        </button>

        {/* Colored header band */}
        <div style={{
          background: `linear-gradient(135deg, ${player.color}, ${player.color}CC)`,
          borderRadius: "28px 28px 0 0", padding: "32px 24px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <div style={{ width: 110, height: 110, borderRadius: "50%", overflow: "hidden", border: "3px solid rgba(255,255,255,0.3)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <img src={player.avatar} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }} />
          </div>
          <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.7)", letterSpacing: 3 }}>#{player.num}</div>
          <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 24, color: C.white, textAlign: "center" }}>{player.name}</div>
          <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12, color: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.15)", padding: "5px 16px", borderRadius: 16, letterSpacing: 1, textTransform: "uppercase" }}>{player.title}</div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 24px 28px" }}>
          {/* Bio */}
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.textBody, lineHeight: 1.8, fontWeight: 600, textAlign: "center", marginBottom: 20 }}>{player.bio}</div>

          {/* Travel dates */}
          {presence && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
              <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, color: player.color, background: `${player.color}12`, padding: "6px 14px", borderRadius: 12, letterSpacing: 0.3 }}>Arrives: {presence.start} May</span>
              <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, color: player.color, background: `${player.color}12`, padding: "6px 14px", borderRadius: 12, letterSpacing: 0.3 }}>Departs: {presence.end} May</span>
            </div>
          )}

          {/* Flights */}
          <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10, color: C.textBody, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, textAlign: "center", opacity: 0.5 }}>Flights</div>
          {playerFlights.map((f) => (
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

const PresenceChart = () => {
  const totalDays = 12; // 18 to 29
  return (
    <Reveal delay={0.15}>
      <div style={{ padding: "0 24px", marginTop: 8 }}>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.gold, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>Who's There When</div>
        <div style={{ maxWidth: 540, margin: "0 auto", background: C.white, borderRadius: 20, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          {/* Date axis */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12, paddingLeft: 72 }}>
            {Array.from({ length: totalDays }, (_, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", fontFamily: "Nunito, sans-serif", fontSize: 9, fontWeight: 800, color: C.textBody, opacity: 0.5 }}>{18 + i}</div>
            ))}
          </div>
          {/* Rows */}
          {PRESENCE.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              <div style={{ width: 68, fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12, color: C.dark, flexShrink: 0, paddingRight: 4 }}>{p.name}</div>
              <div style={{ flex: 1, display: "flex", gap: 2, height: 22 }}>
                {Array.from({ length: totalDays }, (_, i) => {
                  const day = 18 + i;
                  const present = day >= p.start && day <= p.end;
                  const allOverlap = day >= 20 && day <= 25;
                  return (
                    <div key={i} style={{
                      flex: 1, borderRadius: 4,
                      background: present ? p.color : `${C.dark}08`,
                      opacity: present ? (allOverlap ? 1 : 0.7) : 1,
                      position: "relative",
                    }}>
                      {present && allOverlap && (
                        <div style={{ position: "absolute", inset: 0, borderRadius: 4, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.3)` }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {/* Legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, paddingLeft: 72 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: C.green }} />
              <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 9, fontWeight: 700, color: C.textBody }}>Present</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: `${C.dark}08` }} />
              <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 9, fontWeight: 700, color: C.textBody }}>Not there</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: C.gold, opacity: 1 }} />
              <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 9, fontWeight: 700, color: C.textBody }}>Full squad (20-25)</span>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
};

const DayCard = ({ day, dayIndex, isActive, onClick }) => {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
  const imgKey = DAY_IMAGES[dayIndex % DAY_IMAGES.length];
  return (
    <div
      onClick={() => { onClick(); setExpanded(!expanded); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "0 0 auto", width: 280, minHeight: 180, borderRadius: 24, overflow: "hidden", cursor: "pointer",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        transform: isActive ? "scale(1.03)" : hovered ? "scale(1.0)" : "scale(0.96)",
        boxShadow: isActive ? `0 16px 48px ${color}33` : hovered ? `0 12px 36px ${color}22` : "0 4px 16px rgba(0,0,0,0.08)",
        background: C.white, border: isActive ? `3px solid ${color}` : "3px solid transparent",
        userSelect: "none", scrollSnapAlign: "center",
      }}
    >
      <div style={{ height: 100, backgroundImage: `url(${IMAGES[imgKey]})`, backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${color}88 0%, ${color}DD 100%)` }} />
        <div style={{ position: "relative", zIndex: 2, padding: 16, display: "flex", alignItems: "flex-end", height: "100%" }}>
          <div>
            <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 22, color: C.white, lineHeight: 1 }}>{day.date}</div>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: 2, textTransform: "uppercase" }}>{day.dow} — {day.title}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, fontWeight: 700, color: C.textBody, fontStyle: "italic", marginBottom: 4 }}>{"\u201C"}{day.tagline}{"\u201D"}</div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, fontWeight: 700, color: C.textBody, opacity: 0.5, marginBottom: 8 }}>{day.who.join(", ")}</div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 11, fontWeight: 800, color: color, textTransform: "uppercase", letterSpacing: 0.5 }}>{expanded ? "Hide plan ▲" : "See the plan ▼"}</div>
        <div style={{ maxHeight: expanded ? 500 : 0, overflow: "hidden", transition: "max-height 0.6s cubic-bezier(0.33,1,0.68,1)" }}>
          <div style={{ paddingTop: 10 }}>
            {day.items.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? "1px solid #f0f0f0" : "none" }}>
                <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10, color: color, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.time}</div>
                  <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 600, fontSize: 13, color: C.dark, lineHeight: 1.6 }}>{item.activity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChallengeCard = ({ challenge, index }) => (
  <Reveal delay={index * 0.06} style={{ flex: "0 0 auto" }}>
    <div style={{ width: 160, borderRadius: 20, background: C.white, padding: "20px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", scrollSnapAlign: "center" }}>
      <div style={{ fontSize: 32 }}>{challenge.icon}</div>
      <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 12, color: C.dark, lineHeight: 1.3 }}>{challenge.title}</div>
      <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 11, color: C.textBody, fontWeight: 600, lineHeight: 1.5 }}>{challenge.description}</div>
      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10, color: C.gold, background: `${C.gold}15`, padding: "3px 12px", borderRadius: 10, letterSpacing: 0.5, marginTop: "auto" }}>{challenge.points} pts</div>
    </div>
  </Reveal>
);

const Leaderboard = () => (
  <Reveal delay={0.15}>
    <div style={{ maxWidth: 540, margin: "24px auto 0", background: C.white, borderRadius: 20, padding: "20px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.gold, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>Leaderboard</div>
      {PLAYERS.map((p, i) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i > 0 ? "1px solid #f0f0f0" : "none" }}>
          <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 14, color: C.textBody, width: 24, textAlign: "center" }}>{i + 1}</div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${p.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{p.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13, color: C.dark }}>{p.name}</div>
            <div style={{ height: 4, borderRadius: 2, background: `${p.color}15`, marginTop: 4 }}>
              <div style={{ height: "100%", width: "0%", borderRadius: 2, background: p.color, transition: "width 0.6s ease" }} />
            </div>
          </div>
          <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 14, color: p.color }}>0</div>
        </div>
      ))}
      <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: C.textBody, textAlign: "center", marginTop: 14, fontWeight: 600, opacity: 0.5 }}>Tracking starts on arrival</div>
    </div>
  </Reveal>
);

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = FONTS_URL;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      @keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-18px) rotate(5deg)}}
      @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      @keyframes heroZoom{from{transform:scale(1.1)}to{transform:scale(1)}}
      @keyframes tapPulse{0%,100%{opacity:0.35}50%{opacity:0.7}}
      @keyframes ctaShimmer{0%{background-position:0% center}100%{background-position:200% center}}
      @keyframes modalFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes modalScaleIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
      *{box-sizing:border-box;margin:0;padding:0}
      html{scroll-behavior:smooth}
      body{overflow-x:hidden}
      .no-scrollbar::-webkit-scrollbar{display:none}
      .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
    `;
    document.head.appendChild(style);
    setTimeout(() => setLoaded(true), 400);
    return () => { document.head.removeChild(link); document.head.removeChild(style); };
  }, []);

  const scrollToDay = (i) => {
    setActiveDay(i);
    if (scrollRef.current?.children[i]) {
      scrollRef.current.children[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  return (
    <div style={{ fontFamily: "Nunito, sans-serif", background: C.sand, minHeight: "100vh", overflowX: "hidden", lineHeight: 1.6 }}>

      <StickyNav />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${IMAGES.heroBeach})`, backgroundSize: "cover", backgroundPosition: "center 30%", animation: loaded ? "heroZoom 1.5s ease-out forwards" : "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(26,26,46,0.1) 0%, rgba(26,26,46,0.25) 40%, rgba(26,26,46,0.7) 75%, rgba(26,26,46,0.92) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px 60px", maxWidth: 700, width: "100%" }}>
          <div style={{ display: "inline-block", background: "rgba(255,107,107,0.9)", color: C.white, fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, padding: "6px 20px", borderRadius: 20, letterSpacing: 3, textTransform: "uppercase", marginBottom: 20, opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.6s ease 0.3s" }}>
            Royalton CHIC • May 18–29
          </div>
          <h1 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(52px, 14vw, 110px)", lineHeight: 0.9, color: C.white, opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(40px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s", textShadow: `4px 4px 0 ${C.coral}66` }}>PUNTA</h1>
          <h1 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(52px, 14vw, 110px)", lineHeight: 0.9, background: `linear-gradient(135deg, ${C.yellow}, ${C.coral}, ${C.turquoise})`, backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(40px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s", animation: loaded ? "shimmer 5s linear infinite" : "none" }}>CANA</h1>
          <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginTop: 20, letterSpacing: 0.5, opacity: loaded ? 1 : 0, transition: "all 0.6s ease 0.6s" }}>6 friends. 12 days. 1 island. No mercy.</p>
          <Countdown loaded={loaded} />
          <div style={{ marginTop: 32, fontSize: 20, color: "rgba(255,255,255,0.4)", animation: loaded ? "float 3s ease-in-out infinite" : "none", opacity: loaded ? 1 : 0, transition: "opacity 0.6s ease 1s" }}>↓</div>
        </div>
      </section>

      {/* ── PLAYERS ─────────────────────────────────────────────────────── */}
      <section id="crew" style={{ padding: "80px 0 60px", background: C.sand }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 36, padding: "0 24px" }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.coral, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>The Lineup</div>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>The Crew</h2>
          </div>
        </Reveal>
        <div className="no-scrollbar" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "8px 28px 32px", scrollSnapType: "x mandatory" }}>
          {PLAYERS.map((p, i) => (
            <ProfileCard
              key={p.id}
              player={p}
              index={i}
              onOpen={() => setExpandedPlayer(p.id)}
            />
          ))}
        </div>
        <PresenceChart />
      </section>

      {/* ── ITINERARY ───────────────────────────────────────────────────── */}
      <section id="itinerary" style={{ padding: "80px 0 60px", background: C.white }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 32, padding: "0 24px" }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>12 Days of Chaos</div>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>The Itinerary</h2>
            <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.textBody, marginTop: 8, fontWeight: 600 }}>Swipe through — tap a day to expand</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 20, padding: "0 16px", flexWrap: "wrap" }}>
            {DAYS.map((d, i) => (
              <button key={i} onClick={() => scrollToDay(i)} style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10, padding: "6px 10px", borderRadius: 14, border: "none", cursor: "pointer", background: activeDay === i ? DAY_COLORS[i % DAY_COLORS.length] : `${DAY_COLORS[i % DAY_COLORS.length]}15`, color: activeDay === i ? C.white : DAY_COLORS[i % DAY_COLORS.length], transition: "all 0.3s ease", letterSpacing: 0.3 }}>{d.date.split(" ")[0]}</button>
            ))}
          </div>
        </Reveal>
        <div ref={scrollRef} className="no-scrollbar" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "8px 28px 24px", scrollSnapType: "x mandatory" }}>
          {DAYS.map((d, i) => (
            <Reveal key={i} delay={i * 0.04} style={{ flex: "0 0 auto" }}>
              <DayCard day={d} dayIndex={i} isActive={activeDay === i} onClick={() => setActiveDay(i)} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CHALLENGES ──────────────────────────────────────────────────── */}
      <section id="challenges" style={{ padding: "80px 0 60px", background: C.sand }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 32, padding: "0 24px" }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.coral, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Earn Your Bragging Rights</div>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>The Gauntlet</h2>
            <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.textBody, marginTop: 8, fontWeight: 600 }}>Challenges to settle who really ran this trip</p>
          </div>
        </Reveal>
        <div className="no-scrollbar" style={{ display: "flex", gap: 12, overflowX: "auto", padding: "8px 28px 24px", scrollSnapType: "x mandatory" }}>
          {CHALLENGES.map((c, i) => <ChallengeCard key={c.id} challenge={c} index={i} />)}
        </div>
        <Leaderboard />
      </section>

      {/* ── RESORT ──────────────────────────────────────────────────────── */}
      <section id="resort" style={{ padding: "80px 24px 60px", background: C.white }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.green, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Home Base</div>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(24px, 6vw, 40px)", color: C.dark }}>{RESORT.name}</h2>
            <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.textBody, fontWeight: 600, marginTop: 4 }}>{"⭐".repeat(RESORT.stars)} All-Inclusive</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, maxWidth: 500, margin: "0 auto" }}>
            {RESORT.included.map((item, i) => (
              <div key={i} style={{ background: `${C.green}10`, borderRadius: 16, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 13, color: C.dark }}>{item.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <div style={{ textAlign: "center", marginTop: 24, fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody, fontWeight: 600 }}>
            Check-in: {RESORT.checkIn} • Check-out: {RESORT.checkOut}
          </div>
        </Reveal>
      </section>

      {/* ── NEED TO KNOW ────────────────────────────────────────────────── */}
      <section id="need-to-know" style={{ padding: "80px 24px 60px", background: C.sand }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.purple, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Before You Go</div>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(24px, 6vw, 40px)", color: C.dark }}>Need to Know</h2>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ maxWidth: 600, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
            {TRIP_INFO.map((item) => (
              <div key={item.key} style={{ background: C.white, borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.purple}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, color: C.textBody, letterSpacing: 0.3, marginBottom: 2 }}>{item.key}</div>
                  <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 600, fontSize: 13, color: C.dark, lineHeight: 1.5 }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px 80px", background: C.white, textAlign: "center" }}>
        <Reveal>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "44px 32px", borderRadius: 28, background: `linear-gradient(145deg, ${C.dark}, ${C.darkSoft})`, boxShadow: "0 24px 64px rgba(26,26,46,0.25)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: `${C.coral}15` }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: `${C.turquoise}10` }} />
            <div style={{ position: "relative", zIndex: 2 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🇩🇴</div>
              <h3 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 24, color: C.white, marginBottom: 12 }}>Are You Ready?</h3>
              <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.65)", fontWeight: 600, lineHeight: 1.7 }}>12 days. All-inclusive. Punta Cana.<br />Pack sunscreen and your best excuses for work.</p>
              <div style={{ marginTop: 24, display: "inline-block", padding: "14px 32px", background: `linear-gradient(135deg, ${C.coral}, ${C.gold}, ${C.coral}, ${C.gold})`, backgroundSize: "300% auto", animation: "ctaShimmer 4s linear infinite", borderRadius: 16, fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13, color: C.white, letterSpacing: 1, textTransform: "uppercase", boxShadow: `0 8px 24px ${C.coral}44`, cursor: "pointer" }}>Let's Go 🌊</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ textAlign: "center", padding: "16px 24px 24px", fontFamily: "Nunito, sans-serif", fontSize: 11, color: C.textBody, opacity: 0.4, fontWeight: 700, letterSpacing: 1 }}>
        PUNTA CANA '26 • ROYALTON CHIC • 🌊
      </footer>

      {/* ── PROFILE MODAL ──────────────────────────────────────────────── */}
      <ProfileModal
        player={PLAYERS.find((p) => p.id === expandedPlayer) || null}
        onClose={() => setExpandedPlayer(null)}
      />
    </div>
  );
}
