import { useState, useEffect, useCallback } from "react";

const MEMBERS = ["Kai", "Khari", "Candice", "Kyanna", "Camara", "Miles"];
const FULL_GROUP = MEMBERS;
const BOYS = ["Kai", "Khari", "Camara", "Miles"];

const CHALLENGES = [
  { id: 1, name: "Kiss someone", pts: 100 },
  { id: 2, name: "Sing in public", pts: 15, bonus: "+50 crowd, +50 money" },
  { id: 3, name: "Run 1km", pts: 20 },
  { id: 4, name: "5 shots at once", pts: 20 },
  { id: 5, name: "Get someone to buy you drinks", pts: 5 },
  { id: 6, name: "Selfie with stranger", pts: 3 },
  { id: 7, name: "Selfie with someone sleeping", pts: 3, bonus: "+30 bonus" },
  { id: 8, name: "Wear someone's clothes unnoticed (10 min)", pts: 15 },
  { id: 9, name: "30 min gym workout", pts: 15 },
  { id: 10, name: "Get number / insta / snap", pts: 5 },
  { id: 11, name: "Build sand sculpture", pts: 30 },
  { id: 12, name: "Stranger gives you money", pts: 75 },
  { id: 13, name: "Make a TikTok", pts: 2 },
  { id: 14, name: "Stranger joins TikTok", pts: 10 },
  { id: 15, name: "Cliff jump", pts: 100 },
  { id: 16, name: "Find group lookalike", pts: 70 },
  { id: 17, name: "Sleep somewhere else", pts: 100 },
  { id: 18, name: "Receive compliments", pts: 7 },
  { id: 19, name: "Get a tan", pts: 1 },
  { id: 20, name: "Hold hands with stranger", pts: 15 },
  { id: 21, name: "Down a drink", pts: 2 },
  { id: 22, name: "Shot", pts: 2 },
  { id: 23, name: "Play game with stranger", pts: 25 },
  { id: 24, name: "Buy souvenir", pts: 4 },
  { id: 25, name: "Matching outfit with stranger", pts: 15 },
  { id: 26, name: "Pic with 5 people 50+", pts: 50 },
  { id: 27, name: "Ask something embarrassing", pts: 35 },
  { id: 28, name: "Scare someone in group", pts: 10 },
  { id: 29, name: "Try something new", pts: 10 },
  { id: 30, name: "Ride Gianni's bike", pts: 85 },
  { id: 31, name: "Give massage", pts: 1, bonus: "per min" },
  { id: 32, name: "Shower with someone", pts: 100 },
  { id: 33, name: "Get a tattoo", pts: 250 },
  { id: 34, name: "All nighter", pts: 20 },
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
    who: ["Kai", "Khari", "Candice", "Kyanna"],
    events: [
      { time: "11:00", label: "Depart Birmingham (TOM566)" },
      { time: "14:50", label: "Arrive Punta Cana" },
      { time: "15:30", label: "Transfer & check-in" },
      { time: "17:30", label: "Pool & drinks" },
      { time: "20:00", label: "Dinner at resort" },
    ]
  },
  {
    date: "19 May", dow: "Tue", title: "Chill Day",
    who: ["Kai", "Khari", "Candice", "Kyanna"],
    events: [
      { time: "09:00", label: "Wake up / breakfast" },
      { time: "11:30", label: "Beach & pool" },
      { time: "15:00", label: "Explore resort" },
      { time: "20:00", label: "Dinner" },
    ]
  },
  {
    date: "20 May", dow: "Wed", title: "Full Group + Cabanna",
    who: FULL_GROUP,
    events: [
      { time: "Day", label: "Relax / Camara & Miles arrive" },
      { time: "18:30", label: "Get ready" },
      { time: "19:30", label: "Cabanna dinner", premium: true },
      { time: "22:00", label: "Drinks / light night" },
    ]
  },
  {
    date: "21 May", dow: "Thu", title: "Saona Island",
    who: FULL_GROUP,
    events: [
      { time: "06:30", label: "Pickup from resort" },
      { time: "09:30", label: "Boat departure" },
      { time: "11:30", label: "Island time + lunch" },
      { time: "16:00", label: "Return journey" },
      { time: "Eve", label: "Chill at resort" },
    ]
  },
  {
    date: "22 May", dow: "Fri", title: "Party Boat + Game Night",
    who: FULL_GROUP,
    events: [
      { time: "AM", label: "Free time" },
      { time: "14:30", label: "Jamaican Party Boat", premium: true },
      { time: "19:30", label: "Dinner" },
      { time: "21:00", label: "Game Night" },
    ]
  },
  {
    date: "23 May", dow: "Sat", title: "Coco Bongo Night",
    who: FULL_GROUP,
    events: [
      { time: "Day", label: "Chill / pool" },
      { time: "20:30", label: "Leave for Coco Bongo" },
      { time: "21:00", label: "Show + club", premium: true },
      { time: "Late", label: "Optional Drink Point" },
    ]
  },
  {
    date: "24 May", dow: "Sun", title: "Scape Park + Dinner in the Sky",
    who: FULL_GROUP,
    events: [
      { time: "08:30", label: "Leave for Scape Park" },
      { time: "09:30", label: "Scape Park activities", premium: true },
      { time: "17:30", label: "Return / rest" },
      { time: "19:30", label: "Dinner in the Sky", premium: true },
      { time: "22:30", label: "Optional nightlife" },
    ]
  },
  {
    date: "25 May", dow: "Mon", title: "Departures + Boys Night",
    who: FULL_GROUP,
    events: [
      { time: "AM", label: "Breakfast / send-off" },
      { time: "16:50", label: "Candice & Kyanna depart (TOM567)", departure: true },
      { time: "Eve", label: "Rest" },
      { time: "22:30", label: "Boys night" },
    ]
  },
  {
    date: "26 May", dow: "Tue", title: "Recovery Day",
    who: BOYS,
    events: [
      { time: "Late AM", label: "Wake up slowly" },
      { time: "Day", label: "Pool / beach / spa" },
      { time: "Eve", label: "Chill evening" },
    ]
  },
  {
    date: "27 May", dow: "Wed", title: "Filming Day",
    who: BOYS,
    events: [
      { time: "06:00", label: "Sunrise filming at Macao" },
      { time: "10:00", label: "Explore / B-roll" },
      { time: "PM", label: "Rest" },
    ]
  },
  {
    date: "28 May", dow: "Thu", title: "Altos de Chavon",
    who: BOYS,
    events: [
      { time: "14:30", label: "Depart for Altos de Chavon" },
      { time: "16:00", label: "Explore + golden hour" },
      { time: "Eve", label: "Final dinner" },
    ]
  },
  {
    date: "29 May", dow: "Fri", title: "Departure",
    who: BOYS,
    events: [
      { time: "AM", label: "Pack / chill" },
      { time: "13:30", label: "Leave for airport" },
      { time: "17:10", label: "Flight home (TOM569)" },
    ]
  },
];

