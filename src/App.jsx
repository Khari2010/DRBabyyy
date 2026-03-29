import { useState, useEffect, useCallback } from "react";

// ============ DATA ============
const MEMBERS = ["Kai", "Khari", "Candice", "Kyanna", "Camara", "Miles"];
const FULL_GROUP = MEMBERS;
const BOYS = ["Kai", "Khari", "Camara", "Miles"];

const PERSON_COLORS = {
  Kai: "#3b82f6",      // blue
  Khari: "#f59e0b",    // amber/gold
  Candice: "#ec4899",  // pink/rose
  Kyanna: "#a855f7",   // purple
  Camara: "#22c55e",   // green
  Miles: "#06b6d4",    // cyan/teal
};

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
  restaurants: [
    { name: "Grazie Italian", cuisine: "Italian", emoji: "🍝", type: "A-la-carte" },
    { name: "Hunter Steakhouse", cuisine: "Steakhouse", emoji: "🥩", type: "A-la-carte" },
    { name: "Tex-Mex El Agave", cuisine: "Mexican", emoji: "🌮", type: "A-la-carte" },
    { name: "Pescari", cuisine: "Seafood", emoji: "🦞", type: "A-la-carte" },
    { name: "C/X Gourmet Marché", cuisine: "International", emoji: "🍱", type: "Buffet" },
    { name: "Score Sports Bar", cuisine: "American", emoji: "🍔", type: "Casual" },
    { name: "The Promenade Café", cuisine: "Coffee & Snacks", emoji: "☕", type: "Café" },
  ],
  entertainment: [
    { day: "Mon", event: "Welcome Party", emoji: "🎊" },
    { day: "Tue", event: "CHIC Angels Show", emoji: "👯" },
    { day: "Wed", event: "Foam Party", emoji: "🫧" },
    { day: "Thu", event: "Caribbean Night", emoji: "🌴" },
    { day: "Fri", event: "White Party", emoji: "⚪" },
    { day: "Sat", event: "Glow Party", emoji: "✨" },
    { day: "Sun", event: "Pool Party", emoji: "🏖️" },
  ],
};

const FLIGHTS = [
  {
    id: "out-main",
    type: "Outbound",
    date: "18 May 2026",
    flight: "TOM566",
    aircraft: "Boeing 787 Dreamliner",
    from: { code: "BHX", city: "Birmingham", terminal: "1" },
    to: { code: "PUJ", city: "Punta Cana" },
    depart: "11:00",
    arrive: "14:50",
    duration: "9h 50m",
    baggage: "20kg hold + 10kg cabin",
    who: ["Kai", "Khari", "Candice", "Kyanna"],
    pnr: "MEKPQX",
  },
  {
    id: "out-cm",
    type: "Outbound",
    date: "20 May 2026",
    flight: "TBC",
    from: { code: "TBC", city: "TBC" },
    to: { code: "PUJ", city: "Punta Cana" },
    who: ["Camara", "Miles"],
    pnr: "TBC",
  },
  {
    id: "return-girls",
    type: "Return",
    date: "25 May 2026",
    flight: "TOM567",
    aircraft: "Boeing 787 Dreamliner",
    from: { code: "PUJ", city: "Punta Cana" },
    to: { code: "BHX", city: "Birmingham", terminal: "1" },
    depart: "16:50",
    arrive: "06:00+1",
    duration: "8h 10m",
    baggage: "20kg hold + 10kg cabin",
    who: ["Candice", "Kyanna"],
    pnr: "MEKPQX",
  },
  {
    id: "return-boys",
    type: "Return",
    date: "29 May 2026",
    flight: "TOM569",
    aircraft: "Boeing 787 Dreamliner",
    from: { code: "PUJ", city: "Punta Cana" },
    to: { code: "BHX", city: "Birmingham", terminal: "1" },
    depart: "17:10",
    arrive: "06:15+1",
    duration: "8h 05m",
    baggage: "20kg hold + 10kg cabin",
    who: ["Kai", "Khari", "Camara", "Miles"],
    pnr: "TBC",
  },
];

const EMERGENCY_INFO = {
  timezone: "AST (UTC-4)",
  ukDiff: "5 hours behind UK",
  currency: "Dominican Peso (DOP) / USD widely accepted",
  language: "Spanish (English at resort)",
  tipping: "10-15% at restaurants, $1-2 for bellhops",
  plugType: "US Type A/B - UK adapter needed!",
  emergencyNumber: "911",
  ukEmbassy: "+1 809-472-7111",
  resortPhone: "+008299548177",
  loveholidaysAway: "+44 1233 800490",
  loveholidaysBefore: "01234 975 975",
  bookingRef: "LOV13307110U",
};

const OFF_SITE = {
  dining: [
    { name: "Cabanna", price: "£40-80pp", cuisine: "Fine Dining", emoji: "✨" },
    { name: "Dinner in the Sky", price: "£120-180pp", cuisine: "Experience", emoji: "🎈" },
    { name: "Citrus", price: "£30-60pp", cuisine: "Modern", emoji: "🍋" },
    { name: "La Yola", price: "£30-60pp", cuisine: "Seafood", emoji: "⛵" },
    { name: "Jellyfish", price: "£10-25pp", cuisine: "Beach Bar", emoji: "🪼" },
    { name: "Onno's", price: "£10-25pp", cuisine: "Caribbean", emoji: "🌺" },
  ],
  beaches: [
    { name: "Playa Macao", distance: "35 min", vibe: "Wild & scenic", emoji: "🌊" },
    { name: "Bavaro Beach", distance: "5 min", vibe: "Resort stretch", emoji: "🏖️" },
    { name: "Juanillo Beach", distance: "25 min", vibe: "Exclusive & calm", emoji: "🌴" },
    { name: "Playa Escondida", distance: "40 min", vibe: "Hidden gem", emoji: "💎" },
  ],
  activities: [
    { name: "Scape Park", price: "£90-130", desc: "Cenotes, ziplines, caves", emoji: "🎢" },
    { name: "Saona Island", price: "£70-120", desc: "Island paradise day trip", emoji: "🏝️" },
    { name: "Jet Skis", price: "£40-60", desc: "30-60 min rental", emoji: "🚤" },
    { name: "Parasailing", price: "£50-70", desc: "Beach views", emoji: "🪂" },
    { name: "ATV Tours", price: "£60-100", desc: "Off-road adventure", emoji: "🏎️" },
    { name: "Spa Day", price: "£80-150", desc: "Full treatment", emoji: "💆" },
  ],
  nightlife: [
    { name: "Coco Bongo", price: "£60-100", desc: "Iconic show & club", emoji: "🎭" },
    { name: "Drink Point", price: "Free entry", desc: "Late night vibes", emoji: "🍾" },
    { name: "Infinity Lounge", price: "Free entry", desc: "Rooftop lounge", emoji: "🌙" },
    { name: "Oro Nightclub", price: "£20-40", desc: "Hard Rock club", emoji: "🪩" },
  ],
};

const CHALLENGES = [
  { id: 1, name: "Kiss someone", pts: 100, difficulty: "legendary" },
  { id: 2, name: "Sing in public", pts: 15, bonus: "+50 crowd, +50 money", difficulty: "medium" },
  { id: 3, name: "Run 1km", pts: 20, difficulty: "medium" },
  { id: 4, name: "5 shots at once", pts: 20, difficulty: "medium" },
  { id: 5, name: "Get someone to buy you drinks", pts: 5, difficulty: "easy" },
  { id: 6, name: "Selfie with stranger", pts: 3, difficulty: "easy" },
  { id: 7, name: "Selfie with someone sleeping", pts: 3, bonus: "+30 bonus", difficulty: "easy" },
  { id: 8, name: "Wear someone's clothes unnoticed (10 min)", pts: 15, difficulty: "medium" },
  { id: 9, name: "30 min gym workout", pts: 15, difficulty: "medium" },
  { id: 10, name: "Get number / insta / snap", pts: 5, difficulty: "easy" },
  { id: 11, name: "Build sand sculpture", pts: 30, difficulty: "hard" },
  { id: 12, name: "Stranger gives you money", pts: 75, difficulty: "hard" },
  { id: 13, name: "Make a TikTok", pts: 2, difficulty: "easy" },
  { id: 14, name: "Stranger joins TikTok", pts: 10, difficulty: "medium" },
  { id: 15, name: "Cliff jump", pts: 100, difficulty: "legendary" },
  { id: 16, name: "Find group lookalike", pts: 70, difficulty: "hard" },
  { id: 17, name: "Sleep somewhere else", pts: 100, difficulty: "legendary" },
  { id: 18, name: "Receive compliments", pts: 7, difficulty: "easy" },
  { id: 19, name: "Get a tan", pts: 1, difficulty: "easy" },
  { id: 20, name: "Hold hands with stranger", pts: 15, difficulty: "medium" },
  { id: 21, name: "Down a drink", pts: 2, difficulty: "easy" },
  { id: 22, name: "Shot", pts: 2, difficulty: "easy" },
  { id: 23, name: "Play game with stranger", pts: 25, difficulty: "hard" },
  { id: 24, name: "Buy souvenir", pts: 4, difficulty: "easy" },
  { id: 25, name: "Matching outfit with stranger", pts: 15, difficulty: "medium" },
  { id: 26, name: "Pic with 5 people 50+", pts: 50, difficulty: "hard" },
  { id: 27, name: "Ask something embarrassing", pts: 35, difficulty: "hard" },
  { id: 28, name: "Scare someone in group", pts: 10, difficulty: "medium" },
  { id: 29, name: "Try something new", pts: 10, difficulty: "easy" },
  { id: 30, name: "Ride Gianni's bike", pts: 85, difficulty: "hard" },
  { id: 31, name: "Give massage", pts: 1, bonus: "per min", difficulty: "easy" },
  { id: 32, name: "Shower with someone", pts: 100, difficulty: "legendary" },
  { id: 33, name: "Get a tattoo", pts: 250, difficulty: "legendary" },
  { id: 34, name: "All nighter", pts: 20, difficulty: "medium" },
];

