import { PLANNED_ACTIVITIES, UNPLANNED_ACTIVITIES } from "../data/activities.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

function playerName(slug) {
  const p = PLAYERS.find((pl) => pl.slug === slug);
  return p?.name ?? slug;
}

function ActivityCard({ activity, myVote, likers, dislikers, onVote }) {
  const likeActive = myVote === "like";
  const dislikeActive = myVote === "dislike";

  const toggle = (target) => {
    if (myVote === target) onVote(null);
    else onVote(target);
  };

  const accent = activity.planned ? C.turquoise : C.coral;

  return (
    <div style={{
      background: C.white,
      borderRadius: 20,
      padding: "20px 22px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      border: activity.planned ? `1px solid ${C.turquoise}1A` : `2px dashed ${C.coral}55`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${accent}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, flexShrink: 0,
        }}>
          {activity.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 15, color: C.dark }}>
            {activity.name}
          </div>
          {activity.planned && (
            <div style={{ fontSize: 11, color: C.textBody, fontWeight: 600 }}>{activity.day}</div>
          )}
        </div>
      </div>

      <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.textBody, lineHeight: 1.5, margin: "0 0 12px" }}>
        {activity.blurb}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => toggle("like")}
          style={{
            background: likeActive ? C.green : C.white,
            color: likeActive ? C.white : C.dark,
            border: `2px solid ${likeActive ? C.green : C.sandDark}`,
            borderRadius: 999,
            padding: "10px 14px",
            minHeight: 40,
            minWidth: 64,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
          aria-pressed={likeActive}
        >
          <span>👍</span>
          <span>{likers.length}</span>
        </button>
        <button
          onClick={() => toggle("dislike")}
          style={{
            background: dislikeActive ? C.coralDeep : C.white,
            color: dislikeActive ? C.white : C.dark,
            border: `2px solid ${dislikeActive ? C.coralDeep : C.sandDark}`,
            borderRadius: 999,
            padding: "10px 14px",
            minHeight: 40,
            minWidth: 64,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
          aria-pressed={dislikeActive}
        >
          <span>👎</span>
          <span>{dislikers.length}</span>
        </button>
      </div>

      {(likers.length > 0 || dislikers.length > 0) && (
        <div style={{ marginTop: 10, fontSize: 12, color: C.textBody, lineHeight: 1.5, wordBreak: "break-word" }}>
          {likers.length > 0 && (
            <span>👍 {likers.map(playerName).join(", ")}</span>
          )}
          {likers.length > 0 && dislikers.length > 0 && <span style={{ margin: "0 6px" }}>·</span>}
          {dislikers.length > 0 && (
            <span>👎 {dislikers.map(playerName).join(", ")}</span>
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

  const render = (list) =>
    list.map((a) => {
      const rows = votesByActivity.get(a.id) ?? [];
      const likers = rows.filter((r) => r.vote === "like").map((r) => r.playerSlug);
      const dislikers = rows.filter((r) => r.vote === "dislike").map((r) => r.playerSlug);
      const mine = rows.find((r) => r.playerSlug === mySlug);
      return (
        <ActivityCard
          key={a.id}
          activity={a}
          myVote={mine?.vote ?? null}
          likers={likers}
          dislikers={dislikers}
          onVote={(vote) => onVote(a.id, vote)}
        />
      );
    });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
        <span style={{
          fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10, letterSpacing: 1.5,
          textTransform: "uppercase", color: C.white, background: C.turquoise,
          padding: "4px 10px", borderRadius: 10,
        }}>
          On the plan
        </span>
        <span style={{ fontSize: 12, color: C.textBody }}>Already booked in</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {render(PLANNED_ACTIVITIES)}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px 0 10px" }}>
        <span style={{
          fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10, letterSpacing: 1.5,
          textTransform: "uppercase", color: C.white, background: C.coral,
          padding: "4px 10px", borderRadius: 10,
        }}>
          Could add
        </span>
        <span style={{ fontSize: 12, color: C.textBody }}>Vote it up to push it onto the itinerary</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {render(UNPLANNED_ACTIVITIES)}
      </div>
    </div>
  );
}
