import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { PLAYERS } from "../data/players.js";
import { itemById } from "../data/scavenger.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import Pill from "./primitives/Pill.jsx";
import Avatar from "./primitives/Avatar.jsx";
import PhotoLightbox from "./PhotoLightbox.jsx";

const MEDAL = { 1: "🥇 1st", 2: "🥈 2nd" };

function rel(ms) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Row({ entry, onReject }) {
  const item = itemById(entry.scavengerItemId);
  const player = PLAYERS.find((p) => p.slug === entry.subjectSlug);
  const [confirm, setConfirm] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  return (
    <div style={{
      padding: "12px 14px", borderBottom: `1px solid ${C.sandDark}`,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <button
        type="button"
        onClick={() => entry.photoUrl && setLightbox(true)}
        style={{
          width: 56, height: 56, padding: 0, border: 0,
          borderRadius: RADIUS.sm, overflow: "hidden",
          background: C.sand, cursor: entry.photoUrl ? "zoom-in" : "default",
        }}
      >
        {entry.photoUrl
          ? <img src={entry.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 28, lineHeight: "56px" }}>{item?.icon}</span>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 14, color: C.dark }}>
          {item?.icon} {item?.name ?? entry.scavengerItemId}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody,
          marginTop: 4,
        }}>
          {player && <Avatar player={player} size="sm" />}
          <span>{player?.name ?? entry.subjectSlug}</span>
          <span>·</span>
          <strong style={{ color: C.green }}>+{entry.points}</strong>
          {entry.scavengerRank && MEDAL[entry.scavengerRank] && (
            <span>· {MEDAL[entry.scavengerRank]}</span>
          )}
          <span>· {rel(entry.createdAt)}</span>
        </div>
        {confirm && (
          <div style={{ marginTop: 8, fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.dark }}>
            Reject this find? Slide-up will retract bonus points.
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => onReject(entry._id)}
                style={{
                  padding: "4px 10px", borderRadius: RADIUS.sm,
                  background: C.coralDeep, color: C.white, border: 0,
                  fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12,
                  cursor: "pointer",
                }}
              >Confirm</button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                style={{
                  padding: "4px 10px", borderRadius: RADIUS.sm,
                  background: C.sand, color: C.textBody, border: `1px solid ${C.sandDark}`,
                  fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12,
                  cursor: "pointer",
                }}
              >Cancel</button>
            </div>
          </div>
        )}
      </div>
      {!confirm && entry.status !== "disputed" && (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          style={{
            padding: "6px 12px", borderRadius: RADIUS.sm,
            background: C.coralDeep, color: C.white, border: 0,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11,
            letterSpacing: 0.5, textTransform: "uppercase",
            cursor: "pointer",
          }}
        >Reject</button>
      )}
      {lightbox && entry.photoUrl && (
        <PhotoLightbox src={entry.photoUrl} alt={item?.name} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}

export default function AdminScavengerQueue() {
  const session = useSession();
  const token = session?.token;
  const [filter, setFilter] = useState("today");
  const reject = useMutation(api.entries.rejectScavenger);
  const activity = useQuery(
    api.leaderboard.getRecentActivity,
    token ? { token, limit: 200 } : "skip",
  ) ?? [];

  const { currentDailyKey } = useGameState();
  const scavengerRows = activity.filter((e) => e.type === "scavenger");
  const todays = scavengerRows.filter((e) => e.status !== "disputed" && e.dailyKey === currentDailyKey);
  const all = scavengerRows.filter((e) => e.status !== "disputed");
  const rejected = scavengerRows.filter((e) => e.status === "disputed");
  const rows = filter === "today" ? todays : filter === "rejected" ? rejected : all;

  const onReject = async (id) => {
    if (!token) return;
    try {
      await reject({ token, entryId: id });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Pill active={filter === "today"} accent={C.coralDeep} onClick={() => setFilter("today")}>
          Today ({todays.length})
        </Pill>
        <Pill active={filter === "all"} accent={C.coralDeep} onClick={() => setFilter("all")}>
          All ({all.length})
        </Pill>
        <Pill active={filter === "rejected"} accent={C.coralDeep} onClick={() => setFilter("rejected")}>
          Rejected ({rejected.length})
        </Pill>
      </div>
      <Card padding={0} style={{ overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{
            padding: 24, textAlign: "center",
            fontFamily: "Nunito, sans-serif", fontSize: 13, color: C.textBody,
          }}>Nothing to review.</div>
        ) : (
          rows.map((e) => <Row key={e._id} entry={e} onReject={onReject} />)
        )}
      </Card>
    </div>
  );
}
