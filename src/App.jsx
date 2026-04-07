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
  { id: 1, num: "01", name: "Kai", title: "The Director", role: "Cameraman & Game Master", bio: "Content creator mode: always on. Will have every angle of the trip documented in 4K.", about: "Self-appointed Game Master and one of the masterminds behind the trip alongside Kyanna and Candice. A huge driver of the activities, challenges, and all the chaos that comes with them. His main job? Cameraman — he'll be filming absolutely everything because the group is making a big vlog at the end. Loves games, competitions, and anything with stakes. Something switches when he's on holiday — he transforms into a completely different person. Expect maximum energy, maximum content, and zero chill.", color: C.blue, emoji: "🎬", avatar: "/images/avatars/kai.png" },
  { id: 2, num: "02", name: "Khari", title: "The Gaffer", role: "The one who built the whole trip", bio: "Built this entire trip from scratch. If it's planned, it's because of this one.", about: "Adan's older brother and the one who put this whole thing together. Within the group he's the fatherly figure — steady, reliable, always got advice whether you asked for it or not. Doesn't stress about challenges or competitions, but somehow never really loses either. The quiet confidence that holds the whole trip together.", color: C.gold, emoji: "🧔‍♂️", avatar: "/images/avatars/khari.png" },
  { id: 3, num: "03", name: "Candice", title: "The Sunshine", role: "TikTok queen & the smile that lights up the room", bio: "Doesn't need to be loud to lift the whole room. Her smile is contagious.", about: "The group's reckless lover girl. Super funny, super chaotic — the kind of energy that turns a quiet evening into a story nobody's allowed to repeat. One thing's for certain though: she will NOT be sharing a bed with Kyanna. Don't ask, just know. Expect chaos, laughter, and absolutely zero regrets.", color: C.coral, emoji: "☀️", avatar: "/images/avatars/candice.png" },
  { id: 4, num: "04", name: "Kyanna", title: "The Ex-Wildcard", role: "Claims she's retired from the chaos. We'll see.", bio: "Swears she just wants to chill by the pool. Give it two drinks.", about: "The best flirt in the group — knows exactly what to say and exactly when to say it. Smart, pretty, and down for anything... as long as \"dese man\" do it first. A core part of the planning team alongside Adan and Candice, and Adan's best friend. Don't underestimate the quiet ones.", color: C.purple, emoji: "😈", avatar: "/images/avatars/kyanna.png" },
  { id: 5, num: "05", name: "Camara", title: "The Messy One", role: "Never stops, never sleeps, always tries to be the main character", bio: "Three drinks deep and it's already over. Says he can handle it every time. Never can.", about: "The most chaotic member of the group by a mile. Does way too much, all of the time. Deeps the most ridiculous things and you will absolutely find him in the most compromising scenarios — guaranteed. Cannot handle his drink at all but is fully convinced he's the best drunk in the group. He's not. Buckle up.", color: C.green, emoji: "💣", avatar: "/images/avatars/camara.png" },
  { id: 6, num: "06", name: "Miles", title: "The Joker", role: "Funniest in the room, first to disappear", bio: "Will have everyone crying laughing at dinner then vanish by midnight with zero explanation.", about: "The most non-committal committal guy in the group. Everything's a possibility, nothing's a reality. We'll believe he's actually coming when we see him step off the plane in DR — not a second before. Honestly, the group is just happy he said yes. If he shows up, that alone is the plot twist of the trip.", color: C.cyan, emoji: "🃏", avatar: "/images/avatars/miles.png" },
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
  { key: "Time Zone", value: "AST (UTC-4) — 5 hours behind UK", icon: "🕐" },
  { key: "Currency", value: "Dominican Peso (DOP) / USD widely accepted", icon: "💰" },
  { key: "Language", value: "Spanish (English spoken at resort)", icon: "🗣️" },
  { key: "Plug Type", value: "US Type A/B — bring a UK adapter!", icon: "🔌" },
  { key: "Airport", value: "Punta Cana International (PUJ) — 40 min to resort", icon: "✈️" },
  { key: "Emergency", value: "911 (local) · Resort: +008299548177", icon: "🚨" },
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
  { id: "saona", name: "Saona Island", icon: "🏝️", bio: "A full-day escape by catamaran and speedboat to one of the DR's most stunning islands. Think palm-lined white sand, waist-deep turquoise natural pools with starfish, open bar the entire way, and a beachside BBQ lunch. It's a 10-hour adventure — you leave early and come back sun-kissed and half-asleep. The boat ride alone is worth it.", price: "£70-120pp", day: "21 May", color: C.turquoise, link: "https://www.viator.com/tours/Punta-Cana/Saona-Island-Day-Trip-From-Punta-Cana/d794-17793P7" },
  { id: "party-boat", name: "Jamaican Party Boat", icon: "🚤", bio: "A 3-hour floating party on a custom Jamaican catamaran cruising the Punta Cana coastline. The DJ drops dancehall, afrobeats, and top hits while unlimited drinks and authentic Jamaican food keep flowing. There's a VIP stop at a natural pool for swimming. This isn't a scenic cruise — it's a full-blown party on the ocean and the energy is unmatched.", price: "£50pp", day: "22 May", color: C.blue, link: "https://www.viator.com/tours/Punta-Cana/Imagine-Disco-Nightclub-in-Punta-Cana/d794-36211P24" },
  { id: "coco-bongo", name: "Coco Bongo", icon: "🎭", bio: "Punta Cana's biggest and most famous nightlife venue. The show kicks off at 8pm with confetti raining from the ceiling, tribute acts (Madonna, MJ, Beyoncé), acrobats, and dancers recreating scenes from Phantom of the Opera and Chicago. After midnight it turns into a full club until 3am. Open bar included with tickets. It's loud, packed, and absolutely wild — the kind of night you talk about for years.", price: "£60-100pp", day: "23 May", color: C.purple, link: "https://www.cocobongo.com/show/punta-cana/?lang=en" },
  { id: "scape-park", name: "Scape Park", icon: "🎢", bio: "A nature adventure park in Cap Cana with 15+ attractions spread across jungle and coastline. The headline is the zip-line circuit — the longest is nearly 500m over the jungle canopy ending with a splash into water. There's also the Hoyo Azul cenote (crystal-clear turquoise water in a cave), underground caves to explore, and buggy rides through the trails. The staff are brilliant and the whole day feels like an adventure film.", price: "£90-130pp", day: "24 May", color: C.green, link: "https://scapepark.com/" },
  { id: "sky-dinner", name: "Dinner in the Sky", icon: "🎈", bio: "You sit at a table suspended 50 metres in the air by a crane, with nothing but panoramic views, sunset cocktails, and a multi-course meal. It's surreal — the food is cooked on the ground and brought up, the music is curated, and the views at golden hour are unreal. It's one of those bucket-list experiences that sounds mad but everyone who does it says it was worth every penny.", price: "£120-180pp", day: "24 May", color: C.coral, link: "https://puntacanadinnerinthesky.com" },
  { id: "altos", name: "Altos de Chavón", icon: "🌇", bio: "A replica 16th-century Mediterranean village perched above the Chavón River in La Romana. Cobblestone streets, art galleries, a beautiful church, and striking views from every angle. It was built in the late 70s and inaugurated with a Frank Sinatra concert. Best visited in the late afternoon for golden hour photography. It's calm, beautiful, and completely different from the resort vibe — a proper cultural change of pace.", price: "Free", day: "28 May", color: C.gold, link: "https://www.tripadvisor.com/Attraction_Review-g147292-d149775-Reviews-Altos_de_Chavon-La_Romana_La_Romana_Province_Dominican_Republic.html" },
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
        width: 220, paddingTop: 70, cursor: "pointer", userSelect: "none",
        position: "relative",
        transition: "all 0.3s ease",
      }}
    >
      {/* Avatar — oversized, overlapping the card top */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 2,
        width: 130, height: 130, borderRadius: "50%", overflow: "hidden",
        border: `4px solid ${player.color}`,
        boxShadow: `0 8px 24px ${player.color}40, 0 0 0 6px ${C.white}`,
        background: `linear-gradient(135deg, ${player.color}30, ${player.color}10)`,
      }}>
        <img src={player.avatar} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }} />
      </div>
      {/* Card body — starts below avatar overlap */}
      <div style={{
        background: `linear-gradient(170deg, ${C.white} 0%, ${player.color}12 100%)`,
        border: `2px solid ${player.color}30`,
        borderRadius: 24,
        boxShadow: `0 8px 32px ${player.color}18`,
        padding: "72px 16px 20px",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 8, textAlign: "center",
      }}>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 13, color: player.color, letterSpacing: 3 }}>#{player.num}</div>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18, color: C.dark, lineHeight: 1.2 }}>{player.name}</div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, color: C.white, background: player.color, padding: "5px 16px", borderRadius: 16, letterSpacing: 0.5, textTransform: "uppercase" }}>{player.title}</div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: C.textBody, marginTop: 4, animation: "tapPulse 2.5s ease-in-out infinite" }}>tap to view profile</div>
      </div>
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
          width: "90vw", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
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
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.25)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Nunito, sans-serif", fontSize: 18, color: C.white, fontWeight: 700,
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          }}
        >
          ✕
        </button>

        {/* Hero — avatar as full background with text overlay */}
        <div style={{
          borderRadius: "28px 28px 0 0",
          position: "relative", overflow: "hidden",
          minHeight: 380,
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
        }}>
          {/* Avatar as full-bleed background */}
          <img src={player.avatar} alt={player.name} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center 10%",
          }} />
          {/* Gradient overlay for text legibility */}
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(180deg, transparent 30%, ${player.color}44 60%, ${player.color}DD 85%, ${player.color} 100%)`,
          }} />
          {/* Text overlay at bottom */}
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px 24px" }}>
            <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: 4, marginBottom: 4 }}>#{player.num}</div>
            <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 32, color: C.white, textShadow: "0 2px 12px rgba(0,0,0,0.3)", marginBottom: 8 }}>{player.name}</div>
            <div style={{ display: "inline-block", fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12, color: C.white, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "6px 20px", borderRadius: 16, letterSpacing: 1.5, textTransform: "uppercase" }}>{player.title}</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 24px 28px" }}>
          {/* Role badge */}
          {player.role && (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10, color: player.color, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Role</div>
              <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 14, color: C.dark }}>{player.role}</div>
            </div>
          )}
          {/* Bio quote */}
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 15, color: C.dark, lineHeight: 1.7, fontWeight: 700, textAlign: "center", marginBottom: 16, fontStyle: "italic" }}>"{player.bio}"</div>

          {/* About */}
          {player.about && (
            <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.textBody, lineHeight: 1.8, fontWeight: 500, textAlign: "left", marginBottom: 24 }}>{player.about}</div>
          )}

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

const AdventureMap = () => {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
      <div style={{
        background: "#1a2a3a",
        borderRadius: 24,
        padding: "24px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Punta Cana</div>
          <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18, color: C.white }}>Adventure Map</div>
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Tap an activity to learn more</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {ACTIVITIES.map((a) => {
            const isSelected = selected === a.id;
            return (
              <div
                key={a.id}
                onClick={() => setSelected(isSelected ? null : a.id)}
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${a.color}, ${a.color}CC)`
                    : `linear-gradient(135deg, ${a.color}25, ${a.color}15)`,
                  borderRadius: 16,
                  padding: isSelected ? "20px 16px" : "14px 10px",
                  textAlign: isSelected ? "left" : "center",
                  cursor: "pointer",
                  border: `2px solid ${isSelected ? a.color : "rgba(255,255,255,0.08)"}`,
                  transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                  gridColumn: isSelected ? "1 / -1" : "auto",
                }}
              >
                {!isSelected && (
                  <>
                    <div style={{ fontSize: 24 }}>{a.icon}</div>
                    <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 10, color: C.white, marginTop: 4 }}>{a.name}</div>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.color, margin: "6px auto 0", boxShadow: `0 0 8px ${a.color}` }} />
                  </>
                )}
                {isSelected && (
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 32, lineHeight: 1 }}>{a.icon}</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 16, color: C.white, marginBottom: 6 }}>{a.name}</div>
                      <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, marginBottom: 10 }}>{a.bio}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, background: "rgba(255,255,255,0.2)", color: C.white, padding: "4px 12px", borderRadius: 8 }}>{a.price}</span>
                        <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, background: "rgba(255,255,255,0.2)", color: C.white, padding: "4px 12px", borderRadius: 8 }}>{a.day}</span>
                        <a href={a.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, background: a.color, color: C.white, padding: "4px 12px", borderRadius: 8, textDecoration: "none" }}>Learn more →</a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

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

      {/* ── ABOUT THE HOLIDAY ──────────────────────────────────────────── */}
      <section id="about" style={{ padding: "80px 0 60px", background: C.white }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 40, padding: "0 24px" }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.turquoise, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>The Mission Briefing</div>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>About the Holiday</h2>
          </div>
        </Reveal>

        {/* Desktop: Hotel left, Need to Know right */}
        <Reveal delay={0.1}>
          <div style={{ maxWidth: 960, margin: "0 auto 48px", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, alignItems: "start" }}>

            {/* Hotel Highlights */}
            <div style={{ background: C.sand, borderRadius: 24, padding: "28px 24px", height: "100%" }}>
              <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.turquoise, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>Your Hotel</div>
              <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(18px, 3vw, 24px)", color: C.dark, marginBottom: 4 }}>{RESORT.name}</div>
              <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.textBody, fontWeight: 600, marginBottom: 16 }}>{"⭐".repeat(RESORT.stars)} All-Inclusive · Adults Only</div>
              <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.textBody, fontWeight: 600, lineHeight: 1.8, marginBottom: 16 }}>
                An Autograph Collection resort on Uvero Alto Beach, designed for social trips, group holidays, and non-stop energy. The pool area is the heartbeat — DJs, foam parties, and electro beats from morning to night. The nightclub keeps things going well past midnight. Food is all-inclusive across multiple restaurants, premium drinks are unlimited, and the beach is right there.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {RESORT.included.map((item, i) => (
                  <div key={i} style={{ background: `${C.turquoise}12`, borderRadius: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 11, color: C.dark }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody, fontWeight: 600, borderTop: `1px solid ${C.turquoise}20`, paddingTop: 12 }}>
                Check-in: {RESORT.checkIn} · Check-out: {RESORT.checkOut}
              </div>
            </div>

            {/* Need to Know */}
            <div style={{ background: C.sand, borderRadius: 24, padding: "28px 24px", height: "100%" }}>
              <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.turquoise, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>Need to Know</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {TRIP_INFO.map((item) => (
                  <div key={item.key} style={{ background: C.white, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.turquoise}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10, color: C.textBody, letterSpacing: 0.3, textTransform: "uppercase" }}>{item.key}</div>
                      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 600, fontSize: 13, color: C.dark, lineHeight: 1.4 }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Adventure Map — full width */}
        <Reveal delay={0.15}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.turquoise, letterSpacing: 3, textTransform: "uppercase" }}>What's Planned</div>
          </div>
        </Reveal>
        <AdventureMap />
      </section>

      {/* ── PLAYERS ─────────────────────────────────────────────────────── */}
      <section id="players" style={{ padding: "80px 0 60px", background: C.sand }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 36, padding: "0 24px" }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.coral, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>The Lineup</div>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>Meet the Players</h2>
          </div>
        </Reveal>
        <div className="no-scrollbar" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "8px 28px 32px", scrollSnapType: "x mandatory", justifyContent: "center" }}>
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
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>Learn the Game</h2>
            <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.textBody, marginTop: 8, fontWeight: 600 }}>The rules of engagement — challenges to settle who really ran this trip</p>
          </div>
        </Reveal>
        <div className="no-scrollbar" style={{ display: "flex", gap: 12, overflowX: "auto", padding: "8px 28px 24px", scrollSnapType: "x mandatory" }}>
          {CHALLENGES.map((c, i) => <ChallengeCard key={c.id} challenge={c} index={i} />)}
        </div>
        <Leaderboard />
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