const PENALTIES = [
  { name: "Throwing up", pts: -50 },
  { name: "Going to bed before 12", pts: -40 },
  { name: "Debating chosen drinks", pts: -10 },
  { name: "First to go to bed", pts: -30 },
];

const FORFEITS = [
  "Skinny dipping", "Run naked around villa", "Jump in pool fully clothed",
  "Wax", "Eat chili", "Spanked by everyone", "Waterboarded",
  "Cold shower (1 min)", "Deduct points from someone else", "90 second plank",
  "Opposite sex underwear", "21 questions hot seat", "Streaking at the beach",
  "Coin flip (double or nothing)"
];

const DAYS = [
  {
    date: "18 May", dow: "Mon", title: "Arrival Day",
    emoji: "✈️",
    vibe: "Touchdown in paradise 🌴",
    type: "full",
    resortEvent: "Welcome Party",
    who: ["Kai", "Khari", "Candice", "Kyanna"],
    events: [
      { time: "11:00", label: "Depart Birmingham (TOM566)", icon: "✈️", type: "departure" },
      { time: "14:50", label: "Arrive Punta Cana", icon: "🛬" },
      { time: "15:30", label: "Transfer & check-in", icon: "🚐" },
      { time: "17:30", label: "Pool & drinks", icon: "🏊" },
      { time: "20:00", label: "Dinner at resort", icon: "🍽️" },
      { time: "22:00", label: "Welcome Party", icon: "🎊", resortEvent: true },
    ]
  },
  {
    date: "19 May", dow: "Tue", title: "Chill Day",
    emoji: "🏖️",
    vibe: "Pool vibes & resort exploring 🏖️",
    type: "full",
    resortEvent: "CHIC Angels Show",
    who: ["Kai", "Khari", "Candice", "Kyanna"],
    events: [
      { time: "09:00", label: "Wake up / breakfast", icon: "🌅" },
      { time: "11:30", label: "Beach & pool", icon: "🏖️" },
      { time: "15:00", label: "Explore resort", icon: "🚶" },
      { time: "20:00", label: "Dinner", icon: "🍽️" },
      { time: "22:00", label: "CHIC Angels Show", icon: "👯", resortEvent: true },
    ]
  },
  {
    date: "20 May", dow: "Wed", title: "Full Group + Cabanna",
    emoji: "🎉",
    vibe: "The squad is complete 🎉",
    type: "full",
    resortEvent: "Foam Party",
    who: FULL_GROUP,
    events: [
      { time: "Day", label: "Relax / Camara & Miles arrive", icon: "🛬" },
      { time: "15:00", label: "Foam Party at pool", icon: "🫧", resortEvent: true },
      { time: "18:30", label: "Get ready", icon: "👔" },
      { time: "19:30", label: "Cabanna dinner", icon: "✨", premium: true, cost: "£40-80pp" },
      { time: "22:00", label: "Drinks / light night", icon: "🍹" },
    ]
  },
  {
    date: "21 May", dow: "Thu", title: "Saona Island",
    emoji: "🏝️",
    vibe: "Island hopping & starfish 🌊",
    type: "full",
    resortEvent: "Caribbean Night",
    who: FULL_GROUP,
    events: [
      { time: "06:30", label: "Pickup from resort", icon: "🚐" },
      { time: "09:30", label: "Boat departure", icon: "⛵" },
      { time: "11:30", label: "Island time + lunch", icon: "🏝️", premium: true, cost: "£70-120pp" },
      { time: "16:00", label: "Return journey", icon: "🚤" },
      { time: "Eve", label: "Caribbean Night at resort", icon: "🌴", resortEvent: true },
    ]
  },
  {
    date: "22 May", dow: "Fri", title: "Party Boat + Game Night",
    emoji: "🎊",
    vibe: "Open bar on the ocean + game night 🎲",
    type: "full",
    resortEvent: "White Party",
    who: FULL_GROUP,
    events: [
      { time: "AM", label: "Free time / pool", icon: "🏊" },
      { time: "14:30", label: "Jamaican Party Boat", icon: "🚤", premium: true, cost: "£50pp" },
      { time: "19:30", label: "Dinner", icon: "🍽️" },
      { time: "21:00", label: "Game Night", icon: "🎲" },
      { time: "23:00", label: "White Party", icon: "⚪", resortEvent: true },
    ]
  },
  {
    date: "23 May", dow: "Sat", title: "Coco Bongo Night",
    emoji: "🎭",
    vibe: "The wildest night in Punta Cana 🪩",
    type: "full",
    resortEvent: "Glow Party",
    who: FULL_GROUP,
    events: [
      { time: "Day", label: "Chill / pool", icon: "🏖️" },
      { time: "16:00", label: "Glow Party at pool", icon: "✨", resortEvent: true },
      { time: "20:30", label: "Leave for Coco Bongo", icon: "🚕" },
      { time: "21:00", label: "Coco Bongo Show + Club", icon: "🎭", premium: true, cost: "£60-100pp" },
      { time: "Late", label: "Optional Drink Point", icon: "🍾" },
    ]
  },
  {
    date: "24 May", dow: "Sun", title: "Scape Park + Dinner in the Sky",
    emoji: "🎢",
    vibe: "Adventure by day, sky-high dining by night ✨",
    type: "full",
    resortEvent: "Pool Party",
    who: FULL_GROUP,
    events: [
      { time: "08:30", label: "Leave for Scape Park", icon: "🚐" },
      { time: "09:30", label: "Scape Park activities", icon: "🎢", premium: true, cost: "£90-130pp" },
      { time: "17:30", label: "Return / rest", icon: "😴" },
      { time: "19:30", label: "Dinner in the Sky", icon: "🎈", premium: true, cost: "£120-180pp" },
      { time: "22:30", label: "Optional nightlife", icon: "🌙" },
    ]
  },
  {
    date: "25 May", dow: "Mon", title: "Departures + Boys Night",
    emoji: "👋",
    vibe: "Bittersweet goodbyes, boys night begins 👋",
    type: "mixed",
    who: ["Kai", "Khari", "Candice", "Kyanna", "Camara", "Miles"],
    events: [
      { time: "AM", label: "Breakfast / send-off", icon: "🌅" },
      { time: "16:50", label: "Candice, Kyanna & Miles depart (TOM567)", icon: "✈️", type: "departure" },
      { time: "Eve", label: "Rest", icon: "😴" },
      { time: "22:30", label: "Boys night begins", icon: "🔥" },
    ]
  },
  {
    date: "26 May", dow: "Tue", title: "Recovery Day",
    emoji: "😎",
    vibe: "Absolutely nothing. As planned. 😴",
    type: "boys",
    who: ["Kai", "Khari", "Camara"],
    events: [
      { time: "Late AM", label: "Wake up slowly", icon: "☕" },
      { time: "Day", label: "Pool / beach / spa", icon: "💆" },
      { time: "16:00", label: "Camara departs", icon: "✈️", type: "departure" },
      { time: "Eve", label: "Chill evening", icon: "🌅" },
    ]
  },
  {
    date: "27 May", dow: "Wed", title: "Filming Day",
    emoji: "🎬",
    vibe: "Golden hour content creation 🎬",
    type: "boys",
    who: ["Kai", "Khari"],
    events: [
      { time: "06:00", label: "Sunrise filming at Macao", icon: "🌅" },
      { time: "10:00", label: "Explore / B-roll", icon: "📹" },
      { time: "PM", label: "Rest", icon: "😴" },
    ]
  },
  {
    date: "28 May", dow: "Thu", title: "Altos de Chavon",
    emoji: "🏛️",
    vibe: "Last sunset, make it count 🌇",
    type: "boys",
    who: ["Kai", "Khari"],
    events: [
      { time: "14:30", label: "Depart for Altos de Chavon", icon: "🚐" },
      { time: "16:00", label: "Explore + golden hour", icon: "🌇" },
      { time: "Eve", label: "Final dinner", icon: "🍽️" },
    ]
  },
  {
    date: "29 May", dow: "Fri", title: "Departure",
    emoji: "🏠",
    vibe: "Until next time, paradise 🏠",
    type: "boys",
    who: ["Kai", "Khari"],
    events: [
      { time: "AM", label: "Pack / chill", icon: "🧳" },
      { time: "13:30", label: "Leave for airport", icon: "🚐" },
      { time: "17:10", label: "Flight home (TOM569)", icon: "✈️", type: "departure" },
    ]
  },
];

const COSTS_TEMPLATE = [
  { id: "saona", name: "Saona Island", estimate: 100, category: "excursion", who: "full", emoji: "🏝️" },
  { id: "boat", name: "Jamaican Party Boat", estimate: 50, category: "excursion", who: "full", emoji: "🚤" },
  { id: "scape", name: "Scape Park", estimate: 110, category: "excursion", who: "full", emoji: "🎢" },
  { id: "sky", name: "Dinner in the Sky", estimate: 150, category: "dining", who: "full", emoji: "🎈" },
  { id: "cabanna", name: "Cabanna Dinner", estimate: 60, category: "dining", who: "full", emoji: "✨" },
  { id: "coco", name: "Coco Bongo", estimate: 70, category: "nightlife", who: "full", emoji: "🎭" },
  { id: "transport", name: "Transport (taxis/drivers)", estimate: 75, category: "transport", who: "full", emoji: "🚕" },
  { id: "restaurants", name: "Other restaurants", estimate: 100, category: "dining", who: "full", emoji: "🍽️" },
];

