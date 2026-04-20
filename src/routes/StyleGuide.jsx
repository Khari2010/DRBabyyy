import { useEffect } from "react";
import { C } from "../data/colors.js";
import {
  RADIUS,
  SHADOW,
  SECTION,
  EYEBROW,
  HEADING,
  BODY,
  MICRO_LABEL,
  SECTION_ACCENTS,
} from "../data/design.js";
import { PLAYERS } from "../data/players.js";
import SectionHeader from "../components/SectionHeader.jsx";
import Reveal from "../components/Reveal.jsx";
import Countdown from "../components/Countdown.jsx";
import Card from "../components/primitives/Card.jsx";
import Avatar from "../components/primitives/Avatar.jsx";
import Pill from "../components/primitives/Pill.jsx";
import SectionBand from "../components/primitives/SectionBand.jsx";

// Loads the same fonts + reset styles the home + player pages rely on so
// the styleguide renders accurately when opened in isolation.
function useStyleGuideAssets() {
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Nunito:wght@400;600;700;800;900&display=swap";
    let link = document.querySelector(`link[data-punta-fonts]`);
    if (!link) {
      link = document.createElement("link");
      link.href = href;
      link.rel = "stylesheet";
      link.setAttribute("data-punta-fonts", "true");
      document.head.appendChild(link);
    }

    let style = document.querySelector(`style[data-punta-anim]`);
    if (!style) {
      style = document.createElement("style");
      style.setAttribute("data-punta-anim", "true");
      style.textContent = `
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{overflow-x:hidden}
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `;
      document.head.appendChild(style);
    }
  }, []);
}

// Fallback player so the page renders even if PLAYERS ever changes shape.
const DEMO_PLAYER =
  PLAYERS.find((p) => p.slug === "kai") ?? {
    name: "Demo",
    color: C.coral,
    emoji: "🎬",
    avatar: null,
  };