const COSTS_TEMPLATE = [
  { id: "saona", name: "Saona Island", estimate: 100, category: "excursion", who: "full" },
  { id: "boat", name: "Jamaican Party Boat", estimate: 50, category: "excursion", who: "full" },
  { id: "scape", name: "Scape Park", estimate: 110, category: "excursion", who: "full" },
  { id: "sky", name: "Dinner in the Sky", estimate: 150, category: "dining", who: "full" },
  { id: "cabanna", name: "Cabanna Dinner", estimate: 60, category: "dining", who: "full" },
  { id: "coco", name: "Coco Bongo", estimate: 70, category: "nightlife", who: "full" },
  { id: "transport", name: "Transport (taxis/drivers)", estimate: 75, category: "transport", who: "full" },
  { id: "restaurants", name: "Other restaurants", estimate: 100, category: "dining", who: "full" },
];

const TABS = ["Itinerary", "Costs", "Challenges", "Info"];

// localStorage wrapper to replace window.storage
const storage = {
  get: async (key) => {
    const value = localStorage.getItem(key);
    return value ? { value } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
  }
};

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

  const getActualCost = (id) => {
    return parseFloat(costs[id]?.actual) || 0;
  };

  const totalEstimate = COSTS_TEMPLATE.reduce((s, c) => s + c.estimate, 0) +
    Object.entries(costs).filter(([k]) => k.startsWith("custom-")).reduce((s, [, v]) => s + (parseFloat(v.estimate) || 0), 0);

  const totalActual = COSTS_TEMPLATE.reduce((s, c) => s + getActualCost(c.id), 0) +
    Object.entries(costs).filter(([k]) => k.startsWith("custom-")).reduce((s, [, v]) => s + (parseFloat(v.actual) || 0), 0);

  if (!loaded) return (
    <div style={styles.loading}>
      <div style={styles.loadingEmoji}>🌴</div>
      <div style={styles.loadingText}>Loading paradise...</div>
    </div>
  );

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.flag}>🇩🇴</div>
          <div>
            <h1 style={styles.title}>PUNTA CANA '26</h1>
            <p style={styles.subtitle}>18 – 29 May · {MEMBERS.length} deep</p>
          </div>
        </div>
        <div style={styles.countdown}>
          <CountdownChip />
        </div>
      </header>

      <nav style={styles.nav}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ ...styles.navBtn, ...(tab === i ? styles.navActive : {}) }}>
            {["📅", "💰", "🏆", "✈️"][i]} {t}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {tab === 0 && (
          <div>
            <div style={styles.dayPicker}>
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => setSelectedDay(i)}
                  style={{ ...styles.dayChip, ...(selectedDay === i ? styles.dayChipActive : {}) }}>
                  <span style={styles.dayChipDate}>{d.date.split(" ")[0]}</span>
                  <span style={styles.dayChipDow}>{d.dow}</span>
                </button>
              ))}
            </div>

            <div style={styles.dayCard}>
              <div style={styles.dayHeader}>
                <h2 style={styles.dayTitle}>{DAYS[selectedDay].title}</h2>
                <span style={styles.dayDate}>{DAYS[selectedDay].date} · {DAYS[selectedDay].dow}</span>
              </div>
              <div style={styles.whoRow}>
                {DAYS[selectedDay].who.map(m => (
                  <span key={m} style={styles.whoChip}>{m}</span>
                ))}
              </div>
              <div style={styles.timeline}>
                {DAYS[selectedDay].events.map((e, i) => (
                  <div key={i} style={styles.event}>
                    <div style={styles.eventTime}>{e.time}</div>
                    <div style={styles.eventLine}>
                      <div style={{ ...styles.eventDot, ...(e.premium ? styles.eventDotPremium : {}), ...(e.departure ? styles.eventDotDeparture : {}) }} />
                      {i < DAYS[selectedDay].events.length - 1 && <div style={styles.eventConnector} />}
                    </div>
                    <div style={{ ...styles.eventLabel, ...(e.premium ? styles.eventLabelPremium : {}) }}>
                      {e.label}
                      {e.premium && <span style={styles.premiumBadge}>BOOKED</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div>
            <div style={styles.costSummary}>
              <div style={styles.costBox}>
                <div style={styles.costBoxLabel}>Estimated pp</div>
                <div style={styles.costBoxVal}>£{totalEstimate}</div>
              </div>
              <div style={{ ...styles.costBox, ...styles.costBoxActual }}>
                <div style={styles.costBoxLabel}>Actual pp</div>
                <div style={styles.costBoxVal}>£{totalActual || "—"}</div>
              </div>
            </div>

            <div style={styles.costList}>
              {COSTS_TEMPLATE.map(c => (
                <div key={c.id} style={styles.costItem}>
                  <div style={styles.costInfo}>
                    <span style={styles.costCat}>
                      {c.category === "excursion" ? "🏝️" : c.category === "dining" ? "🍽️" : c.category === "nightlife" ? "🪩" : "🚕"}
                    </span>
                    <div>
                      <div style={styles.costName}>{c.name}</div>
                      <div style={styles.costEst}>Est: £{c.estimate} pp</div>
                    </div>
                  </div>
                  <div style={styles.costInput}>
                    <span style={styles.pound}>£</span>
                    <input
                      type="number"
                      placeholder="Actual"
                      value={costs[c.id]?.actual || ""}
                      onChange={e => updateCost(c.id, "actual", e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
              ))}

              {Object.entries(costs).filter(([k]) => k.startsWith("custom-")).map(([k, v]) => (
                <div key={k} style={styles.costItem}>
                  <div style={styles.costInfo}>
                    <span style={styles.costCat}>➕</span>
                    <div>
                      <div style={styles.costName}>{v.name}</div>
                      <div style={styles.costEst}>Est: £{v.estimate || 0} pp</div>
                    </div>
                  </div>
                  <div style={styles.costInput}>
                    <span style={styles.pound}>£</span>
                    <input
                      type="number"
                      placeholder="Actual"
                      value={v.actual || ""}
                      onChange={e => updateCost(k, "actual", e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
              ))}
            </div>

            {showAddCost ? (
              <div style={styles.addCostForm}>
                <input placeholder="Expense name" value={newCostName} onChange={e => setNewCostName(e.target.value)} style={styles.addInput} />
                <input placeholder="Est. £ pp" type="number" value={newCostAmount} onChange={e => setNewCostAmount(e.target.value)} style={{ ...styles.addInput, width: 100 }} />
                <button style={styles.addBtn} onClick={() => {
                  if (newCostName) {
                    const id = `custom-${Date.now()}`;
                    saveCosts({ ...costs, [id]: { name: newCostName, estimate: newCostAmount, actual: "" } });
                    setNewCostName(""); setNewCostAmount(""); setShowAddCost(false);
                  }
                }}>Add</button>
              </div>
            ) : (
              <button style={styles.addExpenseBtn} onClick={() => setShowAddCost(true)}>+ Add expense</button>
            )}

            <button style={styles.resetBtn} onClick={() => { saveCosts({}); }}>Reset all costs</button>
          </div>
        )}

        {tab === 2 && (
          <div>
            <h3 style={styles.sectionTitle}>Leaderboard</h3>
            <div style={styles.leaderboard}>
              {leaderboard.map((m, i) => {
                const total = getTotal(m);
                const maxPts = Math.max(...MEMBERS.map(m2 => getTotal(m2)), 1);
                return (
                  <div key={m} style={styles.lbRow}>
                    <div style={styles.lbRank}>
                      {i === 0 && total > 0 ? "👑" : `#${i + 1}`}
                    </div>
                    <div style={styles.lbInfo}>
                      <div style={styles.lbName}>{m}</div>
                      <div style={styles.lbBar}>
                        <div style={{ ...styles.lbFill, width: `${total > 0 ? (total / maxPts) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div style={styles.lbPts}>{total}</div>
                  </div>
                );
              })}
            </div>

            <h3 style={styles.sectionTitle}>Award Points</h3>
            <div style={styles.memberPicker}>
              {MEMBERS.map(m => (
                <button key={m} onClick={() => setShowAddChallenge(showAddChallenge === m ? null : m)}
                  style={{ ...styles.memberBtn, ...(showAddChallenge === m ? styles.memberBtnActive : {}) }}>
                  {m}
                </button>
              ))}
            </div>

            {showAddChallenge && (
              <div style={styles.challengeList}>
                <div style={styles.challengeSectionHead}>Challenges</div>
                {CHALLENGES.map(c => {
                  const key = `${showAddChallenge}-${c.id}`;
                  const done = !!scores[key];
                  return (
                    <button key={c.id} onClick={() => addPoint(showAddChallenge, c.id, c.pts)}
                      style={{ ...styles.challengeRow, ...(done ? styles.challengeDone : {}) }}>
                      <span style={styles.challengeCheck}>{done ? "✅" : "⬜"}</span>
                      <span style={styles.challengeName}>{c.name}</span>
                      <span style={styles.challengePts}>+{c.pts}</span>
                    </button>
                  );
                })}
                <div style={{ ...styles.challengeSectionHead, marginTop: 16 }}>Penalties</div>
                {PENALTIES.map(p => {
                  const key = `${showAddChallenge}-pen-${p.name}`;
                  const done = !!scores[key];
                  return (
                    <button key={p.name} onClick={() => addPenalty(showAddChallenge, p.name, p.pts)}
                      style={{ ...styles.challengeRow, ...(done ? styles.penaltyDone : {}) }}>
                      <span style={styles.challengeCheck}>{done ? "❌" : "⬜"}</span>
                      <span style={styles.challengeName}>{p.name}</span>
                      <span style={{ ...styles.challengePts, color: "#ef4444" }}>{p.pts}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <h3 style={{ ...styles.sectionTitle, marginTop: 24 }}>Daily Forfeits</h3>
            <div style={styles.forfeitGrid}>
              {FORFEITS.map((f, i) => (
                <div key={i} style={styles.forfeitChip}>{f}</div>
              ))}
            </div>

            <button style={styles.resetBtn} onClick={() => { saveScores({}); }}>Reset all scores</button>
          </div>
        )}

        {tab === 3 && (
          <div>
            <h3 style={styles.sectionTitle}>Flights</h3>
            <div style={styles.infoCard}>
              <div style={styles.flightHead}>Outbound · 18 May</div>
              <div style={styles.flightRoute}>BHX → PUJ</div>
              <div style={styles.flightDetail}>TOM566 · Departs 11:00 · Arrives 14:50</div>
              <div style={styles.flightWho}>Kai, Khari, Candice, Kyanna</div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.flightHead}>Camara & Miles · 20 May</div>
              <div style={styles.flightRoute}>TBC → PUJ</div>
              <div style={styles.flightDetail}>Details to be confirmed</div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.flightHead}>Candice & Kyanna Return · 25 May</div>
              <div style={styles.flightRoute}>PUJ → BHX</div>
              <div style={styles.flightDetail}>TOM567 · Departs 16:50 · Arrives 06:00+1</div>
              <div style={styles.flightDetail}>PNR: MEKPQX</div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.flightHead}>Return · 29 May</div>
              <div style={styles.flightRoute}>PUJ → BHX</div>
              <div style={styles.flightDetail}>TOM569 · Departs 17:10 · Arrives 06:15+1</div>
              <div style={styles.flightWho}>Kai, Khari, Camara, Miles</div>
            </div>

            <h3 style={styles.sectionTitle}>Key Spots</h3>
            <div style={styles.spotGrid}>
              {[
                { cat: "Dining", items: ["Cabanna (£40–80pp)", "Dinner in the Sky (£120–180pp)", "Citrus / La Yola (£30–60pp)", "Jellyfish / Onno's (£10–25pp)"] },
                { cat: "Beaches", items: ["Playa Macao", "Bavaro Beach", "Juanillo Beach", "Playa Escondida"] },
                { cat: "Activities", items: ["Scape Park (£90–130)", "Saona Island (£70–120)", "Jet skis", "Parasailing", "ATV / buggy tours", "Spa day"] },
                { cat: "Nightlife", items: ["Coco Bongo", "Drink Point", "Infinity Lounge"] },
              ].map(s => (
                <div key={s.cat} style={styles.spotCard}>
                  <div style={styles.spotCat}>{s.cat}</div>
                  {s.items.map(it => <div key={it} style={styles.spotItem}>{it}</div>)}
                </div>
              ))}
            </div>

            <h3 style={styles.sectionTitle}>Transport Guide</h3>
            <div style={styles.infoCard}>
              <div style={styles.transportRow}><span>Resort ↔ Nightlife</span><span>£25–40 total</span></div>
              <div style={styles.transportRow}><span>Resort ↔ Cap Cana</span><span>£35–60 total</span></div>
              <div style={styles.transportRow}><span>Resort ↔ Bayahibe</span><span>£80–120 total</span></div>
              <div style={styles.transportRow}><span>Resort ↔ Altos de Chavón</span><span>£90–140 total</span></div>
            </div>

            <h3 style={styles.sectionTitle}>Group</h3>
            <div style={styles.groupGrid}>
              {MEMBERS.map(m => (
                <div key={m} style={styles.groupChip}>
                  <div style={styles.groupAvatar}>{m[0]}</div>
                  <div style={styles.groupName}>{m}</div>
                  <div style={styles.groupDates}>
                    {["Candice", "Kyanna"].includes(m) ? "18–25 May" : ["Camara", "Miles"].includes(m) ? "20–29 May" : "18–29 May"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CountdownChip() {
  const target = new Date("2026-05-18T11:00:00+01:00");
  const now = new Date();
  const diff = target - now;
  const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  return <span style={styles.countdownText}>{days > 0 ? `${days}d to go` : "WE OUT HERE"}</span>;
}

const C = {
  bg: "#0c1117",
  card: "#151c25",
  cardBorder: "#1e2a36",
  accent: "#f59e0b",
  accentSoft: "rgba(245,158,11,0.12)",
  green: "#22c55e",
  greenSoft: "rgba(34,197,94,0.12)",
  red: "#ef4444",
  redSoft: "rgba(239,68,68,0.12)",
  blue: "#3b82f6",
  blueSoft: "rgba(59,130,246,0.12)",
  text: "#e8eaed",
  textDim: "#8899a6",
  textFaint: "#4a5568",
};

const styles = {
  app: { background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Segoe UI', -apple-system, sans-serif", maxWidth: 480, margin: "0 auto" },
  loading: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg },
  loadingEmoji: { fontSize: 48, marginBottom: 12 },
  loadingText: { color: C.textDim, fontSize: 14 },

  header: { padding: "20px 16px 12px", borderBottom: `1px solid ${C.cardBorder}` },
  headerInner: { display: "flex", alignItems: "center", gap: 12 },
  flag: { fontSize: 36 },
  title: { margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: 1.5, color: C.accent },
  subtitle: { margin: 0, fontSize: 13, color: C.textDim, marginTop: 2 },
  countdown: { marginTop: 8 },
  countdownText: { fontSize: 12, color: C.accent, fontWeight: 600, background: C.accentSoft, padding: "4px 10px", borderRadius: 20 },

  nav: { display: "flex", gap: 2, padding: "8px 8px 0", borderBottom: `1px solid ${C.cardBorder}` },
  navBtn: { flex: 1, background: "none", border: "none", color: C.textDim, fontSize: 12, fontWeight: 600, padding: "10px 0", cursor: "pointer", borderBottom: "2px solid transparent", transition: "all .15s" },
  navActive: { color: C.accent, borderBottomColor: C.accent },

  main: { padding: "16px 12px 80px" },

  dayPicker: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, WebkitOverflowScrolling: "touch" },
  dayChip: { flexShrink: 0, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", textAlign: "center", minWidth: 44, transition: "all .15s" },
  dayChipActive: { background: C.accentSoft, borderColor: C.accent },
  dayChipDate: { display: "block", fontSize: 16, fontWeight: 700, color: C.text },
  dayChipDow: { display: "block", fontSize: 10, color: C.textDim, marginTop: 2 },

  dayCard: { background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 16, marginTop: 4 },
  dayHeader: { marginBottom: 10 },
  dayTitle: { margin: 0, fontSize: 18, fontWeight: 700 },
  dayDate: { fontSize: 12, color: C.textDim },
  whoRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 },
  whoChip: { fontSize: 11, color: C.blue, background: C.blueSoft, padding: "3px 8px", borderRadius: 20, fontWeight: 600 },

  timeline: { display: "flex", flexDirection: "column", gap: 0 },
  event: { display: "flex", gap: 10, minHeight: 40, alignItems: "flex-start" },
  eventTime: { width: 54, fontSize: 11, color: C.textDim, fontWeight: 600, paddingTop: 2, flexShrink: 0, textAlign: "right" },
  eventLine: { display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 },
  eventDot: { width: 10, height: 10, borderRadius: "50%", background: C.textFaint, flexShrink: 0 },
  eventDotPremium: { background: C.accent, boxShadow: `0 0 8px ${C.accent}40` },
  eventDotDeparture: { background: C.red },
  eventConnector: { width: 2, flex: 1, minHeight: 20, background: C.cardBorder },
  eventLabel: { fontSize: 14, paddingTop: 0, lineHeight: 1.4, paddingBottom: 10 },
  eventLabelPremium: { fontWeight: 600 },
  premiumBadge: { fontSize: 9, background: C.accentSoft, color: C.accent, padding: "2px 6px", borderRadius: 4, marginLeft: 8, fontWeight: 700, letterSpacing: 0.5 },

  costSummary: { display: "flex", gap: 10, marginBottom: 16 },
  costBox: { flex: 1, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 14, textAlign: "center" },
  costBoxActual: { borderColor: C.accent },
  costBoxLabel: { fontSize: 11, color: C.textDim, marginBottom: 4, fontWeight: 600 },
  costBoxVal: { fontSize: 24, fontWeight: 800 },

  costList: { display: "flex", flexDirection: "column", gap: 8 },
  costItem: { display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "10px 12px" },
  costInfo: { display: "flex", alignItems: "center", gap: 10 },
  costCat: { fontSize: 20 },
  costName: { fontSize: 14, fontWeight: 600 },
  costEst: { fontSize: 11, color: C.textDim },
  costInput: { display: "flex", alignItems: "center", gap: 2 },
  pound: { color: C.textDim, fontSize: 14 },
  input: { width: 70, background: C.bg, border: `1px solid ${C.cardBorder}`, borderRadius: 6, color: C.text, padding: "6px 8px", fontSize: 14, outline: "none" },

  addExpenseBtn: { width: "100%", background: "none", border: `1px dashed ${C.textFaint}`, borderRadius: 10, color: C.textDim, padding: 12, marginTop: 10, cursor: "pointer", fontSize: 13 },
  addCostForm: { display: "flex", gap: 8, marginTop: 10, alignItems: "center" },
  addInput: { flex: 1, background: C.bg, border: `1px solid ${C.cardBorder}`, borderRadius: 6, color: C.text, padding: "8px 10px", fontSize: 13, outline: "none" },
  addBtn: { background: C.accent, color: C.bg, border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 },

  resetBtn: { width: "100%", background: "none", border: "none", color: C.textFaint, padding: 14, marginTop: 16, cursor: "pointer", fontSize: 11 },

  sectionTitle: { fontSize: 16, fontWeight: 700, margin: "20px 0 10px", color: C.text },

  leaderboard: { display: "flex", flexDirection: "column", gap: 8 },
  lbRow: { display: "flex", alignItems: "center", gap: 10, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "10px 12px" },
  lbRank: { width: 32, fontSize: 14, fontWeight: 700, textAlign: "center", color: C.textDim },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 14, fontWeight: 600, marginBottom: 4 },
  lbBar: { height: 6, background: C.bg, borderRadius: 3, overflow: "hidden" },
  lbFill: { height: "100%", background: `linear-gradient(90deg, ${C.accent}, ${C.green})`, borderRadius: 3, transition: "width .3s" },
  lbPts: { fontSize: 18, fontWeight: 800, color: C.accent, minWidth: 40, textAlign: "right" },

  memberPicker: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  memberBtn: { background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, color: C.textDim, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all .15s" },
  memberBtnActive: { background: C.accentSoft, borderColor: C.accent, color: C.accent },

  challengeList: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 400, overflowY: "auto" },
  challengeSectionHead: { fontSize: 12, fontWeight: 700, color: C.textDim, padding: "8px 0 4px", textTransform: "uppercase", letterSpacing: 1 },
  challengeRow: { display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", textAlign: "left", width: "100%", transition: "all .1s" },
  challengeDone: { background: C.greenSoft, borderColor: C.green + "40" },
  penaltyDone: { background: C.redSoft, borderColor: C.red + "40" },
  challengeCheck: { fontSize: 16 },
  challengeName: { flex: 1, fontSize: 13, color: C.text },
  challengePts: { fontSize: 13, fontWeight: 700, color: C.green },

  forfeitGrid: { display: "flex", gap: 6, flexWrap: "wrap" },
  forfeitChip: { background: C.redSoft, border: `1px solid ${C.red}20`, borderRadius: 8, padding: "6px 10px", fontSize: 12, color: C.red },

  infoCard: { background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 14, marginBottom: 10 },
  flightHead: { fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 },
  flightRoute: { fontSize: 22, fontWeight: 800, letterSpacing: 2, marginBottom: 4 },
  flightDetail: { fontSize: 12, color: C.textDim },
  flightWho: { fontSize: 12, color: C.blue, marginTop: 4 },

  transportRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: `1px solid ${C.cardBorder}` },

  spotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  spotCard: { background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: 12 },
  spotCat: { fontSize: 13, fontWeight: 700, marginBottom: 6 },
  spotItem: { fontSize: 12, color: C.textDim, padding: "2px 0" },

  groupGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  groupChip: { background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 12, textAlign: "center" },
  groupAvatar: { width: 36, height: 36, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, margin: "0 auto 6px" },
  groupName: { fontSize: 13, fontWeight: 700 },
  groupDates: { fontSize: 10, color: C.textDim, marginTop: 2 },
};
