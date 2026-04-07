# Site Restructure — Game Competition Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the DR Trip Tracker site flow into a game/competition theme: Home → About the Holiday → Meet the Players → Itinerary → Learn the Game.

**Architecture:** Single-file React app (App.jsx). All changes happen in this file — new data constants, a new AdventureMap component, reordered sections, updated nav labels, and removal of the standalone Hotel/Need to Know sections.

**Tech Stack:** React, Vite, inline styles (existing pattern), no external dependencies added.

---

### Task 1: Add ACTIVITIES data constant and update NAV_ITEMS

**Files:**
- Modify: `src/App.jsx:44-135` (data constants section)

- [ ] **Step 1: Add ACTIVITIES array after CHALLENGES constant (line 127)**

Insert after the closing `];` of CHALLENGES (line 127):

```jsx
const ACTIVITIES = [
  { id: "saona", name: "Saona Island", icon: "🏝️", description: "Full-day boat trip with open bar, starfish beach, and island BBQ lunch", price: "£70-120pp", day: "21 May", color: C.turquoise },
  { id: "party-boat", name: "Jamaican Party Boat", icon: "🚤", description: "Afternoon party cruise with open bar, music, and ocean vibes", price: "£50pp", day: "22 May", color: C.blue },
  { id: "coco-bongo", name: "Coco Bongo", icon: "🎭", description: "The wildest night in Punta Cana — live show, open bar, and non-stop party", price: "£60-100pp", day: "23 May", color: C.purple },
  { id: "scape-park", name: "Scape Park", icon: "🎢", description: "Adventure park with zip-lines, cenotes, caves, and adrenaline rushes", price: "£90-130pp", day: "24 May", color: C.green },
  { id: "sky-dinner", name: "Dinner in the Sky", icon: "🎈", description: "Fine dining suspended 150ft in the air with panoramic views", price: "£120-180pp", day: "24 May", color: C.coral },
  { id: "altos", name: "Altos de Chavón", icon: "🌇", description: "16th-century Mediterranean village replica — golden hour views and exploring", price: "Free", day: "28 May", color: C.gold },
];
```

- [ ] **Step 2: Update NAV_ITEMS to new labels and IDs**

Replace the existing NAV_ITEMS (lines 129-135):

```jsx
const NAV_ITEMS = [
  { id: "about", label: "About the Holiday" },
  { id: "players", label: "Meet the Players" },
  { id: "itinerary", label: "Itinerary" },
  { id: "challenges", label: "Learn the Game" },
];
```

- [ ] **Step 3: Verify the dev server still loads without errors**

Run: Open http://localhost:5173/ and check the browser console for errors.
Expected: No errors. Nav labels should already update since StickyNav reads from NAV_ITEMS. Links won't scroll to correct sections yet (IDs haven't changed).

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add ACTIVITIES data and update nav labels for game theme"
```

---

### Task 2: Build the AdventureMap component

**Files:**
- Modify: `src/App.jsx` (add component after Leaderboard, around line 537)

- [ ] **Step 1: Add AdventureMap component**

Insert after the closing of the `Leaderboard` component (after line 537):

```jsx
const AdventureMap = () => {
  const [selected, setSelected] = useState(null);

  return (
    <Reveal delay={0.15}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px" }}>
        <div style={{
          background: "#1a2a3a",
          borderRadius: 24,
          padding: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Punta Cana</div>
            <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 16, color: C.white }}>Adventure Map</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {ACTIVITIES.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelected(selected === a.id ? null : a.id)}
                style={{
                  background: selected === a.id
                    ? `linear-gradient(135deg, ${a.color}, ${a.color}CC)`
                    : `linear-gradient(135deg, ${a.color}25, ${a.color}15)`,
                  borderRadius: 16,
                  padding: selected === a.id ? "16px 12px" : "14px 10px",
                  textAlign: "center",
                  cursor: "pointer",
                  border: `2px solid ${selected === a.id ? a.color : "rgba(255,255,255,0.08)"}`,
                  transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                  transform: selected === a.id ? "scale(1.05)" : "scale(1)",
                  gridColumn: selected === a.id ? "1 / -1" : "auto",
                }}
              >
                <div style={{ fontSize: selected === a.id ? 28 : 24, transition: "font-size 0.3s ease" }}>{a.icon}</div>
                <div style={{
                  fontFamily: "'Dela Gothic One', sans-serif",
                  fontSize: selected === a.id ? 14 : 10,
                  color: C.white,
                  marginTop: 4,
                  transition: "font-size 0.3s ease",
                }}>{a.name}</div>
                {selected !== a.id && (
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: a.color, margin: "6px auto 0",
                    boxShadow: `0 0 8px ${a.color}`,
                  }} />
                )}
                {selected === a.id && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{
                      fontFamily: "Nunito, sans-serif", fontSize: 12, fontWeight: 600,
                      color: "rgba(255,255,255,0.9)", lineHeight: 1.5, marginBottom: 8,
                    }}>{a.description}</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10,
                        background: "rgba(255,255,255,0.2)", color: C.white,
                        padding: "3px 10px", borderRadius: 8,
                      }}>{a.price}</span>
                      <span style={{
                        fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10,
                        background: "rgba(255,255,255,0.2)", color: C.white,
                        padding: "3px 10px", borderRadius: 8,
                      }}>{a.day}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{
            textAlign: "center", marginTop: 12,
            fontFamily: "Nunito, sans-serif", fontSize: 10, fontWeight: 600,
            color: "rgba(255,255,255,0.3)",
          }}>Tap a pin to explore</div>
        </div>
      </div>
    </Reveal>
  );
};
```

- [ ] **Step 2: Verify the component renders without errors**

The component won't be visible yet (not added to JSX). Check that the dev server still loads at http://localhost:5173/ with no console errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add AdventureMap component with expandable activity pins"
```

