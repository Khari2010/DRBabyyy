import { CHALLENGES, NEGATIVE_POINTS, FORFEITS } from "../data/challenges.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

// Top 6 challenges by points
const TOP_CHALLENGES = [...CHALLENGES].sort((a, b) => b.points - a.points).slice(0, 6);

function NegativePointsPanel() {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 24,
        padding: "24px 22px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        border: `1px solid ${C.coral}1A`,
        display: "flex",
        flexDirection: "column",
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
          marginBottom: 8,
        }}
      >
        Negative Points
      </div>
      <div
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 22,
          color: C.dark,
          marginBottom: 16,
          lineHeight: 1.1,
        }}
      >
        Don't be that one
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NEGATIVE_POINTS.map((n, i) => (
          <div
            key={n.action}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 0",
              borderTop: i > 0 ? `1px solid ${C.sandDark}` : "none",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: `${C.coral}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {n.icon}
            </div>
            <div
              style={{
                flex: 1,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                color: C.dark,
                lineHeight: 1.3,
              }}
            >
              {n.action}
            </div>
            <div
              style={{
                fontFamily: "'Dela Gothic One', sans-serif",
                fontSize: 16,
                color: C.coral,
                flexShrink: 0,
              }}
            >
              {n.points}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardPanel() {
  return (
    <div
      style={{
        background: `linear-gradient(145deg, ${C.darkSoft}, #3a3a55)`,
        borderRadius: 24,
        padding: "30px 26px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{
        position: "absolute", top: -30, right: -30,
        width: 120, height: 120, borderRadius: "50%",
        background: `${C.gold}12`, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -40, left: -40,
        width: 140, height: 140, borderRadius: "50%",
        background: `${C.coral}08`, pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🏆</div>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 24,
            color: C.white,
            marginBottom: 10,
            lineHeight: 1.1,
          }}
        >
          Leaderboard
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.55)",
            fontWeight: 600,
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          Live score tracking, daily rankings, and receipts for every challenge. Coming before we land.
        </div>

        {/* 3+3 grid of player avatars */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
            justifyItems: "center",
            margin: "0 auto 20px",
            maxWidth: 200,
          }}
        >
          {PLAYERS.map((p) => (
            <div
              key={p.id}
              style={{
                width: "100%",
                maxWidth: 48,
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                overflow: "hidden",
                border: p.mystery ? `2px dashed ${p.color}` : `2px solid ${p.color}`,
                boxShadow: `0 0 12px ${p.color}55`,
                background: p.mystery
                  ? `linear-gradient(135deg, ${C.purple}, ${C.pink})`
                  : C.sand,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {p.mystery ? (
                <span
                  style={{
                    fontFamily: "'Dela Gothic One', sans-serif",
                    fontSize: 22,
                    color: C.white,
                  }}
                >
                  {p.initial || "?"}
                </span>
              ) : p.avatar ? (
                <img
                  src={p.avatar}
                  alt={p.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
                />
              ) : (
                <span style={{ fontSize: 22 }}>{p.emoji}</span>
              )}
            </div>
          ))}
        </div>

        {/* Coming Soon pill */}
        <div
          style={{
            display: "inline-block",
            maxWidth: "100%",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            color: C.gold,
            background: `${C.gold}1A`,
            padding: "8px 20px",
            borderRadius: 14,
            letterSpacing: 2,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
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
        background: `${C.purple}12`,
        borderRadius: 24,
        padding: "24px 22px",
        border: `1px solid ${C.purple}22`,
        boxShadow: `0 10px 30px ${C.purple}15`,
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
          marginBottom: 8,
        }}
      >
        Daily Forfeits
      </div>
      <div
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 22,
          color: C.dark,
          marginBottom: 10,
          lineHeight: 1.1,
        }}
      >
        Lowest pays up
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 12,
          color: C.textBody,
          fontWeight: 600,
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        End of each day, the lowest scorer pulls one at random.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {FORFEITS.map((f) => (
          <span
            key={f}
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 700,
              fontSize: 11,
              color: C.purple,
              background: C.white,
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${C.purple}33`,
              boxShadow: `0 2px 6px ${C.purple}12`,
            }}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChallengeCard({ c, accent }) {
  return (
    <div
      style={{
        flex: "0 0 auto",
        width: 180,
        background: C.white,
        borderRadius: 20,
        padding: "20px 16px",
        boxShadow: `0 8px 24px ${accent}15`,
        border: `1px solid ${accent}22`,
        scrollSnapAlign: "start",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = `0 16px 32px ${accent}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = `0 8px 24px ${accent}15`;
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: `${accent}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          marginBottom: 14,
        }}
      >
        {c.icon}
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 14,
          color: C.dark,
          lineHeight: 1.25,
          minHeight: 36,
          marginBottom: 12,
        }}
      >
        {c.title}
      </div>
      <div
        style={{
          display: "inline-block",
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 14,
          color: C.white,
          background: accent,
          padding: "5px 12px",
          borderRadius: 12,
          boxShadow: `0 4px 12px ${accent}44`,
        }}
      >
        +{c.points}
      </div>
      {c.bonus && (
        <div
          style={{
            marginTop: 8,
            fontFamily: "Nunito, sans-serif",
            fontSize: 10,
            fontWeight: 800,
            color: C.green,
          }}
        >
          {c.bonus}
        </div>
      )}
    </div>
  );
}

export default function GamesOverview({ player }) {
  const accent = player.color;

  return (
    <div
      style={{
        display: "grid",
        gap: 24,
        width: "100%",
        margin: "0 auto",
        textAlign: "left",
      }}
    >
      <style>{`
        .games-no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      {/* 3-panel row — Learn the Game layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "stretch",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <NegativePointsPanel />
        <LeaderboardPanel />
        <ForfeitsPanel />
      </div>

      {/* Ways to Earn Points */}
      <div style={{ width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 11,
              color: C.gold,
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Ways to Earn Points
          </div>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: "clamp(22px, 4vw, 28px)",
              color: C.dark,
              lineHeight: 1.1,
            }}
          >
            Top challenges
          </div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: C.textBody,
              marginTop: 4,
            }}
          >
            Swipe through — the bigger the points, the wilder the ask.
          </div>
        </div>
        <div
          className="games-no-scrollbar"
          style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "10px 12px 16px",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            justifyContent: "flex-start",
          }}
        >
          {TOP_CHALLENGES.map((c) => (
            <ChallengeCard key={c.id} c={c} accent={accent} />
          ))}
        </div>
      </div>
    </div>
  );
}
