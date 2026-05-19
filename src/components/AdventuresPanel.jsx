import { useState } from "react";
import { PLANNED_ACTIVITIES, UNPLANNED_ACTIVITIES } from "../data/activities.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

function playerName(slug) {
  const p = PLAYERS.find((pl) => pl.slug === slug);
  return p?.name ?? slug;
}

function voteStyle(active, color) {
  return {
    padding: "6px 12px", borderRadius: 8, border: 0,
    background: active ? color : "rgba(0,0,0,0.05)",
    color: active ? C.white : C.dark,
    fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12,
    cursor: "pointer",
  };
}

export default function AdventuresPanel({ mySlug, allVotes, onVote }) {
  const [expandedId, setExpandedId] = useState(null);

  const votesByActivity = new Map();
  for (const v of allVotes) {
    if (!votesByActivity.has(v.activityId)) votesByActivity.set(v.activityId, []);
    votesByActivity.get(v.activityId).push(v);
  }

  const renderList = (list) =>
    list.map((a) => {
      const rows = votesByActivity.get(a.id) ?? [];
      const likers = rows.filter((r) => r.vote === "like").map((r) => r.playerSlug);
      const dislikers = rows.filter((r) => r.vote === "dislike").map((r) => r.playerSlug);
      const mine = rows.find((r) => r.playerSlug === mySlug);
      const myVote = mine?.vote ?? null;
      const likeCount = likers.length;
      const dislikeCount = dislikers.length;

      return (
        <div key={a.id}>
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", background: "transparent", border: 0,
              borderBottom: `1px solid ${C.sandDark}`, cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{a.icon ?? "📍"}</span>
            <span style={{
              flex: 1, fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 14, color: C.dark,
            }}>{a.name}</span>
            {a.day && (
              <span style={{
                fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10, letterSpacing: 0.5,
                textTransform: "uppercase", color: C.textBody,
              }}>
                {a.day}
              </span>
            )}
            <span style={{
              fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10, letterSpacing: 0.5,
              textTransform: "uppercase",
              color: a.planned ? C.turquoise : C.coral,
            }}>
              {a.planned ? "Booked" : "Planning"}
            </span>
            <span style={{ color: C.textBody }}>{expandedId === a.id ? "▴" : "▾"}</span>
          </button>

          {expandedId === a.id && (
            <div style={{
              padding: "12px 16px 16px",
              background: C.sand,
              fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.dark,
            }}>
              {a.blurb && <div style={{ marginBottom: 6 }}>{a.blurb}</div>}
              {a.link && (
                <a href={a.link} target="_blank" rel="noreferrer"
                  style={{ color: C.coralDeep, textDecoration: "underline" }}>
                  More info ↗
                </a>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => onVote(a.id, myVote === "like" ? null : "like")}
                  style={voteStyle(myVote === "like", C.green)}
                >
                  👍 Yes ({likeCount})
                </button>
                <button
                  type="button"
                  onClick={() => onVote(a.id, myVote === "dislike" ? null : "dislike")}
                  style={voteStyle(myVote === "dislike", C.coralDeep)}
                >
                  👎 No ({dislikeCount})
                </button>
              </div>
              {(likers.length > 0 || dislikers.length > 0) && (
                <div style={{
                  marginTop: 10,
                  fontFamily: "Nunito, sans-serif", fontSize: 11, color: C.textBody, fontWeight: 700,
                }}>
                  {likers.length > 0 && (
                    <span>
                      👍 {likers.slice(0, 3).map(playerName).join(", ")}
                      {likers.length > 3 ? ` +${likers.length - 3}` : ""}
                    </span>
                  )}
                  {likers.length > 0 && dislikers.length > 0 && "  ·  "}
                  {dislikers.length > 0 && (
                    <span style={{ color: C.coralDeep }}>
                      👎 {dislikers.slice(0, 3).map(playerName).join(", ")}
                      {dislikers.length > 3 ? ` +${dislikers.length - 3}` : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
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
      <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.sandDark}` }}>
        {renderList(PLANNED_ACTIVITIES)}
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
      <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.sandDark}` }}>
        {renderList(UNPLANNED_ACTIVITIES)}
      </div>
    </div>
  );
}