---

### Task 3: Add the "About the Holiday" section to the page

**Files:**
- Modify: `src/App.jsx` (main App return JSX, around line 597)

- [ ] **Step 1: Insert the About the Holiday section after the Hero section**

After the hero section's closing `</section>` (line 597), and **before** the current crew section, insert:

```jsx
      {/* ── ABOUT THE HOLIDAY ──────────────────────────────────────────── */}
      <section id="about" style={{ padding: "80px 0 60px", background: C.white }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 36, padding: "0 24px" }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.turquoise, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>The Mission Briefing</div>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>About the Holiday</h2>
          </div>
        </Reveal>

        {/* Hotel Highlights */}
        <Reveal delay={0.1}>
          <div style={{ textAlign: "center", padding: "0 24px", marginBottom: 32 }}>
            <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(18px, 4vw, 28px)", color: C.dark, marginBottom: 4 }}>{RESORT.name}</div>
            <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.textBody, fontWeight: 600 }}>{"⭐".repeat(RESORT.stars)} All-Inclusive</div>
            <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody, fontWeight: 600, marginTop: 4 }}>Check-in: {RESORT.checkIn} · Check-out: {RESORT.checkOut}</div>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, maxWidth: 520, margin: "0 auto 40px", padding: "0 24px" }}>
            {RESORT.included.map((item, i) => (
              <div key={i} style={{ background: `${C.turquoise}10`, borderRadius: 14, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 12, color: C.dark }}>{item.label}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Key Dates & Travel Info */}
        <Reveal delay={0.2}>
          <div style={{ maxWidth: 600, margin: "0 auto 40px", padding: "0 24px" }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.turquoise, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>Need to Know</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {TRIP_INFO.map((item) => (
                <div key={item.key} style={{ background: `${C.turquoise}08`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.turquoise}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10, color: C.textBody, letterSpacing: 0.3 }}>{item.key}</div>
                    <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 600, fontSize: 12, color: C.dark, lineHeight: 1.4 }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Adventure Map */}
        <Reveal delay={0.1}>
          <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.turquoise, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>What's Planned</div>
        </Reveal>
        <AdventureMap />
      </section>
```

- [ ] **Step 2: Verify the About the Holiday section renders**

Open http://localhost:5173/ and scroll past the hero. The new "About the Holiday" section should appear with hotel highlights, travel info grid, and the adventure map. Tap the map pins to confirm expand/collapse works.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add About the Holiday section with hotel info, travel details, and adventure map"
```

---

### Task 4: Update the Players section ID and labels

**Files:**
- Modify: `src/App.jsx` (crew section, around line 600)

- [ ] **Step 1: Update the crew section ID, subtitle, and heading**

Change the crew section opening tag and headings. Find:

```jsx
      <section id="crew" style={{ padding: "80px 0 60px", background: C.sand }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 36, padding: "0 24px" }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.coral, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>The Lineup</div>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>The Crew</h2>
          </div>
        </Reveal>
