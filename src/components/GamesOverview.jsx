import { CHALLENGES, NEGATIVE_POINTS } from "../data/challenges.js";
import { FORFEITS } from "../data/forfeits.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import Reveal from "./Reveal.jsx";

// Top 6 challenges by points
const TOP_CHALLENGES = [...CHALLENGES].sort((a, b) => b.points - a.points).slice(0, 6);

// Card treatments match home's "Learn the Game" section exactly.
function NegativePointsPanel() {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 20,
        padding: "20px 20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 11,
          color: C.coral,
          letterSpacing: 3,
          textTransform: "uppercase",
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        Negative Points
      </div>
      {NEGATIVE_POINTS.map((n, i) => (
        <div
          key={n.action}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 0",
            borderTop: i > 0 ? "1px solid #f0f0f0" : "none",
          }}
        >
          <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{n.icon}</span>
          <div
            style={{
              flex: 1,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: C.dark,
              lineHeight: 1.4,
            }}
          >
            {n.action}
          </div>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 14,
              color: C.coral,
              flexShrink: 0,
            }}
          >
            {n.points}
          </div>
        </div>
      ))}
    </div>
  );
}

// Pixel-match to home's Leaderboard teaser: dark gradient card + trophy +
// player avatars + "Coming Soon" pill.
function LeaderboardPanel() {
  return (
    <div
      style={{
        background: `linear-gradient(145deg, ${C.dark}, ${C.darkSoft})`,
        borderRadius: 24,
        padding: "32px 24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: `${C.gold}10`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -30,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `${C.coral}08`,
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🏆</div>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 18,
            color: C.white,
            marginBottom: 8,
          }}
        >
          Leaderboard
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            fontWeight: 600,
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          Live score tracking, personal logins, and challenge completion — all coming before we land.
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {PLAYERS.map((p) => (
            <div
              key={p.id}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                overflow: "hidden",
                border: p.mystery ? `2px dashed ${p.color}` : `2px solid ${p.color}`,
                boxShadow: `0 0 8px ${p.color}40`,
                background: p.mystery
                  ? `linear-gradient(135deg, ${C.purple}, ${C.pink})`
                  : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {p.mystery ? (
                <span
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: 18,
                    color: C.white,
                  }}
                >
                  {p.initial || "?"}
                </span>
              ) : p.avatar ? (
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
                <span style={{ fontSize: 18 }}>{p.emoji}</span>
              )}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "inline-block",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            color: C.gold,
            background: `${C.gold}15`,
            padding: "8px 20px",
            borderRadius: 14,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Coming Soon
        </div>
      </div>
    </div>
  );
}

function ForfeitsPanel() {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 20,
        padding: "20px 20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 11,
          color: C.purple,
          letterSpacing: 3,
          textTransform: "uppercase",
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        Daily Forfeits
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 11,
          fontWeight: 600,
          color: C.textBody,
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        Lowest scorer picks one at random
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          justifyContent: "center",
        }}
      >
        {FORFEITS.map((f) => (
          <div
            key={f.id}
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 700,
              fontSize: 11,
              color: C.purple,
              background: `${C.purple}08`,
              padding: "6px 12px",
              borderRadius: 10,
              border: `1px solid ${C.purple}15`,
            }}
          >
            {f.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChallengeCard({ challenge }) {
  return (
    <div
      style={{
        width: 150,
        flex: "0 0 auto",
        borderRadius: 18,
        background: C.white,
        padding: "16px 12px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        textAlign: "center",
        scrollSnapAlign: "center",
      }}
    >
      <div style={{ fontSize: 28 }}>{challenge.icon}</div>
      <div
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 11,
          color: C.dark,
          lineHeight: 1.3,
        }}
      >
        {challenge.title}
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 10,
          color: C.gold,
          background: `${C.gold}15`,
          padding: "3px 10px",
          borderRadius: 10,
          letterSpacing: 0.5,
          marginTop: "auto",
        }}
      >
        {challenge.points} pts
      </div>
      {challenge.bonus && (
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 9,
            fontWeight: 700,
            color: C.green,
          }}
        >
          {challenge.bonus}
        </div>
      )}
    </div>
  );
}

export default function GamesOverview() {
  return (
    <div>
      <style>{`
        .games-no-scrollbar::-webkit-scrollbar { display: none; }
        .games-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 3-panel row — mirrors home's "Learn the Game" layout */}
      <Reveal delay={0.1}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
            alignItems: "start",
            marginBottom: 32,
          }}
        >
          <NegativePointsPanel />
          <LeaderboardPanel />
          <ForfeitsPanel />
        </div>
      </Reveal>

      {/* Challenge carousel — matches home exactly */}
      <Reveal delay={0.15}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 11,
              color: C.gold,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Ways to Earn Points
          </div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.55)",
              marginTop: 4,
            }}
          >
            Swipe through the challenges
          </div>
        </div>
      </Reveal>
      <div
        className="games-no-scrollbar"
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          padding: "8px 0 24px",
          scrollSnapType: "x mandatory",
        }}
      >
        {TOP_CHALLENGES.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.04} style={{ flex: "0 0 auto" }}>
            <ChallengeCard challenge={c} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
