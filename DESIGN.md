# DR Babyyy — Design System

This doc captures the reconciled design system after the home ↔ player-page alignment pass (commit `776aba7`). The goal: every future section, card, pill, or avatar should read as though it was always part of the site.

When in doubt, open `/styleguide` (mounted at `src/routes/StyleGuide.jsx`) and check how the primitives render before adding a new pattern.

## 1. Palette

Colours live in `src/data/colors.js` and are always imported as `C`:

```js
import { C } from "../data/colors.js";
```

Never hard-code hex. The token names are purposeful — use them by role:

- **Brand accents**: `C.coral`, `C.coralDeep`, `C.turquoise`, `C.gold` — reserved for eyebrow labels, section accents, active pills, and the occasional glow.
- **Text**: `C.dark` for headings on light backgrounds, `C.textBody` for body copy, `C.white` for text on dark bands.
- **Backgrounds**: `C.sand` (warm neutral, default) and `C.white` (crisp) alternate across the page. `C.sandDark` is used sparingly for tonal depth.
- **Dark section**: `C.dark` for the page background, `C.darkSoft` for cards nested inside that band.
- **Player accents**: each player carries their own hex (`player.color`) — use it for the tinted card variant, the avatar ring, and personal touches, never for section chrome.

## 2. Typography

Fonts are loaded once at route mount via a Google Fonts `<link>` tag:

- `'Dela Gothic One'` — all display headings (h1, h2, h3).
- `Nunito` — everything else: body, eyebrow, micro labels, pill text.

### Scale

| Role | Tokens | Size | Line height | Notes |
|---|---|---|---|---|
| Hero h1 | `HEADING.h1` | `clamp(52px, 14vw, 110px)` | 0.9 | Dela Gothic, typically `C.white` on hero |
| Section title h2 | `HEADING.h2` | `clamp(28px, 7vw, 48px)` | 1.1 | Dela Gothic, `C.dark` (or `C.white` on dark bands) |
| Sub-heading h3 | `HEADING.h3` | `clamp(20px, 4vw, 28px)` | 1.2 | Dela Gothic, used for card titles |
| Eyebrow label | `EYEBROW` | 11px | — | Nunito 900, letterSpacing 3, uppercase, **coloured text only** (section accent). No background. |
| Body | `BODY` | 15px | 1.6 | Nunito, `C.textBody` |
| Micro label | `MICRO_LABEL` | 11px | — | Nunito 800, letterSpacing 0.5, uppercase. Used in pills, chips, small captions. |

Never drop below 12px except for uppercase micro-labels.

## 3. Spacing & layout

Import from `SECTION` in `src/data/design.js`:

- **Section outer band**: `padding: "80px 0 60px"` (`SECTION.pad`). Compact alternative: `"60px 0 40px"` (`SECTION.padCompact`).
- **Section inner content**: `maxWidth` picked by density — `720` for text-heavy reading, `960` for default, `1100` for dashboards / grids (`SECTION.maxWidthNarrow` / `Default` / `Wide`). Centre with `margin: "0 auto"` and `padding: "0 24px"` (`SECTION.innerPad`).
- **Card internal padding**: 20px (the `<Card>` primitive defaults to this).
- **Stack gap**: 16–20px between cards in a grid; 10–14px between micro-items inside a card.

## 4. Cards

Three variants. Use the `<Card>` primitive from `src/components/primitives/Card.jsx` — don't re-implement.

- **Neutral**: `background: C.white, borderRadius: 20, padding: "20px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)"` — default everywhere.
- **Accent (player-tinted)**: `background: linear-gradient(170deg, C.white 0%, ${player.color}08 100%), border: 1px solid ${player.color}25, boxShadow: 0 4px 20px ${player.color}15, borderRadius: 20`. Use only for per-player surfaces.
- **Dark**: `background: C.darkSoft, color: C.white, borderRadius: 20` — for cards nested inside a `<SectionBand bg="dark">`.

## 5. Avatars

Use the `<Avatar player={...} size="..." />` primitive. All sizes share the same ring-and-shadow language — only the radius + shadow intensity scale.

- **Hero** (150px): `4px solid player.color` border + `boxShadow: 0 8px 24px ${player.color}40, 0 0 0 6px C.white`.
- **Large** (56px): no border, `boxShadow: 0 0 0 2px player.color`.
- **Medium** (32px, crew pills): same 2px ring treatment.
- **Small** (24px, list items): same 2px ring treatment.

## 6. Pills / chips

- **Eyebrow pill label** (section header): Nunito 900, 11px, letterSpacing 3, uppercase, **no background** — just coloured text. Matches the home-page `<SectionHeader>` pattern.
- **Coloured badge pill** (small status labels): `padding: "4px 14px", borderRadius: 10, background: accentColor, color: C.white, fontSize: 10, letterSpacing: 1.5`. Used sparingly.
- **Interactive pill button** (filter / toggle): `padding: "6px 14px", borderRadius: 20, Nunito 800, 11px, letterSpacing 0.5`.
  - Active: `background: accent, color: C.white`.
  - Inactive: `background: "rgba(0,0,0,0.04)", color: C.textBody`.

  Use the `<Pill>` primitive from `src/components/primitives/Pill.jsx`.

## 7. Motion

- Wrap each section header and section body in `<Reveal>` (from `src/components/Reveal.jsx`). The wrapper fades + translates on scroll into view.
- Stagger grid children with `<Reveal delay={i * 0.05}>`.
- Easing is fixed: `cubic-bezier(0.16,1,0.3,1)`, duration `0.8s`.
- Don't add fresh animation primitives without checking whether `<Reveal>` already handles the need.

## 8. Sections & rhythm

- Backgrounds alternate `C.white` / `C.sand` / `C.dark`. At least one dark band per long page for contrast.
- Each reconciled section carries a stable `accent` colour:
  - **About** → `C.turquoise`
  - **Adventures** → `C.coralDeep`
  - **Itinerary** → `C.coral`
  - **Game** → `C.gold`
  - **Crew** → `C.blue`

  These are the current player-page assignments — keep them stable so home + player stay synchronised.

- Use the `<SectionBand bg="white|sand|dark">` primitive for the background layer; it also handles standard padding and inner max-width.

## 9. Checklist for adding a new section / component

1. Start with `<SectionBand accent={...}>` + `<SectionHeader>`.
2. Wrap the header and the body in `<Reveal>`; stagger grid children.
3. Use primitives (`<Card>`, `<Pill>`, `<Avatar>`, `<SectionBand>`) from `src/components/primitives/*`.
4. Reference tokens from `src/data/design.js` (`RADIUS`, `SHADOW`, `SECTION`, `HEADING`, `BODY`, `EYEBROW`, `MICRO_LABEL`, `SECTION_ACCENTS`) — never hard-code radii, shadows, or font stacks inline.
5. Check both pages (home + player) to ensure the new element reads native to both.
6. If you're adding to the site, scan the `/styleguide` route first — it renders every primitive in use and catches drift.

## See it live

Visit `/styleguide` (both locally and on prod) to see every primitive rendered in place. When something on a page drifts from the styleguide, that's the bug.