```

Replace with:

```jsx
      <section id="players" style={{ padding: "80px 0 60px", background: C.sand }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 36, padding: "0 24px" }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11, color: C.coral, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>The Lineup</div>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>Meet the Players</h2>
          </div>
        </Reveal>
```

- [ ] **Step 2: Verify nav scrolls to the updated section**

Open http://localhost:5173/, wait for the sticky nav to appear, and click "Meet the Players". It should scroll to the renamed crew section.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: rename crew section to Meet the Players"
```

---

### Task 5: Update the Challenges section label

**Files:**
- Modify: `src/App.jsx` (challenges section, around line 646)

- [ ] **Step 1: Update challenges section heading**

Find:

```jsx
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>The Gauntlet</h2>
            <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.textBody, marginTop: 8, fontWeight: 600 }}>Challenges to settle who really ran this trip</p>
```

Replace with:

```jsx
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(28px, 7vw, 48px)", color: C.dark }}>Learn the Game</h2>
            <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.textBody, marginTop: 8, fontWeight: 600 }}>The rules of engagement — challenges to settle who really ran this trip</p>
```

- [ ] **Step 2: Verify the section heading updated**

Open http://localhost:5173/ and scroll to the challenges section. It should say "Learn the Game".

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: rename challenges section to Learn the Game"
```

---

### Task 6: Remove standalone Hotel and Need to Know sections

**Files:**
- Modify: `src/App.jsx` (lines ~660-707)

- [ ] **Step 1: Delete the Resort section**

Remove the entire resort section (the `{/* ── RESORT ── */}` comment through its closing `</section>`):

```jsx
      {/* ── RESORT ──────────────────────────────────────────────────────── */}
      <section id="resort" style={{ padding: "80px 24px 60px", background: C.white }}>
        ...entire section...
      </section>
```

- [ ] **Step 2: Delete the Need to Know section**

Remove the entire need-to-know section (the `{/* ── NEED TO KNOW ── */}` comment through its closing `</section>`):

```jsx
      {/* ── NEED TO KNOW ────────────────────────────────────────────────── */}
      <section id="need-to-know" style={{ padding: "80px 24px 60px", background: C.sand }}>
        ...entire section...
      </section>
```

- [ ] **Step 3: Verify sections are gone and nothing is broken**

Open http://localhost:5173/ and scroll through the entire page. The flow should now be:
1. Hero
2. About the Holiday (hotel + travel info + adventure map)
3. Meet the Players (with presence chart)
4. Itinerary
5. Learn the Game (challenges + leaderboard)
6. CTA
7. Footer

No console errors. Nav links all work.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: remove standalone Hotel and Need to Know sections (now in About the Holiday)"
```

---

### Task 7: Reorder sections — move About the Holiday before Meet the Players

**Files:**
- Modify: `src/App.jsx` (main JSX return)

This task is a verification step. If Tasks 3-6 were done correctly, the section order in the JSX should already be:

1. Hero
2. About the Holiday (inserted in Task 3 after Hero)
3. Meet the Players (Task 4 renamed from crew)
4. Itinerary
5. Learn the Game (challenges)
6. CTA
7. Footer

- [ ] **Step 1: Verify section order in code**

Read through the App return JSX and confirm the sections appear in the correct order. If the About section ended up after the Players section instead of before it, cut and paste it to the correct position.

- [ ] **Step 2: Verify alternating background colors**

The sections should alternate backgrounds for visual rhythm:
- About the Holiday: `C.white`
- Meet the Players: `C.sand`
- Itinerary: `C.white`
- Learn the Game: `C.sand`
- CTA: `C.white`

If any adjacent sections share the same background, swap the odd one out.

- [ ] **Step 3: Full page walkthrough**

Open http://localhost:5173/ and do a complete scroll-through:
- Hero loads with countdown
- Sticky nav appears with 4 items: "About the Holiday", "Meet the Players", "Itinerary", "Learn the Game"
- Each nav item scrolls to its section
- Adventure map pins expand/collapse on tap
- Player cards open modal
- Presence chart shows correctly
- Day cards expand
- Challenges and leaderboard show
- CTA and footer at bottom

- [ ] **Step 4: Commit (if any fixes were needed)**

```bash
git add src/App.jsx
git commit -m "fix: verify section order and background alternation"
```
