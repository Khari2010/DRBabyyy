import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { loadSession, clearSession } from "../lib/session.js";
import { playerBySlug, PLAYERS } from "../data/players.js";
import { FORFEITS } from "../data/forfeits.js";
import { C } from "../data/colors.js";
import { RADIUS, SHADOW, SECTION, HEADING, BODY } from "../data/design.js";
import SectionHeader from "../components/SectionHeader.jsx";
import SectionBand from "../components/primitives/SectionBand.jsx";
import Card from "../components/primitives/Card.jsx";
import Reveal from "../components/Reveal.jsx";
import WheelOfFortune from "../components/games/WheelOfFortune.jsx";
import ScavengerHuntList from "../components/games/ScavengerHuntList.jsx";
import ChallengesGrouped from "../components/games/ChallengesGrouped.jsx";

function useGamesAssets() {
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

export default function GamesPage() {
  const navigate = useNavigate();
  const session = loadSession();

  const serverSession = useQuery(
    api.auth.getSession,
    session ? { token: session.token } : "skip",
  );
  const logoutMutation = useMutation(api.auth.logout);

  useGamesAssets();

  useEffect(() => {
    if (!session) {
      navigate("/", { replace: true });
      return;
    }
    if (serverSession === null) {
      clearSession();
      navigate("/", { replace: true });
    }
  }, [session, serverSession, navigate]);

  if (!session || serverSession === undefined) {
    return (
      <div
        style={{
          background: C.dark,
          color: C.white,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Nunito, sans-serif",
        }}
      >
        Loading…
      </div>
    );
  }
  if (serverSession === null) return null;

  const me = playerBySlug(session.slug);
  if (!me) return null;

  const handleLogout = async () => {
    try {
      await logoutMutation({ token: session.token });
    } catch {
      /* ignore */
    }
    clearSession();
    navigate("/", { replace: true });
  };

  return (
    <div
      style={{
        background: C.sand,
        minHeight: "100vh",
        fontFamily: "Nunito, sans-serif",
        overflowX: "hidden",
        lineHeight: 1.6,
      }}
    >
      <NavChip mySlug={me.slug} onLogout={handleLogout} navigate={navigate} />

      <Hero player={me} />

      <SectionBand bg="white">
        <Reveal>
          <SectionHeader
            label="Live Standings"
            title="Leaderboard"
            tagline="Goes live the moment we land. Track your climb."
            accent={C.gold}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <LeaderboardPlaceholder />
        </Reveal>
      </SectionBand>

      <SectionBand bg="sand">
        <Reveal>
          <SectionHeader
            label="Spin to Suffer"
            title="Wheel of Forfeits"
            tagline="Lowest scorer spins. Whatever it lands on, that's your fate."
            accent={C.coralDeep}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <WheelOfFortune />
        </Reveal>
      </SectionBand>

      <SectionBand bg="white">
        <Reveal>
          <SectionHeader
            label="Earn Your Points"
            title="Challenges"
            tagline="Filter by vibe. Self-report on your page, get vouched, climb the board."
            accent={C.coral}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <ChallengesGrouped />
        </Reveal>
      </SectionBand>

      <SectionBand bg="sand">
        <Reveal>
          <SectionHeader
            label="Daily Hunt"
            title="Scavenger Hunt"
            tagline="Find one of each — Food, Plant, Animal, Object. Bag the lot for 80 points."
            accent={C.turquoise}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <ScavengerHuntList />
        </Reveal>
      </SectionBand>

      <SectionBand bg="white">
        <Reveal>
          <SectionHeader
            label="The Pool"
            title="All Forfeits"
            tagline="14 ways to humble yourself. The wheel picks one at random."
            accent={C.purple}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <ForfeitsList />
        </Reveal>
      </SectionBand>

      <SectionBand bg="dark">
        <Reveal>
          <SectionHeader
            label="The Tape"
            title="Recent Claims"
            tagline="Live activity feed of who did what. Goes live on the trip."
            accent={C.gold}
            onDark
          />
        </Reveal>
        <Reveal delay={0.05}>
          <RecentClaimsPlaceholder />
        </Reveal>
      </SectionBand>

      <footer
        style={{
          textAlign: "center",
          padding: "16px 24px 24px",
          fontFamily: "Nunito, sans-serif",
          fontSize: 11,
          color: C.textBody,
          opacity: 0.4,
          fontWeight: 700,
          letterSpacing: 1,
          background: C.white,
        }}
      >
        DR BABYYY · LOCKED AREA · 🔒
      </footer>
    </div>
  );
}

function NavChip({ mySlug, onLogout, navigate }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 900,
        background: C.white,
        borderRadius: 999,
        padding: "6px 8px 6px 14px",
        boxShadow: SHADOW.floating,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "Nunito, sans-serif",
        fontWeight: 800,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <button
        onClick={() => navigate("/")}
        style={chipButtonStyle()}
      >
        ← Home
      </button>
      <span style={{ width: 1, height: 18, background: C.sandDark }} />
      <button
        onClick={() => navigate(`/player/${mySlug}`)}
        style={chipButtonStyle()}
      >
        My page
      </button>
      <span style={{ width: 1, height: 18, background: C.sandDark }} />
      <button onClick={onLogout} style={chipButtonStyle()}>
        Log out
      </button>
    </div>
  );
}