const TABS = [
  { name: "Itinerary", emoji: "📅" },
  { name: "Costs", emoji: "💰" },
  { name: "Challenges", emoji: "🏆" },
  { name: "Info", emoji: "✈️" },
];

// ============ STORAGE ============
const storage = {
  get: async (key) => {
    const value = localStorage.getItem(key);
    return value ? { value } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
  }
};

// ============ COLORS ============
const C = {
  bg: "#0a0f1a",
  bgGradient: "linear-gradient(180deg, #0a0f1a 0%, #111827 100%)",
  card: "rgba(255, 255, 255, 0.04)",
  cardSolid: "#141c28",
  cardBorder: "rgba(255, 255, 255, 0.08)",
  cardGlow: "rgba(245, 158, 11, 0.1)",
  premiumGlow: "0 0 20px rgba(245, 158, 11, 0.15)",
  accent: "#f59e0b",
  accentLight: "#fbbf24",
  accentSoft: "rgba(245, 158, 11, 0.15)",
  accentGlow: "rgba(245, 158, 11, 0.4)",
  gold: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)",
  green: "#22c55e",
  greenSoft: "rgba(34, 197, 94, 0.15)",
  red: "#ef4444",
  redSoft: "rgba(239, 68, 68, 0.15)",
  blue: "#3b82f6",
  blueSoft: "rgba(59, 130, 246, 0.15)",
  purple: "#a855f7",
  purpleSoft: "rgba(168, 85, 247, 0.15)",
  pink: "#ec4899",
  pinkSoft: "rgba(236, 72, 153, 0.15)",
  cyan: "#06b6d4",
  cyanSoft: "rgba(6, 182, 212, 0.15)",
  text: "#f0f2f5",
  textDim: "#94a3b8",
  textFaint: "#475569",
  glass: "rgba(255, 255, 255, 0.04)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
};

