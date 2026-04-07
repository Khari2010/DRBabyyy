# Site Restructure — Game Competition Theme

## Overview

Restructure the DR Trip Tracker from an informational layout into a game/competition-themed experience. The trip is the game, the crew are the players, the challenges are the rules, and the itinerary is the schedule of play.

## Site Flow

### 1. Home (Hero)
- **No changes.** Keep the existing hero section with countdown, group photos, and trip intro.

### 2. About the Holiday
New section combining hotel info, travel details, and activity discovery. Replaces the old standalone "Hotel" and "Need to Know" sections.

**Sub-sections:**

#### Hotel Highlights
- Resort name: Royalton CHIC Punta Cana (5-star, all-inclusive)
- Key amenities: All Meals, Premium Drinks, Entertainment, Pools & Beach, Gym & Spa, WiFi
- Check-in (3:00 PM) / Check-out (12:00 PM)

#### Key Dates & Travel Info
- Flight dates overview (outbound 18 May / 19 May, returns staggered 25-29 May)
- Travel essentials pulled from existing TRIP_INFO data: timezone (AST, UTC-4, 5hrs behind UK), currency (DOP/USD), language (Spanish/English at resort), plug type (US Type A/B — adapter needed), emergency numbers

#### Adventure Map (Activity Discovery)
- Dark game-world styled map with glowing location pins for each planned activity
- Activities: Saona Island, Coco Bongo, Jamaican Party Boat, Scape Park, Dinner in the Sky, Altos de Chavon
- Tapping a pin expands a detail card showing: description, price range, which day it's on
- Visual style: dark background, colored glowing pins, quest-map aesthetic

### 3. Meet the Players
- Existing crew/player cards section (PLAYERS data with avatars, titles, bios)
- **Presence chart stays here** — the "who's there when" visualization (PRESENCE data)
- Section label changes from "The Crew" to "Meet the Players"

### 4. Itinerary
- **No changes for now.** Keep existing day-by-day timeline (DAYS data)
- Interactive enhancements planned for a future iteration

### 5. Learn the Game
- Challenges section, relabeled from "Challenges" to "Learn the Game"
- Current CHALLENGES data stays as placeholder
- User will provide expanded content/documentation for this section later

## Navigation
Update NAV_ITEMS to match new flow and labels:
```
1. "About the Holiday"  → id: "about"
2. "Meet the Players"   → id: "players"
3. "Itinerary"          → id: "itinerary"
4. "Learn the Game"     → id: "challenges"
```

## What Gets Removed
- **Hotel section** (id: "resort") — absorbed into "About the Holiday"
- **Need to Know section** (id: "need-to-know") — absorbed into "About the Holiday"
- Associated NAV_ITEMS entries for "Hotel" and "Need to Know"

## What Gets Moved
- RESORT data → "About the Holiday" > Hotel Highlights
- TRIP_INFO data → "About the Holiday" > Key Dates & Travel Info
- FLIGHTS overview → "About the Holiday" > Key Dates (summary only; detailed flight info stays in itinerary day entries)
- Presence chart remains in "Meet the Players" (not moved to About)

## Data Changes
- No new external data sources needed
- All content comes from existing data constants (RESORT, TRIP_INFO, FLIGHTS, DAYS, CHALLENGES, PLAYERS, PRESENCE)
- New: ACTIVITIES array extracted from DAYS for the adventure map pins (Saona Island, Coco Bongo, Party Boat, Scape Park, Dinner in the Sky, Altos de Chavon)

## Technical Notes
- Single-file app (App.jsx) — all changes happen there
- Existing component patterns: Reveal (scroll animations), StickyNav (scroll-spy nav)
- Adventure map is a new component built with CSS grid, inline styles (matching existing patterns), and click-to-expand interaction