// Small local heading used between subsections inside a SectionBand.
function Sub({ children }) {
  return (
    <div
      style={{
        ...EYEBROW,
        color: C.textBody,
        marginTop: 40,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

// Neat label beneath swatches / samples.
function Caption({ children, onDark = false }) {
  return (
    <div
      style={{
        ...MICRO_LABEL,
        color: onDark ? "rgba(255,255,255,0.7)" : C.textBody,
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

export default function StyleGuide() {
  useStyleGuideAssets();

  const colorEntries = Object.entries(C);
  const accentEntries = Object.entries(SECTION_ACCENTS);

  return (
    <div style={{ background: C.sand, minHeight: "100vh" }}>
      {/* Hero / title band */}
      <SectionBand bg="white" pad={SECTION.pad}>
        <Reveal>
          <SectionHeader
            label="Internal — Design System"
            title="Design System — DR Babyyy"
            tagline="Every primitive, every token, all in one place. If a page drifts from this, that's the bug."
            accent={C.coral}
          />
        </Reveal>
      </SectionBand>

      {/* Palette */}
      <SectionBand bg="sand">
        <Reveal>
          <SectionHeader
            label="Palette"
            title="Colour tokens"
            tagline="Imported from src/data/colors.js as C — never hard-code hex."
            accent={C.turquoise}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 20,
            }}
          >
            {colorEntries.map(([name, hex]) => (
              <div key={name} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: RADIUS.md,
                    background: hex,
                    margin: "0 auto",
                    boxShadow: SHADOW.card,
                    border: "1px solid rgba(0,0,0,0.05)",
                  }}
                />
                <div
                  style={{
                    ...MICRO_LABEL,
                    color: C.dark,
                    marginTop: 10,
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 11,
                    color: C.textBody,
                    marginTop: 2,
                  }}
                >
                  {hex}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Sub>Section accents (by role)</Sub>
        <Reveal delay={0.05}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {accentEntries.map(([role, hex]) => (
              <div
                key={role}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  background: C.white,
                  borderRadius: RADIUS.pill,
                  boxShadow: SHADOW.card,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: hex,
                  }}
                />
                <div style={{ ...MICRO_LABEL, color: C.dark }}>{role}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </SectionBand>

      {/* Typography */}
      <SectionBand bg="white">
        <Reveal>
          <SectionHeader
            label="Typography"
            title="Type scale"
            tagline="Dela Gothic One for headings, Nunito for everything else."
            accent={C.coralDeep}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <Card>
            <div style={{ ...HEADING.h1, color: C.dark }}>Hero h1</div>
            <Caption>HEADING.h1 — clamp(52px, 14vw, 110px)</Caption>

            <div style={{ ...HEADING.h2, color: C.dark, marginTop: 28 }}>
              Section title h2
            </div>
            <Caption>HEADING.h2 — clamp(28px, 7vw, 48px)</Caption>

            <div style={{ ...HEADING.h3, color: C.dark, marginTop: 28 }}>
              Sub-heading h3
            </div>
            <Caption>HEADING.h3 — clamp(20px, 4vw, 28px)</Caption>

            <div style={{ ...EYEBROW, color: C.turquoise, marginTop: 28 }}>
              Eyebrow label
            </div>
            <Caption>EYEBROW — Nunito 900, 11px, letterSpacing 3</Caption>

            <div style={{ ...BODY, marginTop: 28 }}>
              Body copy sits in Nunito 15px with a 1.6 line-height and
              C.textBody colour. It's built to handle multi-line descriptions
              inside cards, section intros, and anywhere the reader needs to
              settle into a thought.
            </div>
            <Caption>BODY — Nunito 15px / 1.6 / C.textBody</Caption>

            <div style={{ ...MICRO_LABEL, color: C.dark, marginTop: 28 }}>
              Micro label pill text
            </div>
            <Caption>MICRO_LABEL — Nunito 800, 11px uppercase</Caption>
          </Card>
        </Reveal>
      </SectionBand>

      {/* Cards */}
      <SectionBand bg="sand">
        <Reveal>
          <SectionHeader
            label="Cards"
            title="Card variants"
            tagline="Neutral for anywhere, tinted for per-player surfaces, dark for contrast bands."
            accent={C.gold}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            <div>
              <Card>
                <div style={{ ...HEADING.h3, color: C.dark, fontSize: 20 }}>
                  Neutral
                </div>
                <div style={{ ...BODY, marginTop: 8 }}>
                  The default surface. White, soft shadow, 20px radius.
                </div>
              </Card>
              <Caption>&lt;Card /&gt;</Caption>
            </div>
            <div>
              <Card tint={DEMO_PLAYER.color}>
                <div style={{ ...HEADING.h3, color: C.dark, fontSize: 20 }}>
                  Tinted
                </div>
                <div style={{ ...BODY, marginTop: 8 }}>
                  Gradient wash + hairline border in the player's colour.
                </div>
              </Card>
              <Caption>
                &lt;Card tint={`{player.color}`} /&gt;
              </Caption>
            </div>
            <div>
              <div
                style={{
                  background: C.dark,
                  padding: 20,
                  borderRadius: RADIUS.lg,
                }}
              >
                <Card dark>
                  <div
                    style={{
                      ...HEADING.h3,
                      color: C.white,
                      fontSize: 20,
                    }}
                  >
                    Dark
                  </div>
                  <div
                    style={{
                      ...BODY,
                      color: "rgba(255,255,255,0.75)",
                      marginTop: 8,
                    }}
                  >
                    For cards nested inside dark section bands.
                  </div>
                </Card>
              </div>
              <Caption>&lt;Card dark /&gt;</Caption>
            </div>
          </div>
        </Reveal>
      </SectionBand>

      {/* Avatars */}
      <SectionBand bg="white">
        <Reveal>
          <SectionHeader
            label="Avatars"
            title="Avatar sizing"
            tagline="Same ring-and-shadow language at every size."
            accent={C.blue}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 40,
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            {["sm", "md", "lg", "hero"].map((size) => (
              <div key={size} style={{ textAlign: "center" }}>
                <Avatar player={DEMO_PLAYER} size={size} />
                <Caption>{size}</Caption>
              </div>
            ))}
          </div>
        </Reveal>
      </SectionBand>

      {/* Pills */}
      <SectionBand bg="sand">
        <Reveal>
          <SectionHeader
            label="Pills"
            title="Pills & chips"
            tagline="Interactive filter buttons; static as=span for labels."
            accent={C.coral}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <Card>
            <Sub>Interactive — inactive / active</Sub>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Pill onClick={() => {}}>Inactive</Pill>
              <Pill active accent={C.coral} onClick={() => {}}>
                Active coral
              </Pill>
              <Pill active accent={C.turquoise} onClick={() => {}}>
                Active turquoise
              </Pill>
              <Pill active accent={C.gold} onClick={() => {}}>
                Active gold
              </Pill>
              <Pill active accent={C.blue} onClick={() => {}}>
                Active blue
              </Pill>
              <Pill active accent={C.coralDeep} onClick={() => {}}>
                Active deep coral
              </Pill>
            </div>

            <Sub>Static (as="span")</Sub>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Pill as="span">Label</Pill>
              <Pill as="span" active accent={C.turquoise}>
                Confirmed
              </Pill>
              <Pill as="span" active accent={C.gold}>
                TBC
              </Pill>
            </div>
          </Card>
        </Reveal>
      </SectionBand>

      {/* Section examples — rhythm */}
      <SectionBand bg="white">
        <Reveal>
          <SectionHeader
            label="Section rhythm"
            title="Background bands"
            tagline="Alternate white / sand / dark. At least one dark band per long page."
            accent={C.purple}
          />
        </Reveal>
      </SectionBand>

      <SectionBand bg="white" pad={SECTION.padCompact}>
        <SectionHeader
          label="bg = white"
          title="White band"
          tagline="Crisp and clean — best for content-dense sections."
          accent={C.turquoise}
          compact
        />
      </SectionBand>

      <SectionBand bg="sand" pad={SECTION.padCompact}>
        <SectionHeader
          label="bg = sand"
          title="Sand band"
          tagline="Warm neutral — the default resting state."
          accent={C.coralDeep}
          compact
        />
      </SectionBand>

      <SectionBand bg="dark" pad={SECTION.padCompact}>
        <SectionHeader
          label="bg = dark"
          title="Dark band"
          tagline="Contrast anchor — use at least once per long page."
          accent={C.gold}
          onDark
          compact
        />
      </SectionBand>

      {/* Motion */}
      <SectionBand bg="sand">
        <Reveal>
          <SectionHeader
            label="Motion"
            title="Reveal on scroll"
            tagline="Wrap sections + grid children in <Reveal>. Easing: cubic-bezier(0.16,1,0.3,1), 0.8s."
            accent={C.green}
          />
        </Reveal>
        <Reveal delay={0.1}>
          <Card>
            <div style={{ ...HEADING.h3, color: C.dark, fontSize: 20 }}>
              Scroll to trigger
            </div>
            <div style={{ ...BODY, marginTop: 8 }}>
              This card is wrapped in &lt;Reveal delay={0.1}&gt;. When you
              scroll it into view it fades + slides up. Stagger grid children
              with delay = i * 0.05 for a gentle cascade.
            </div>
          </Card>
        </Reveal>
      </SectionBand>

      {/* Countdown */}
      <SectionBand bg="dark">
        <Reveal>
          <SectionHeader
            label="Countdown"
            title="Trip countdown"
            tagline="4-square digital clock. Default + compact."
            accent={C.yellow}
            onDark
          />
        </Reveal>
        <Reveal delay={0.05}>
          <Card dark style={{ padding: 32 }}>
            <div
              style={{
                ...MICRO_LABEL,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Default
            </div>
            <Countdown
              target={new Date(Date.now() + 1000 * 60 * 60 * 24 * 42)}
            />
            <div
              style={{
                ...MICRO_LABEL,
                color: "rgba(255,255,255,0.6)",
                margin: "32px 0 12px",
                textAlign: "center",
              }}
            >
              Compact
            </div>
            <Countdown
              target={new Date(Date.now() + 1000 * 60 * 60 * 24 * 42)}
              compact
            />
          </Card>
        </Reveal>
      </SectionBand>

      {/* Footer pointer */}
      <SectionBand bg="white" pad={SECTION.padCompact}>
        <Reveal>
          <div style={{ textAlign: "center", ...BODY }}>
            Adding to the site? Skim this page first. If a new component reads
            native here and on both /{" "}
            <span style={{ color: C.coral, fontWeight: 900 }}>home</span> and
            /player, you're aligned with the system.
          </div>
        </Reveal>
      </SectionBand>
    </div>
  );
}