// ============ MAIN APP ============
export default function App() {
  const [tab, setTab] = useState(0);
  const [scores, setScores] = useState({});
  const [costs, setCosts] = useState({});
  const [selectedDay, setSelectedDay] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showAddChallenge, setShowAddChallenge] = useState(null);
  const [showAddCost, setShowAddCost] = useState(false);
  const [newCostName, setNewCostName] = useState("");
  const [newCostAmount, setNewCostAmount] = useState("");
  const [infoSection, setInfoSection] = useState("resort");
  const [expandedCategories, setExpandedCategories] = useState({ excursion: true, dining: true, nightlife: true, transport: true });

  useEffect(() => {
    (async () => {
      try {
        const s = await storage.get("dr-scores");
        if (s) setScores(JSON.parse(s.value));
      } catch {}
      try {
        const c = await storage.get("dr-costs");
        if (c) setCosts(JSON.parse(c.value));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const saveScores = useCallback(async (next) => {
    setScores(next);
    try { await storage.set("dr-scores", JSON.stringify(next)); } catch {}
  }, []);

  const saveCosts = useCallback(async (next) => {
    setCosts(next);
    try { await storage.set("dr-costs", JSON.stringify(next)); } catch {}
  }, []);

  const addPoint = (member, challengeId, pts) => {
    const key = `${member}-${challengeId}`;
    const next = { ...scores };
    if (!next[key]) {
      next[key] = pts;
    } else {
      delete next[key];
    }
    saveScores(next);
  };

  const addPenalty = (member, penaltyName, pts) => {
    const key = `${member}-pen-${penaltyName}`;
    const next = { ...scores };
    if (!next[key]) {
      next[key] = pts;
    } else {
      delete next[key];
    }
    saveScores(next);
  };

  const getTotal = (member) => {
    return Object.entries(scores)
      .filter(([k]) => k.startsWith(`${member}-`))
      .reduce((sum, [, v]) => sum + v, 0);
  };

  const leaderboard = [...MEMBERS].sort((a, b) => getTotal(b) - getTotal(a));

  const updateCost = (id, field, val) => {
    const next = { ...costs, [id]: { ...(costs[id] || {}), [field]: val } };
    saveCosts(next);
  };

  const getActualCost = (id) => parseFloat(costs[id]?.actual) || 0;

  const totalEstimate = COSTS_TEMPLATE.reduce((s, c) => s + c.estimate, 0) +
    Object.entries(costs).filter(([k]) => k.startsWith("custom-")).reduce((s, [, v]) => s + (parseFloat(v.estimate) || 0), 0);

  const totalActual = COSTS_TEMPLATE.reduce((s, c) => s + getActualCost(c.id), 0) +
    Object.entries(costs).filter(([k]) => k.startsWith("custom-")).reduce((s, [, v]) => s + (parseFloat(v.actual) || 0), 0);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  if (!loaded) return <LoadingScreen />;

  return (
    <div style={styles.app}>
      <HeroHeader />

      <nav style={styles.nav}>
        {TABS.map((t, i) => (
          <button key={t.name} onClick={() => setTab(i)}
            style={{ ...styles.navBtn, ...(tab === i ? styles.navActive : {}) }}>
            <span style={styles.navEmoji}>{t.emoji}</span>
            <span style={styles.navText}>{t.name}</span>
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {tab === 0 && (
          <ItineraryTab
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
          />
        )}

        {tab === 1 && (
          <CostsTab
            costs={costs}
            updateCost={updateCost}
            saveCosts={saveCosts}
            totalEstimate={totalEstimate}
            totalActual={totalActual}
            expandedCategories={expandedCategories}
            toggleCategory={toggleCategory}
            showAddCost={showAddCost}
            setShowAddCost={setShowAddCost}
            newCostName={newCostName}
            setNewCostName={setNewCostName}
            newCostAmount={newCostAmount}
            setNewCostAmount={setNewCostAmount}
          />
        )}

        {tab === 2 && (
          <ChallengesTab
            scores={scores}
            saveScores={saveScores}
            addPoint={addPoint}
            addPenalty={addPenalty}
            getTotal={getTotal}
            leaderboard={leaderboard}
            showAddChallenge={showAddChallenge}
            setShowAddChallenge={setShowAddChallenge}
          />
        )}

        {tab === 3 && (
          <InfoTab
            infoSection={infoSection}
            setInfoSection={setInfoSection}
          />
        )}
      </main>
    </div>
  );
}

// ============ LOADING SCREEN ============
function LoadingScreen() {
  return (
    <div style={styles.loading}>
      <div style={styles.loadingEmoji}>🌴</div>
      <div style={styles.loadingText}>Loading paradise...</div>
      <div style={styles.loadingBar}>
        <div style={styles.loadingFill} />
      </div>
    </div>
  );
}

// ============ HERO HEADER ============
function HeroHeader() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, started: false });

  useEffect(() => {
    const target = new Date("2026-05-18T11:00:00+01:00");

    const update = () => {
      const now = new Date();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, started: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      setCountdown({ days, hours, started: false });
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.headerRow}>
          <span style={styles.headerFlag}>🇩🇴</span>
          <h1 style={styles.headerTitle}>PUNTA CANA '26</h1>
        </div>
        {countdown.started ? (
          <div style={styles.countdownInline}>
            <span style={styles.countdownLiveEmoji}>🔥</span>
            <span style={styles.countdownInlineText}>WE OUT HERE</span>
          </div>
        ) : (
          <div style={styles.countdownInline}>
            <span style={styles.countdownInlineEmoji}>🌴</span>
            <span style={styles.countdownInlineText}>
              {countdown.days} days, {countdown.hours} hrs to go
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

// ============ ITINERARY TAB ============
function ItineraryTab({ selectedDay, setSelectedDay }) {
  const day = DAYS[selectedDay];
  const isBoysDay = day.type === "boys";
  const isMixedDay = day.type === "mixed";

  return (
    <div style={styles.itineraryTab}>
      {/* Day Picker */}
      <div style={styles.dayPickerContainer}>
        <div style={styles.dayPicker}>
          {DAYS.map((d, i) => {
            const isSelected = selectedDay === i;
            const isBoys = d.type === "boys";
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                style={{
                  ...styles.dayChip,
                  ...(isSelected ? styles.dayChipActive : {}),
                  ...(isBoys ? styles.dayChipBoys : {}),
                  ...(isSelected && isBoys ? styles.dayChipBoysActive : {}),
                }}
              >
                <span style={styles.dayChipEmoji}>{d.emoji}</span>
                <span style={styles.dayChipDate}>{d.date.split(" ")[0]}</span>
                <span style={styles.dayChipDow}>{d.dow}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Card */}
      <div style={{
        ...styles.dayCard,
        borderTop: isBoysDay ? `3px solid ${C.blue}` : isMixedDay ? `3px solid ${C.purple}` : `3px solid ${C.accent}`,
      }}>
        <div style={styles.dayCardHeader}>
          <div style={styles.dayCardEmoji}>{day.emoji}</div>
          <div style={styles.dayCardInfo}>
            <h2 style={styles.dayCardTitle}>{day.title}</h2>
            <span style={styles.dayCardDate}>{day.date} · {day.dow}</span>
          </div>
          {isBoysDay && <span style={styles.dayTypeBadge}>BOYS ONLY</span>}
          {isMixedDay && <span style={{ ...styles.dayTypeBadge, background: C.purpleSoft, color: C.purple }}>MIXED</span>}
        </div>

        {/* Who's Here */}
        <div style={styles.whoSection}>
          <div style={styles.whoLabel}>Who's here</div>
          <div style={styles.whoChips}>
            {day.who.map(m => (
              <div key={m} style={{
                ...styles.whoChip,
                background: `${PERSON_COLORS[m]}20`,
                borderColor: `${PERSON_COLORS[m]}40`,
                color: PERSON_COLORS[m],
              }}>
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* Day Vibe */}
        {day.vibe && (
          <div style={styles.dayVibe}>{day.vibe}</div>
        )}

        {/* Resort Event */}
        {day.resortEvent && (
          <div style={styles.resortEventBanner}>
            <span style={styles.resortEventIcon}>🎉</span>
            <span style={styles.resortEventText}>Tonight: {day.resortEvent}</span>
          </div>
        )}

        {/* Timeline */}
        <div style={styles.timeline}>
          {day.events.map((e, i) => (
            <div key={i} style={styles.timelineEvent}>
              <div style={styles.timelineTime}>
                <span style={styles.timelineTimeText}>{e.time}</span>
              </div>
              <div style={styles.timelineLine}>
                <div style={{
                  ...styles.timelineDot,
                  ...(e.premium ? styles.timelineDotPremium : {}),
                  ...(e.type === "departure" ? styles.timelineDotDeparture : {}),
                  ...(e.resortEvent ? styles.timelineDotResort : {}),
                }} />
                {i < day.events.length - 1 && <div style={styles.timelineConnector} />}
              </div>
              <div style={styles.timelineContent}>
                {e.premium ? (
                  <div style={styles.premiumEventCard}>
                    <div style={styles.premiumEventHeader}>
                      <span style={styles.premiumEventIcon}>{e.icon}</span>
                      <span style={styles.premiumEventLabel}>{e.label}</span>
                    </div>
                    <div style={styles.premiumEventFooter}>
                      {e.cost && <span style={styles.premiumEventCost}>{e.cost}</span>}
                      <span style={styles.premiumEventBadge}>BOOKED</span>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    ...styles.eventRow,
                    ...(e.type === "departure" ? styles.eventRowDeparture : {}),
                  }}>
                    <span style={styles.eventIcon}>{e.icon}</span>
                    <span style={styles.eventLabel}>{e.label}</span>
                    {e.resortEvent && <span style={styles.resortBadge}>RESORT</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ COSTS TAB ============
function CostsTab({
  costs, updateCost, saveCosts, totalEstimate, totalActual,
  expandedCategories, toggleCategory, showAddCost, setShowAddCost,
  newCostName, setNewCostName, newCostAmount, setNewCostAmount
}) {
  const progress = totalActual > 0 ? Math.min((totalActual / totalEstimate) * 100, 100) : 0;
  const categories = ["excursion", "dining", "nightlife", "transport"];
  const categoryNames = { excursion: "Excursions", dining: "Dining", nightlife: "Nightlife", transport: "Transport" };
  const categoryEmojis = { excursion: "🏝️", dining: "🍽️", nightlife: "🪩", transport: "🚕" };

  return (
    <div style={styles.costsTab}>
      {/* Summary Cards - Side by Side */}
      <div style={styles.costSummaryRow}>
        <div style={styles.costSummaryCard}>
          <div style={styles.costSummaryLabel}>BUDGET</div>
          <div style={styles.costSummaryValue}>£{totalEstimate}</div>
          <div style={styles.costSummarySubtext}>per person</div>
        </div>
        <div style={{ ...styles.costSummaryCard, borderColor: progress > 0 ? C.accent : C.cardBorder }}>
          <div style={styles.costSummaryLabel}>SPENT</div>
          <div style={{ ...styles.costSummaryValue, color: progress > 0 ? C.accent : C.textDim }}>
            {totalActual > 0 ? `£${totalActual}` : "—"}
          </div>
          <div style={styles.costSummarySubtext}>{progress > 0 ? `${Math.round(progress)}% of budget` : "per person"}</div>
        </div>
      </div>

      {/* Progress Bar - only show when there's spending */}
      {progress > 0 && (
        <div style={styles.costProgressBarContainer}>
          <div style={styles.costProgressBar}>
            <div style={{ ...styles.costProgressFill, width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Category Groups */}
      {categories.map(cat => {
        const items = COSTS_TEMPLATE.filter(c => c.category === cat);
        const customItems = Object.entries(costs).filter(([k, v]) => k.startsWith("custom-") && v.category === cat);
        if (items.length === 0 && customItems.length === 0) return null;

        const catTotal = items.reduce((s, c) => s + (parseFloat(costs[c.id]?.actual) || 0), 0);

        return (
          <div key={cat} style={styles.costCategory}>
            <button onClick={() => toggleCategory(cat)} style={styles.costCategoryHeader}>
              <span style={styles.costCategoryEmoji}>{categoryEmojis[cat]}</span>
              <span style={styles.costCategoryName}>{categoryNames[cat]}</span>
              <span style={styles.costCategoryTotal}>{catTotal > 0 ? `£${catTotal}` : ""}</span>
              <span style={styles.costCategoryChevron}>{expandedCategories[cat] ? "▼" : "▶"}</span>
            </button>
            {expandedCategories[cat] && (
              <div style={styles.costCategoryItems}>
                {items.map(c => {
                  // Show range based on estimate (±20%)
                  const low = Math.round(c.estimate * 0.8);
                  const high = Math.round(c.estimate * 1.2);
                  return (
                    <div key={c.id} style={styles.costItem}>
                      <div style={styles.costItemInfo}>
                        <span style={styles.costItemEmoji}>{c.emoji}</span>
                        <div>
                          <div style={styles.costItemName}>{c.name}</div>
                          <div style={styles.costItemEst}>Est: £{low}–{high} pp</div>
                        </div>
                      </div>
                      <div style={styles.costItemInput}>
                        <span style={styles.costPound}>£</span>
                        <input
                          type="number"
                          placeholder="actual"
                          value={costs[c.id]?.actual || ""}
                          onChange={e => updateCost(c.id, "actual", e.target.value)}
                          style={styles.costInput}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Custom Costs */}
      {Object.entries(costs).filter(([k]) => k.startsWith("custom-")).length > 0 && (
        <div style={styles.costCategory}>
          <div style={styles.costCategoryHeader}>
            <span style={styles.costCategoryEmoji}>➕</span>
            <span style={styles.costCategoryName}>Custom</span>
          </div>
          <div style={styles.costCategoryItems}>
            {Object.entries(costs).filter(([k]) => k.startsWith("custom-")).map(([k, v]) => (
              <div key={k} style={styles.costItem}>
                <div style={styles.costItemInfo}>
                  <span style={styles.costItemEmoji}>💵</span>
                  <div>
                    <div style={styles.costItemName}>{v.name}</div>
                    <div style={styles.costItemEst}>Est: £{v.estimate || 0} pp</div>
                  </div>
                </div>
                <div style={styles.costItemInput}>
                  <span style={styles.costPound}>£</span>
                  <input
                    type="number"
                    placeholder="actual"
                    value={v.actual || ""}
                    onChange={e => updateCost(k, "actual", e.target.value)}
                    style={styles.costInput}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Expense */}
      {showAddCost ? (
        <div style={styles.addCostForm}>
          <input
            placeholder="Expense name"
            value={newCostName}
            onChange={e => setNewCostName(e.target.value)}
            style={styles.addCostInput}
          />
          <input
            placeholder="Est £"
            type="number"
            value={newCostAmount}
            onChange={e => setNewCostAmount(e.target.value)}
            style={{ ...styles.addCostInput, width: 80 }}
          />
          <button style={styles.addCostBtn} onClick={() => {
            if (newCostName) {
              const id = `custom-${Date.now()}`;
              saveCosts({ ...costs, [id]: { name: newCostName, estimate: newCostAmount, actual: "", category: "excursion" } });
              setNewCostName(""); setNewCostAmount(""); setShowAddCost(false);
            }
          }}>Add</button>
          <button style={styles.addCostCancel} onClick={() => setShowAddCost(false)}>×</button>
        </div>
      ) : (
        <button style={styles.addExpenseBtn} onClick={() => setShowAddCost(true)}>
          <span>+</span> Add expense
        </button>
      )}

      <button style={styles.resetBtn} onClick={() => saveCosts({})}>
        Reset all costs
      </button>
    </div>
  );
}

// ============ CHALLENGES TAB ============
function ChallengesTab({
  scores, saveScores, addPoint, addPenalty, getTotal, leaderboard,
  showAddChallenge, setShowAddChallenge
}) {
  const difficulties = ["easy", "medium", "hard", "legendary"];
  const difficultyColors = {
    easy: C.green,
    medium: C.accent,
    hard: C.purple,
    legendary: C.red,
  };
  const difficultyEmojis = {
    easy: "🟢",
    medium: "🟡",
    hard: "🟣",
    legendary: "🔴",
  };

  const totalPoints = MEMBERS.reduce((sum, m) => sum + getTotal(m), 0);
  const hasScores = totalPoints > 0;

  // Count completed challenges per person
  const getCompletedCount = (member) => {
    return Object.keys(scores).filter(k => k.startsWith(`${member}-`) && !k.includes("-pen-")).length;
  };

  return (
    <div style={styles.challengesTab}>
      {/* Leaderboard Section */}
      <div style={styles.podiumSection}>
        <h3 style={styles.sectionTitle}>🏆 Leaderboard</h3>

        {!hasScores ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateEmoji}>🏆</div>
            <div style={styles.emptyStateText}>No points scored yet</div>
            <div style={styles.emptyStateSubtext}>The game begins on arrival!</div>
            <div style={styles.emptyStateCount}>{CHALLENGES.length} challenges to complete</div>
          </div>
        ) : (
          <>
            {/* Podium for top 3 */}
            <div style={styles.podium}>
              {leaderboard.slice(0, 3).map((m, i) => {
                const total = getTotal(m);
                const heights = [100, 70, 50];
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={m} style={{ ...styles.podiumPlace, order: i === 0 ? 1 : i === 1 ? 0 : 2 }}>
                    <div style={{
                      ...styles.podiumAvatar,
                      background: PERSON_COLORS[m],
                    }}>
                      <span style={styles.podiumMedal}>{medals[i]}</span>
                      <span style={styles.podiumInitial}>{m[0]}</span>
                    </div>
                    <div style={styles.podiumName}>{m}</div>
                    <div style={styles.podiumPts}>{total} pts</div>
                    <div style={{
                      ...styles.podiumBar,
                      height: heights[i],
                      background: `linear-gradient(to top, ${PERSON_COLORS[m]}, ${PERSON_COLORS[m]}80)`,
                    }} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Full Leaderboard */}
      <div style={styles.leaderboardList}>
        {leaderboard.map((m, i) => {
          const total = getTotal(m);
          const completed = getCompletedCount(m);
          const maxPts = Math.max(...MEMBERS.map(m2 => getTotal(m2)), 1);
          return (
            <div key={m} style={styles.lbRow}>
              <div style={styles.lbRank}>{i === 0 && total > 0 ? "👑" : `#${i + 1}`}</div>
              <div style={{
                ...styles.lbAvatar,
                background: `${PERSON_COLORS[m]}20`,
                color: PERSON_COLORS[m],
              }}>{m[0]}</div>
              <div style={styles.lbInfo}>
                <div style={styles.lbName}>{m}</div>
                <div style={styles.lbBar}>
                  <div style={{
                    ...styles.lbFill,
                    width: `${total > 0 ? (total / maxPts) * 100 : 0}%`,
                    background: PERSON_COLORS[m],
                  }} />
                </div>
              </div>
              <div style={styles.lbPtsContainer}>
                <div style={{ ...styles.lbPts, color: PERSON_COLORS[m] }}>{total}</div>
                {hasScores && <div style={styles.lbCompleted}>({completed}/{CHALLENGES.length})</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Award Points */}
      <h3 style={styles.sectionTitle}>⚡ Award Points</h3>
      <div style={styles.memberPicker}>
        {MEMBERS.map(m => (
          <button
            key={m}
            onClick={() => setShowAddChallenge(showAddChallenge === m ? null : m)}
            style={{
              ...styles.memberBtn,
              ...(showAddChallenge === m ? {
                background: `${PERSON_COLORS[m]}20`,
                borderColor: PERSON_COLORS[m],
                color: PERSON_COLORS[m],
              } : {}),
            }}
          >
            <span style={{
              ...styles.memberBtnInitial,
              background: `${PERSON_COLORS[m]}20`,
              color: PERSON_COLORS[m],
            }}>{m[0]}</span>
            <span style={styles.memberBtnName}>{m}</span>
          </button>
        ))}
      </div>

      {showAddChallenge && (
        <div style={styles.challengeList}>
          {difficulties.map(diff => {
            const filtered = CHALLENGES.filter(c => c.difficulty === diff);
            if (filtered.length === 0) return null;
            return (
              <div key={diff} style={styles.challengeSection}>
                <div style={styles.challengeSectionHeader}>
                  <span style={styles.challengeDiffEmoji}>{difficultyEmojis[diff]}</span>
                  <span style={{ ...styles.challengeDiffName, color: difficultyColors[diff] }}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </span>
                </div>
                {filtered.map(c => {
                  const key = `${showAddChallenge}-${c.id}`;
                  const done = !!scores[key];
                  return (
                    <button
                      key={c.id}
                      onClick={() => addPoint(showAddChallenge, c.id, c.pts)}
                      style={{
                        ...styles.challengeRow,
                        ...(done ? styles.challengeDone : {}),
                      }}
                    >
                      <span style={styles.challengeCheck}>{done ? "✅" : "⬜"}</span>
                      <span style={styles.challengeName}>{c.name}</span>
                      <span style={{ ...styles.challengePts, color: difficultyColors[diff] }}>+{c.pts}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          <div style={styles.challengeSection}>
            <div style={styles.challengeSectionHeader}>
              <span style={styles.challengeDiffEmoji}>❌</span>
              <span style={{ ...styles.challengeDiffName, color: C.red }}>Penalties</span>
            </div>
            {PENALTIES.map(p => {
              const key = `${showAddChallenge}-pen-${p.name}`;
              const done = !!scores[key];
              return (
                <button
                  key={p.name}
                  onClick={() => addPenalty(showAddChallenge, p.name, p.pts)}
                  style={{
                    ...styles.challengeRow,
                    ...(done ? styles.penaltyDone : {}),
                  }}
                >
                  <span style={styles.challengeCheck}>{done ? "❌" : "⬜"}</span>
                  <span style={styles.challengeName}>{p.name}</span>
                  <span style={{ ...styles.challengePts, color: C.red }}>{p.pts}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Forfeits */}
      <h3 style={styles.sectionTitle}>🎲 Daily Forfeits</h3>
      <div style={styles.forfeitGrid}>
        {FORFEITS.map((f, i) => (
          <div key={i} style={styles.forfeitChip}>{f}</div>
        ))}
      </div>

      <button style={styles.resetBtn} onClick={() => saveScores({})}>
        Reset all scores
      </button>
    </div>
  );
}

// ============ INFO TAB ============
function InfoTab({ infoSection, setInfoSection }) {
  const sections = [
    { id: "resort", label: "Resort", emoji: "🏨" },
    { id: "flights", label: "Flights", emoji: "✈️" },
    { id: "offsite", label: "Off-Site", emoji: "🗺️" },
    { id: "emergency", label: "Info", emoji: "ℹ️" },
    { id: "group", label: "Group", emoji: "👥" },
  ];

  return (
    <div style={styles.infoTab}>
      {/* Section Picker */}
      <div style={styles.infoSectionPicker}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setInfoSection(s.id)}
            style={{
              ...styles.infoSectionBtn,
              ...(infoSection === s.id ? styles.infoSectionBtnActive : {}),
            }}
          >
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Resort Section */}
      {infoSection === "resort" && (
        <div style={styles.infoContent}>
          <div style={styles.resortCard}>
            <div style={styles.resortHeader}>
              <h3 style={styles.resortName}>{RESORT.name}</h3>
              <div style={styles.resortStars}>{"⭐".repeat(RESORT.stars)}</div>
            </div>
            <div style={styles.resortAddress}>{RESORT.address}</div>
            <div style={styles.resortDetails}>
              <div style={styles.resortDetail}>
                <span style={styles.resortDetailIcon}>🕐</span>
                <span>Check-in: {RESORT.checkIn}</span>
              </div>
              <div style={styles.resortDetail}>
                <span style={styles.resortDetailIcon}>🕛</span>
                <span>Check-out: {RESORT.checkOut}</span>
              </div>
              <div style={styles.resortDetail}>
                <span style={styles.resortDetailIcon}>📞</span>
                <span>{RESORT.phone}</span>
              </div>
            </div>
          </div>

          <h4 style={styles.infoSubtitle}>🎁 What's Included</h4>
          <div style={styles.includedGrid}>
            {RESORT.included.map((item, i) => (
              <div key={i} style={styles.includedItem}>
                <span style={styles.includedIcon}>{item.icon}</span>
                <span style={styles.includedLabel}>{item.label}</span>
              </div>
            ))}
          </div>

          <h4 style={styles.infoSubtitle}>🍽️ On-Site Restaurants</h4>
          <div style={styles.restaurantList}>
            {RESORT.restaurants.map((r, i) => (
              <div key={i} style={styles.restaurantCard}>
                <span style={styles.restaurantEmoji}>{r.emoji}</span>
                <div style={styles.restaurantInfo}>
                  <div style={styles.restaurantName}>{r.name}</div>
                  <div style={styles.restaurantType}>{r.cuisine} · {r.type}</div>
                </div>
              </div>
            ))}
          </div>

          <h4 style={styles.infoSubtitle}>🎉 Weekly Entertainment</h4>
          <div style={styles.entertainmentGrid}>
            {RESORT.entertainment.map((e, i) => (
              <div key={i} style={styles.entertainmentCard}>
                <div style={styles.entertainmentDay}>{e.day}</div>
                <div style={styles.entertainmentEmoji}>{e.emoji}</div>
                <div style={styles.entertainmentEvent}>{e.event}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flights Section */}
      {infoSection === "flights" && (
        <div style={styles.infoContent}>
          {FLIGHTS.map(f => (
            <div key={f.id} style={styles.flightCard}>
              <div style={styles.flightHeader}>
                <span style={styles.flightType}>{f.type}</span>
                <span style={styles.flightDate}>{f.date}</span>
              </div>
              <div style={styles.flightRoute}>
                <div style={styles.flightAirport}>
                  <div style={styles.flightCode}>{f.from.code}</div>
                  <div style={styles.flightCity}>{f.from.city}</div>
                </div>
                <div style={styles.flightPlane}>
                  <div style={styles.flightLine} />
                  <span style={styles.flightIcon}>✈️</span>
                  <div style={styles.flightLine} />
                </div>
                <div style={styles.flightAirport}>
                  <div style={styles.flightCode}>{f.to.code}</div>
                  <div style={styles.flightCity}>{f.to.city}</div>
                </div>
              </div>
              {f.depart && (
                <div style={styles.flightTimes}>
                  <div><strong>{f.depart}</strong> → <strong>{f.arrive}</strong></div>
                  <div style={styles.flightDuration}>{f.duration}</div>
                </div>
              )}
              <div style={styles.flightDetails}>
                <div style={styles.flightDetailRow}>
                  <span style={styles.flightDetailLabel}>Flight</span>
                  <span style={styles.flightDetailValue}>{f.flight}</span>
                </div>
                {f.aircraft && (
                  <div style={styles.flightDetailRow}>
                    <span style={styles.flightDetailLabel}>Aircraft</span>
                    <span style={styles.flightDetailValue}>{f.aircraft}</span>
                  </div>
                )}
                {f.baggage && (
                  <div style={styles.flightDetailRow}>
                    <span style={styles.flightDetailLabel}>Baggage</span>
                    <span style={styles.flightDetailValue}>{f.baggage}</span>
                  </div>
                )}
                <div style={styles.flightDetailRow}>
                  <span style={styles.flightDetailLabel}>PNR</span>
                  <span style={styles.flightDetailValue}>{f.pnr}</span>
                </div>
              </div>
              <div style={styles.flightWho}>
                {f.who.map(w => (
                  <span key={w} style={{
                    ...styles.flightWhoChip,
                    background: `${PERSON_COLORS[w]}20`,
                    color: PERSON_COLORS[w],
                    borderColor: `${PERSON_COLORS[w]}40`,
                  }}>{w}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Off-Site Section */}
      {infoSection === "offsite" && (
        <div style={styles.infoContent}>
          <h4 style={styles.infoSubtitle}>🍽️ Dining</h4>
          <div style={styles.offsiteGrid}>
            {OFF_SITE.dining.map((item, i) => (
              <div key={i} style={styles.offsiteCard}>
                <span style={styles.offsiteEmoji}>{item.emoji}</span>
                <div style={styles.offsiteInfo}>
                  <div style={styles.offsiteName}>{item.name}</div>
                  <div style={styles.offsiteDesc}>{item.cuisine}</div>
                </div>
                <div style={styles.offsitePrice}>{item.price}</div>
              </div>
            ))}
          </div>

          <h4 style={styles.infoSubtitle}>🏖️ Beaches</h4>
          <div style={styles.offsiteGrid}>
            {OFF_SITE.beaches.map((item, i) => (
              <div key={i} style={styles.offsiteCard}>
                <span style={styles.offsiteEmoji}>{item.emoji}</span>
                <div style={styles.offsiteInfo}>
                  <div style={styles.offsiteName}>{item.name}</div>
                  <div style={styles.offsiteDesc}>{item.vibe}</div>
                </div>
                <div style={styles.offsitePrice}>{item.distance}</div>
              </div>
            ))}
          </div>

          <h4 style={styles.infoSubtitle}>🎢 Activities</h4>
          <div style={styles.offsiteGrid}>
            {OFF_SITE.activities.map((item, i) => (
              <div key={i} style={styles.offsiteCard}>
                <span style={styles.offsiteEmoji}>{item.emoji}</span>
                <div style={styles.offsiteInfo}>
                  <div style={styles.offsiteName}>{item.name}</div>
                  <div style={styles.offsiteDesc}>{item.desc}</div>
                </div>
                <div style={styles.offsitePrice}>{item.price}</div>
              </div>
            ))}
          </div>

          <h4 style={styles.infoSubtitle}>🪩 Nightlife</h4>
          <div style={styles.offsiteGrid}>
            {OFF_SITE.nightlife.map((item, i) => (
              <div key={i} style={styles.offsiteCard}>
                <span style={styles.offsiteEmoji}>{item.emoji}</span>
                <div style={styles.offsiteInfo}>
                  <div style={styles.offsiteName}>{item.name}</div>
                  <div style={styles.offsiteDesc}>{item.desc}</div>
                </div>
                <div style={styles.offsitePrice}>{item.price}</div>
              </div>
            ))}
          </div>

          <h4 style={styles.infoSubtitle}>🚕 Transport Guide</h4>
          <div style={styles.transportList}>
            {[
              { route: "Resort ↔ Nightlife", cost: "£25–40 total" },
              { route: "Resort ↔ Cap Cana", cost: "£35–60 total" },
              { route: "Resort ↔ Bayahibe", cost: "£80–120 total" },
              { route: "Resort ↔ Altos de Chavón", cost: "£90–140 total" },
            ].map((t, i) => (
              <div key={i} style={styles.transportRow}>
                <span>{t.route}</span>
                <span style={styles.transportCost}>{t.cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency/Info Section */}
      {infoSection === "emergency" && (
        <div style={styles.infoContent}>
          <h4 style={styles.infoSubtitle}>🌍 Destination Info</h4>
          <div style={styles.emergencyGrid}>
            <div style={styles.emergencyCard}>
              <span style={styles.emergencyIcon}>🕐</span>
              <div style={styles.emergencyLabel}>Timezone</div>
              <div style={styles.emergencyValue}>{EMERGENCY_INFO.timezone}</div>
              <div style={styles.emergencyNote}>{EMERGENCY_INFO.ukDiff}</div>
            </div>
            <div style={styles.emergencyCard}>
              <span style={styles.emergencyIcon}>💵</span>
              <div style={styles.emergencyLabel}>Currency</div>
              <div style={styles.emergencyValue}>{EMERGENCY_INFO.currency}</div>
            </div>
            <div style={styles.emergencyCard}>
              <span style={styles.emergencyIcon}>🗣️</span>
              <div style={styles.emergencyLabel}>Language</div>
              <div style={styles.emergencyValue}>{EMERGENCY_INFO.language}</div>
            </div>
            <div style={styles.emergencyCard}>
              <span style={styles.emergencyIcon}>💰</span>
              <div style={styles.emergencyLabel}>Tipping</div>
              <div style={styles.emergencyValue}>{EMERGENCY_INFO.tipping}</div>
            </div>
            <div style={styles.emergencyCard}>
              <span style={styles.emergencyIcon}>🔌</span>
              <div style={styles.emergencyLabel}>Plug Type</div>
              <div style={styles.emergencyValue}>{EMERGENCY_INFO.plugType}</div>
            </div>
          </div>

          <h4 style={styles.infoSubtitle}>📞 Emergency Contacts</h4>
          <div style={styles.contactList}>
            <div style={styles.contactRow}>
              <span style={styles.contactLabel}>Emergency</span>
              <span style={styles.contactValue}>{EMERGENCY_INFO.emergencyNumber}</span>
            </div>
            <div style={styles.contactRow}>
              <span style={styles.contactLabel}>UK Embassy</span>
              <span style={styles.contactValue}>{EMERGENCY_INFO.ukEmbassy}</span>
            </div>
            <div style={styles.contactRow}>
              <span style={styles.contactLabel}>Resort</span>
              <span style={styles.contactValue}>{EMERGENCY_INFO.resortPhone}</span>
            </div>
            <div style={styles.contactRow}>
              <span style={styles.contactLabel}>loveholidays (away)</span>
              <span style={styles.contactValue}>{EMERGENCY_INFO.loveholidaysAway}</span>
            </div>
            <div style={styles.contactRow}>
              <span style={styles.contactLabel}>loveholidays (before)</span>
              <span style={styles.contactValue}>{EMERGENCY_INFO.loveholidaysBefore}</span>
            </div>
            <div style={styles.contactRow}>
              <span style={styles.contactLabel}>Booking Ref</span>
              <span style={styles.contactValue}>{EMERGENCY_INFO.bookingRef}</span>
            </div>
          </div>
        </div>
      )}

      {/* Group Section */}
      {infoSection === "group" && (
        <div style={styles.infoContent}>
          <h4 style={styles.infoSubtitle}>👥 The Crew</h4>
          <div style={styles.groupGrid}>
            {MEMBERS.map(m => {
              // Corrected dates: Camara 20-26, Miles 20-25, Candice/Kyanna 18-25, Kai/Khari 18-29
              const getDates = (name) => {
                if (name === "Camara") return { dates: "20–26 May", days: 6 };
                if (name === "Miles") return { dates: "20–25 May", days: 5 };
                if (["Candice", "Kyanna"].includes(name)) return { dates: "18–25 May", days: 7 };
                return { dates: "18–29 May", days: 11 };
              };
              const { dates, days } = getDates(m);
              return (
                <div key={m} style={styles.groupCard}>
                  <div style={{
                    ...styles.groupAvatar,
                    background: PERSON_COLORS[m],
                  }}>
                    <span style={styles.groupAvatarInitial}>{m[0]}</span>
                  </div>
                  <div style={{ ...styles.groupName, color: PERSON_COLORS[m] }}>{m}</div>
                  <div style={styles.groupDates}>{dates}</div>
                  <div style={styles.groupDays}>{days} days</div>
                </div>
              );
            })}
          </div>

          <h4 style={styles.infoSubtitle}>📅 Who's There When</h4>
          <div style={styles.presenceTimeline}>
            {DAYS.map((d, i) => (
              <div key={i} style={styles.presenceRow}>
                <div style={styles.presenceDate}>{d.date}</div>
                <div style={styles.presenceDots}>
                  {MEMBERS.map(m => (
                    <div
                      key={m}
                      style={{
                        ...styles.presenceDot,
                        ...(d.who.includes(m) ? {
                          background: PERSON_COLORS[m],
                          color: "#0a0f1a",
                        } : {}),
                      }}
                      title={m}
                    >
                      {d.who.includes(m) ? m[0] : ""}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ STYLES ============
const styles = {
  app: {
    background: C.bgGradient,
    minHeight: "100vh",
    color: C.text,
    fontFamily: "'Inter', -apple-system, sans-serif",
  },

  // Loading
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: C.bgGradient,
  },
  loadingEmoji: { fontSize: 64, marginBottom: 16, animation: "float 2s ease-in-out infinite" },
  loadingText: { color: C.textDim, fontSize: 16, marginBottom: 24 },
  loadingBar: {
    width: 120,
    height: 4,
    background: C.cardBorder,
    borderRadius: 2,
    overflow: "hidden",
  },
  loadingFill: {
    width: "50%",
    height: "100%",
    background: `linear-gradient(90deg, ${C.accent}, ${C.accentLight}, ${C.accent})`,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },

  // Header
  header: {
    padding: "12px 16px",
    background: `linear-gradient(180deg, rgba(10, 15, 26, 0.95) 0%, rgba(10, 15, 26, 0.8) 100%)`,
    backdropFilter: "blur(10px)",
  },
  headerContent: {
    maxWidth: 560,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  headerFlag: { fontSize: 22 },
  headerTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: 2,
    background: C.gold,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  countdownInline: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  countdownInlineEmoji: { fontSize: 16 },
  countdownInlineText: {
    fontSize: 13,
    fontWeight: 600,
    color: C.textDim,
    fontFamily: "'Outfit', sans-serif",
    fontVariantNumeric: "tabular-nums",
  },
  countdownLiveEmoji: { fontSize: 16 },

  // Navigation
  nav: {
    display: "flex",
    maxWidth: 560,
    margin: "0 auto",
    padding: "0 12px",
    borderBottom: `1px solid ${C.cardBorder}`,
    background: C.glass,
    backdropFilter: "blur(10px)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    color: C.textDim,
    padding: "12px 8px",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    transition: "all 0.2s ease",
  },
  navActive: {
    color: C.accent,
    borderBottomColor: C.accent,
  },
  navEmoji: { fontSize: 18 },
  navText: { fontSize: 11, fontWeight: 600, letterSpacing: 0.5 },

  // Main
  main: {
    maxWidth: 560,
    margin: "0 auto",
    padding: "20px 16px 100px",
    animation: "fadeIn 0.2s ease",
  },

  // Itinerary
  itineraryTab: {},
  dayPickerContainer: {
    marginBottom: 16,
    overflow: "hidden",
  },
  dayPicker: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 8,
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  dayChip: {
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 14,
    padding: "10px 14px",
    cursor: "pointer",
    minWidth: 56,
    transition: "all 0.2s ease",
  },
  dayChipActive: {
    background: C.accentSoft,
    borderColor: C.accent,
    transform: "scale(1.05)",
  },
  dayChipBoys: {
    borderColor: `${C.blue}40`,
  },
  dayChipBoysActive: {
    background: C.blueSoft,
    borderColor: C.blue,
  },
  dayChipEmoji: { fontSize: 18 },
  dayChipDate: { fontSize: 16, fontWeight: 700, color: C.text },
  dayChipDow: { fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 0.5 },

  dayCard: {
    background: C.glass,
    backdropFilter: "blur(10px)",
    border: `1px solid ${C.glassBorder}`,
    borderRadius: 20,
    padding: 20,
    animation: "slideUp 0.3s ease",
  },
  dayCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  dayCardEmoji: {
    fontSize: 40,
    background: C.accentSoft,
    borderRadius: 14,
    padding: 10,
  },
  dayCardInfo: { flex: 1 },
  dayCardTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    color: C.text,
  },
  dayCardDate: {
    fontSize: 13,
    color: C.textDim,
    marginTop: 2,
  },
  dayTypeBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    background: C.blueSoft,
    color: C.blue,
    padding: "6px 10px",
    borderRadius: 8,
  },

  whoSection: { marginBottom: 12 },
  whoLabel: {
    fontSize: 11,
    color: C.textDim,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  whoChips: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  whoChip: {
    fontSize: 12,
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: 16,
    border: "1px solid",
  },
  dayVibe: {
    fontSize: 13,
    color: C.textDim,
    fontStyle: "italic",
    marginBottom: 16,
    paddingLeft: 4,
  },

  resortEventBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: `linear-gradient(135deg, ${C.purpleSoft} 0%, ${C.accentSoft} 100%)`,
    border: `1px solid ${C.purple}40`,
    borderRadius: 12,
    padding: "10px 14px",
    marginBottom: 16,
  },
  resortEventIcon: { fontSize: 18 },
  resortEventText: {
    fontSize: 13,
    fontWeight: 600,
    color: C.text,
  },

  timeline: {
    display: "flex",
    flexDirection: "column",
  },
  timelineEvent: {
    display: "flex",
    gap: 12,
    minHeight: 50,
  },
  timelineTime: {
    width: 50,
    flexShrink: 0,
    textAlign: "right",
    paddingTop: 2,
  },
  timelineTimeText: {
    fontSize: 12,
    color: C.textDim,
    fontWeight: 600,
  },
  timelineLine: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 20,
    flexShrink: 0,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: C.textFaint,
    flexShrink: 0,
    zIndex: 1,
  },
  timelineDotPremium: {
    background: C.accent,
    boxShadow: `0 0 12px ${C.accentGlow}`,
    animation: "pulse 2s ease-in-out infinite",
  },
  timelineDotDeparture: {
    background: C.red,
    boxShadow: `0 0 12px ${C.red}40`,
  },
  timelineDotResort: {
    background: C.purple,
    boxShadow: `0 0 12px ${C.purple}40`,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    minHeight: 30,
    background: `linear-gradient(to bottom, ${C.cardBorder}, transparent)`,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 12,
  },

  premiumEventCard: {
    background: `linear-gradient(135deg, ${C.accentSoft} 0%, rgba(245, 158, 11, 0.05) 100%)`,
    border: `1px solid ${C.accent}40`,
    borderRadius: 14,
    padding: 14,
    boxShadow: C.premiumGlow,
  },
  premiumEventHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  premiumEventIcon: { fontSize: 22 },
  premiumEventLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: C.text,
  },
  premiumEventFooter: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  premiumEventCost: {
    fontSize: 12,
    color: C.accent,
    fontWeight: 600,
  },
  premiumEventBadge: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    background: C.accent,
    color: C.bg,
    padding: "4px 8px",
    borderRadius: 6,
  },

  eventRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  eventRowDeparture: {
    color: C.red,
  },
  eventIcon: { fontSize: 16 },
  eventLabel: {
    fontSize: 14,
    color: C.text,
  },
  resortBadge: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.5,
    background: C.purpleSoft,
    color: C.purple,
    padding: "3px 6px",
    borderRadius: 4,
    marginLeft: 8,
  },

  // Costs
  costsTab: {},
  costSummaryRow: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
  },
  costSummaryCard: {
    flex: 1,
    background: C.glass,
    backdropFilter: "blur(10px)",
    border: `1px solid ${C.glassBorder}`,
    borderRadius: 16,
    padding: 16,
    textAlign: "center",
  },
  costSummaryLabel: {
    fontSize: 10,
    color: C.textDim,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: 600,
  },
  costSummaryValue: {
    fontSize: 28,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    fontVariantNumeric: "tabular-nums",
    color: C.text,
  },
  costSummarySubtext: {
    fontSize: 10,
    color: C.textFaint,
    marginTop: 4,
  },
  costProgressBarContainer: {
    marginBottom: 20,
  },
  costProgressBar: {
    height: 6,
    background: C.cardSolid,
    borderRadius: 3,
    overflow: "hidden",
  },
  costProgressFill: {
    height: "100%",
    background: `linear-gradient(90deg, ${C.accent}, ${C.accentLight})`,
    borderRadius: 3,
    transition: "width 0.5s ease",
  },

  costCategory: {
    marginBottom: 16,
  },
  costCategoryHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    marginBottom: 8,
    transition: "all 0.2s ease",
  },
  costCategoryEmoji: { fontSize: 18 },
  costCategoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: 700,
    color: C.text,
    textAlign: "left",
  },
  costCategoryTotal: {
    fontSize: 13,
    color: C.accent,
    fontWeight: 600,
  },
  costCategoryChevron: {
    fontSize: 10,
    color: C.textDim,
  },
  costCategoryItems: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    paddingLeft: 8,
  },
  costItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: `${C.card}80`,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 10,
    padding: "10px 12px",
  },
  costItemInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  costItemEmoji: { fontSize: 18 },
  costItemName: {
    fontSize: 13,
    fontWeight: 600,
    color: C.text,
  },
  costItemEst: {
    fontSize: 11,
    color: C.textDim,
  },
  costItemInput: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  costPound: {
    fontSize: 14,
    color: C.textDim,
  },
  costInput: {
    width: 70,
    background: C.bg,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 8,
    color: C.text,
    padding: "8px 10px",
    fontSize: 14,
    fontWeight: 600,
    outline: "none",
    transition: "border-color 0.2s",
  },

  addExpenseBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    background: "none",
    border: `2px dashed ${C.textFaint}`,
    borderRadius: 12,
    color: C.textDim,
    padding: 14,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.2s",
  },
  addCostForm: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  addCostInput: {
    flex: 1,
    background: C.bg,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 8,
    color: C.text,
    padding: "10px 12px",
    fontSize: 13,
    outline: "none",
  },
  addCostBtn: {
    background: C.accent,
    color: C.bg,
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  },
  addCostCancel: {
    background: "none",
    border: "none",
    color: C.textDim,
    fontSize: 20,
    cursor: "pointer",
    padding: "0 8px",
  },

  resetBtn: {
    width: "100%",
    background: "none",
    border: "none",
    color: C.textFaint,
    padding: 16,
    marginTop: 16,
    cursor: "pointer",
    fontSize: 12,
    transition: "color 0.2s",
  },

  // Challenges
  challengesTab: {},
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    margin: "24px 0 14px",
    color: C.text,
  },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 20px",
    background: C.glass,
    backdropFilter: "blur(10px)",
    border: `1px solid ${C.glassBorder}`,
    borderRadius: 16,
    textAlign: "center",
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: 700,
    color: C.text,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: C.textDim,
    marginBottom: 12,
  },
  emptyStateCount: {
    fontSize: 12,
    color: C.accent,
    fontWeight: 600,
  },

  podiumSection: { marginBottom: 24 },
  podium: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 12,
    padding: "20px 0",
  },
  podiumPlace: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  podiumAvatar: {
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  podiumMedal: {
    position: "absolute",
    top: -8,
    right: -8,
    fontSize: 18,
  },
  podiumInitial: {
    fontSize: 18,
    fontWeight: 800,
    color: C.bg,
  },
  podiumName: {
    fontSize: 13,
    fontWeight: 700,
    color: C.text,
  },
  podiumPts: {
    fontSize: 14,
    fontWeight: 800,
    color: C.accent,
    fontFamily: "'Outfit', sans-serif",
    fontVariantNumeric: "tabular-nums",
  },
  podiumBar: {
    width: 60,
    borderRadius: "8px 8px 0 0",
  },

  leaderboardList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 24,
  },
  lbRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: C.glass,
    backdropFilter: "blur(10px)",
    border: `1px solid ${C.glassBorder}`,
    borderRadius: 12,
    padding: "12px 14px",
  },
  lbRank: {
    width: 32,
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    color: C.textDim,
  },
  lbAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
  },
  lbInfo: { flex: 1 },
  lbName: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
  },
  lbBar: {
    height: 6,
    background: C.bg,
    borderRadius: 3,
    overflow: "hidden",
  },
  lbFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.5s ease",
  },
  lbPtsContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    minWidth: 60,
  },
  lbPts: {
    fontSize: 20,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    fontVariantNumeric: "tabular-nums",
  },
  lbCompleted: {
    fontSize: 10,
    color: C.textDim,
    marginTop: 2,
  },

  memberPicker: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  memberBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 24,
    color: C.textDim,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  memberBtnActive: {
    background: C.accentSoft,
    borderColor: C.accent,
    color: C.accent,
  },
  memberBtnInitial: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: C.accentSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
  },
  memberBtnName: {},

  challengeList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    maxHeight: 500,
    overflowY: "auto",
    paddingRight: 8,
  },
  challengeSection: {},
  challengeSectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  challengeDiffEmoji: { fontSize: 14 },
  challengeDiffName: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  challengeRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    marginBottom: 4,
    transition: "all 0.15s ease",
  },
  challengeDone: {
    background: C.greenSoft,
    borderColor: `${C.green}40`,
  },
  penaltyDone: {
    background: C.redSoft,
    borderColor: `${C.red}40`,
  },
  challengeCheck: { fontSize: 16 },
  challengeName: {
    flex: 1,
    fontSize: 13,
    color: C.text,
  },
  challengePts: {
    fontSize: 13,
    fontWeight: 700,
  },

  forfeitGrid: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  forfeitChip: {
    background: C.redSoft,
    border: `1px solid ${C.red}30`,
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12,
    color: C.red,
    fontWeight: 500,
  },

  // Info
  infoTab: {},
  infoSectionPicker: {
    display: "flex",
    gap: 6,
    overflowX: "auto",
    paddingBottom: 8,
    marginBottom: 16,
  },
  infoSectionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 20,
    color: C.textDim,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  },
  infoSectionBtnActive: {
    background: C.accentSoft,
    borderColor: C.accent,
    color: C.accent,
  },

  infoContent: {},
  infoSubtitle: {
    fontSize: 15,
    fontWeight: 700,
    margin: "20px 0 12px",
    color: C.text,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  resortCard: {
    background: `linear-gradient(135deg, ${C.card} 0%, ${C.accentSoft} 100%)`,
    border: `1px solid ${C.accent}30`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  resortHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  resortName: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    color: C.text,
  },
  resortStars: { fontSize: 14 },
  resortAddress: {
    fontSize: 12,
    color: C.textDim,
    marginBottom: 16,
  },
  resortDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  resortDetail: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: C.text,
  },
  resortDetailIcon: { fontSize: 16 },

  includedGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  includedItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 12,
    padding: 14,
  },
  includedIcon: { fontSize: 24 },
  includedLabel: {
    fontSize: 11,
    color: C.textDim,
    textAlign: "center",
  },

  restaurantList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  restaurantCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 12,
    padding: 12,
  },
  restaurantEmoji: { fontSize: 28 },
  restaurantInfo: {},
  restaurantName: {
    fontSize: 14,
    fontWeight: 600,
    color: C.text,
  },
  restaurantType: {
    fontSize: 12,
    color: C.textDim,
  },

  entertainmentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
  },
  entertainmentCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 12,
    padding: 12,
  },
  entertainmentDay: {
    fontSize: 10,
    color: C.accent,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  entertainmentEmoji: { fontSize: 22 },
  entertainmentEvent: {
    fontSize: 9,
    color: C.textDim,
    textAlign: "center",
    lineHeight: 1.3,
  },

  flightCard: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  flightHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  flightType: {
    fontSize: 11,
    fontWeight: 700,
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  flightDate: {
    fontSize: 12,
    color: C.textDim,
  },
  flightRoute: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  flightAirport: {
    textAlign: "center",
  },
  flightCode: {
    fontSize: 28,
    fontWeight: 900,
    fontFamily: "'Outfit', sans-serif",
    color: C.text,
    letterSpacing: 2,
  },
  flightCity: {
    fontSize: 11,
    color: C.textDim,
  },
  flightPlane: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    padding: "0 12px",
  },
  flightLine: {
    flex: 1,
    height: 2,
    background: `linear-gradient(90deg, ${C.cardBorder}, ${C.accent}, ${C.cardBorder})`,
  },
  flightIcon: { fontSize: 20 },
  flightTimes: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
    color: C.text,
    marginBottom: 12,
    padding: "10px 0",
    borderTop: `1px solid ${C.cardBorder}`,
    borderBottom: `1px solid ${C.cardBorder}`,
  },
  flightDuration: {
    fontSize: 11,
    color: C.accent,
    fontWeight: 600,
  },
  flightDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 12,
  },
  flightDetailRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
  },
  flightDetailLabel: {
    color: C.textDim,
  },
  flightDetailValue: {
    color: C.text,
    fontWeight: 500,
  },
  flightWho: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  flightWhoChip: {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 20,
    fontWeight: 600,
    border: "1px solid",
  },

  offsiteGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  offsiteCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 12,
    padding: 12,
  },
  offsiteEmoji: { fontSize: 24 },
  offsiteInfo: { flex: 1 },
  offsiteName: {
    fontSize: 14,
    fontWeight: 600,
    color: C.text,
  },
  offsiteDesc: {
    fontSize: 12,
    color: C.textDim,
  },
  offsitePrice: {
    fontSize: 12,
    color: C.accent,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  transportList: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 12,
    padding: 14,
  },
  transportRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    fontSize: 13,
    borderBottom: `1px solid ${C.cardBorder}`,
  },
  transportCost: {
    color: C.accent,
    fontWeight: 600,
  },

  emergencyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
  },
  emergencyCard: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 12,
    padding: 14,
  },
  emergencyIcon: {
    fontSize: 24,
    display: "block",
    marginBottom: 8,
  },
  emergencyLabel: {
    fontSize: 10,
    color: C.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  emergencyValue: {
    fontSize: 12,
    color: C.text,
    fontWeight: 500,
    lineHeight: 1.4,
  },
  emergencyNote: {
    fontSize: 10,
    color: C.accent,
    marginTop: 4,
  },

  contactList: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 12,
    padding: 14,
  },
  contactRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: `1px solid ${C.cardBorder}`,
  },
  contactLabel: {
    fontSize: 13,
    color: C.textDim,
  },
  contactValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: 600,
  },

  groupGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  groupCard: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 16,
    padding: 16,
    textAlign: "center",
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 10px",
  },
  groupAvatarInitial: {
    fontSize: 20,
    fontWeight: 800,
    color: C.bg,
  },
  groupName: {
    fontSize: 14,
    fontWeight: 700,
    color: C.text,
  },
  groupDates: {
    fontSize: 11,
    color: C.textDim,
    marginTop: 4,
  },
  groupDays: {
    fontSize: 10,
    color: C.accent,
    fontWeight: 600,
    marginTop: 4,
  },

  presenceTimeline: {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 12,
    padding: 14,
  },
  presenceRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 0",
    borderBottom: `1px solid ${C.cardBorder}`,
  },
  presenceDate: {
    width: 60,
    fontSize: 11,
    color: C.textDim,
    fontWeight: 500,
  },
  presenceDots: {
    display: "flex",
    gap: 6,
    flex: 1,
  },
  presenceDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: C.cardBorder,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "transparent",
    transition: "all 0.2s",
  },
  presenceDotActive: {
    // Colors applied inline per person
  },
};
