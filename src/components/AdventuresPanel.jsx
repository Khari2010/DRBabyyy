import { PLANNED_ACTIVITIES, UNPLANNED_ACTIVITIES } from "../data/activities.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import Reveal from "./Reveal.jsx";

function playerName(slug) {
  const p = PLAYERS.find((pl) => pl.slug === slug);
  return p?.name ?? slug;
}

function playerFor(slug) {
  return PLAYERS.find((pl) => pl.slug === slug);
}

function VoterAvatars({ slugs }) {
  if (!slugs.length) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: -4 }}>
      {slugs.slice(0, 4).map((s, i) => {
        const p = playerFor(s);
        if (!p) return null;
        return (
          <span
            key={s}
            title={p.name}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: `0 0 0 2px ${p.color}`,
              background: C.sand,
              display: "inline-block",
              marginLeft: i === 0 ? 0 : -4,
              border: `1.5px solid ${C.white}`,
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
              <span
                style={{
                  fontSize: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                }}
              >
                {p.emoji ?? p.name[0]}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function ActivityCard({ activity, myVote, likers, dislikers, onVote }) {
  const likeActive = myVote === "like";
  const dislikeActive = myVote === "dislike";

  const toggle = (target) => {
    if (myVote === target) onVote(null);
    else onVote(target);
  };

  const accent = activity.planned ? C.turquoise : C.coral;

  // Card treatment mirrors home: soft radius 20, light shadow, optional
  // player-colour tint for planned items vs coral dashed for unplanned.
  const cardStyle = activity.planned
    ? {
        background: `linear-gradient(170deg, ${C.white} 0%, ${C.turquoise}08 100%)`,
        border: `1px solid ${C.turquoise}25`,
        boxShadow: `0 4px 20px ${C.turquoise}12`,
      }
    : {
        background: `linear-gradient(170deg, ${C.white} 0%, ${C.coral}08 100%)`,
        border: `1px dashed ${C.coral}55`,
        boxShadow: `0 4px 20px ${C.coral}12`,
      };

  return (
    <div
      style={{
        ...cardStyle,
        borderRadius: 20,
        padding: "20px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `${accent}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {activity.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 16,
              color: C.dark,
              lineHeight: 1.2,
            }}
          >
            {activity.name}
          </div>
          {activity.planned && activity.day && (
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 10,
                color: accent,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              {activity.day}
            </div>
          )}
        </div>
      </div>

      <p
        style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 13,
          color: C.textBody,
          fontWeight: 600,
          lineHeight: 1.55,
          margin: "0 0 14px",
        }}
      >
        {activity.blurb}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => toggle("like")}
          style={{
            background: likeActive ? C.green : `${C.green}15`,
            color: likeActive ? C.white : C.green,
            border: "none",
            borderRadius: 14,
            padding: "6px 14px",
            minHeight: 34,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.3s ease",
          }}
          aria-pressed={likeActive}
        >
          <span>👍</span>
          <span>{likers.length}</span>
        </button>
        <button
          onClick={() => toggle("dislike")}
          style={{
            background: dislikeActive ? C.coralDeep : `${C.coralDeep}15`,
            color: dislikeActive ? C.white : C.coralDeep,
            border: "none",
            borderRadius: 14,
            padding: "6px 14px",
            minHeight: 34,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.3s ease",
          }}
          aria-pressed={dislikeActive}
        >
          <span>👎</span>
          <span>{dislikers.length}</span>
        </button>
      </div>

      {(likers.length > 0 || dislikers.length > 0) && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.textBody,
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          {likers.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <VoterAvatars slugs={likers} />
              <span>
                {likers
                  .slice(0, 3)
                  .map(playerName)
                  .join(", ")}
                {likers.length > 3 ? ` +${likers.length - 3}` : ""}
              </span>
            </span>
          )}
          {dislikers.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <VoterAvatars slugs={dislikers} />
              <span style={{ color: C.coralDeep }}>
                {dislikers
                  .slice(0, 3)
                  .map(playerName)
                  .join(", ")}
                {dislikers.length > 3 ? ` +${dislikers.length - 3}` : ""}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdventuresPanel({ mySlug, allVotes, onVote }) {
  const votesByActivity = new Map();
  for (const v of allVotes) {
    if (!votesByActivity.has(v.activityId)) votesByActivity.set(v.activityId, []);
    votesByActivity.get(v.activityId).push(v);
  }

  const renderList = (list, offset = 0) =>
    list.map((a, i) => {
      const rows = votesByActivity.get(a.id) ?? [];
      const likers = rows.filter((r) => r.vote === "like").map((r) => r.playerSlug);
      const dislikers = rows.filter((r) => r.vote === "dislike").map((r) => r.playerSlug);
      const mine = rows.find((r) => r.playerSlug === mySlug);
      return (
        <Reveal key={a.id} delay={(offset + i) * 0.05}>
          <ActivityCard
            activity={a}
            myVote={mine?.vote ?? null}
            likers={likers}
            dislikers={dislikers}
            onVote={(vote) => onVote(a.id, vote)}
          />
        </Reveal>
      );
    });

  return (
    <div>
      {/* On the plan */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 14px" }}>
        <span
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: C.white,
            background: C.turquoise,
            padding: "4px 10px",
            borderRadius: 10,
          }}
        >
          On the plan
        </span>
        <span
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.textBody,
            fontWeight: 600,
          }}
        >
          Already booked in
        </span>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {renderList(PLANNED_ACTIVITIES, 0)}
      </div>

      {/* Could add */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: "28px 0 14px",
        }}
      >
        <span
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: C.white,
            background: C.coral,
            padding: "4px 10px",
            borderRadius: 10,
          }}
        >
          Could add
        </span>
        <span
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.textBody,
            fontWeight: 600,
          }}
        >
          Vote it up to push it onto the itinerary
        </span>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {renderList(UNPLANNED_ACTIVITIES, PLANNED_ACTIVITIES.length)}
      </div>
    </div>
  );
}