function chipButtonStyle() {
  return {
    background: "transparent",
    border: "none",
    color: C.textBody,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
    padding: "6px 4px",
    minHeight: 32,
  };
}

function Hero({ player }) {
  return (
    <section
      style={{
        padding: "clamp(80px, 14vw, 120px) clamp(16px, 4vw, 24px) clamp(48px, 10vw, 72px)",
        textAlign: "center",
        background: `linear-gradient(180deg, ${C.dark} 0%, ${C.darkSoft} 100%)`,
        color: C.white,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: `${C.gold}10`,
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -60,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `${C.coral}10`,
          filter: "blur(30px)",
        }}
      />
      <Reveal>
        <div
          style={{
            display: "inline-block",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            color: C.gold,
            background: `${C.gold}15`,
            padding: "6px 16px",
            borderRadius: 999,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          🔒 Locked area
        </div>
        <h1
          style={{
            ...HEADING.h1,
            color: C.white,
            margin: "0 0 12px",
          }}
        >
          The Games
        </h1>
        <p
          style={{
            maxWidth: 540,
            margin: "0 auto",
            color: "rgba(255,255,255,0.8)",
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.6,
          }}
        >
          Welcome in, {player.name}. Wheel, scoreboard, scavenger list, every
          challenge — all in one place. The board goes live the second we touch
          down in Punta Cana.
        </p>
      </Reveal>
    </section>
  );
}

function LeaderboardPlaceholder() {
  return (
    <Card>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 12,
          fontWeight: 700,
          color: C.textBody,
          textAlign: "center",
          marginBottom: 16,
          opacity: 0.7,
        }}
      >
        Scores go live on landing day. Until then, dream of glory.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PLAYERS.map((p, i) => (
          <div
            key={p.slug}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 14px",
              borderRadius: RADIUS.md,
              background: i === 0 ? `${C.gold}10` : C.sand,
              border: i === 0 ? `1px solid ${C.gold}40` : "1px solid transparent",
            }}
          >
            <div
              style={{
                fontFamily: "'Dela Gothic One', sans-serif",
                fontSize: 18,
                color: i === 0 ? C.gold : C.textBody,
                width: 24,
                textAlign: "center",
                opacity: i === 0 ? 1 : 0.5,
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                overflow: "hidden",
                boxShadow: `0 0 0 2px ${p.color}`,
                flexShrink: 0,
                background: C.white,
              }}
            >
              {p.avatar ? (
                <img
                  src={p.avatar}
                  alt={p.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center 15%",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                    fontSize: 18,
                  }}
                >
                  {p.emoji}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Dela Gothic One', sans-serif",
                  fontSize: 16,
                  color: C.dark,
                  lineHeight: 1.1,
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontSize: 11,
                  color: C.textBody,
                  fontWeight: 700,
                  opacity: 0.7,
                }}
              >
                {p.title}
              </div>
            </div>
            <div
              style={{
                fontFamily: "'Dela Gothic One', sans-serif",
                fontSize: 22,
                color: i === 0 ? C.gold : C.textBody,
                opacity: i === 0 ? 1 : 0.4,
              }}
            >
              —
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ForfeitsList() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {FORFEITS.map((f) => (
        <div
          key={f.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: RADIUS.md,
            background: C.white,
            border: `1px solid ${f.color}25`,
            boxShadow: SHADOW.card,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: f.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
              boxShadow: `0 4px 12px ${f.color}40`,
            }}
          >
            {f.icon}
          </div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 13,
              color: C.dark,
              lineHeight: 1.3,
            }}
          >
            {f.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentClaimsPlaceholder() {
  return (
    <Card dark style={{ padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📼</div>
      <div
        style={{
          ...HEADING.h3,
          color: C.white,
          fontSize: 22,
          marginBottom: 8,
        }}
      >
        Live feed lands on day one
      </div>
      <div
        style={{
          ...BODY,
          color: "rgba(255,255,255,0.6)",
          maxWidth: 460,
          margin: "0 auto",
        }}
      >
        Every claimed challenge, every vouch, every forfeit landed — live in
        order, with timestamps. So you can scroll back and remember what you
        signed up for.
      </div>
    </Card>
  );
}
