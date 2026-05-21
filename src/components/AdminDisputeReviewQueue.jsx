import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import Avatar from "./primitives/Avatar.jsx";
import PhotoLightbox from "./PhotoLightbox.jsx";
import AdminToast from "./AdminToast.jsx";

function rel(ms) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function typeLabel(entry) {
  if (entry.type === "challenge") return "Challenge claim";
  if (entry.type === "scavenger") return "Scavenger find";
  if (entry.type === "negative") return "Foul logged";
  return entry.type;
}

function Row({ entry, onDecide, busy }) {
  const subject = PLAYERS.find((p) => p.slug === entry.subjectSlug);
  const logger = entry.appliedBySlug
    ? PLAYERS.find((p) => p.slug === entry.appliedBySlug)
    : null;
  const [lightbox, setLightbox] = useState(false);

  return (
    <div
      style={{
        padding: "12px 14px",
        borderBottom: `1px solid ${C.sandDark}`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {entry.photoUrl ? (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            style={{
              width: 48,
              height: 48,
              padding: 0,
              border: 0,
              borderRadius: RADIUS.sm,
              overflow: "hidden",
              background: C.sand,
              cursor: "zoom-in",
            }}
          >
            <img
              src={entry.photoUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </button>
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: RADIUS.sm,
              background: C.sand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            {entry.labelIcon || "⏳"}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 14,
              color: C.dark,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.labelIcon} {entry.label}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "Nunito, sans-serif",
              fontSize: 12,
              color: C.textBody,
              marginTop: 4,
              flexWrap: "wrap",
            }}
          >
            <span>{typeLabel(entry)}</span>
            <span>·</span>
            {subject && <Avatar player={subject} size="sm" />}
            <span>{subject?.name ?? entry.subjectSlug}</span>
            {logger && (
              <>
                <span>· by {logger.name}</span>
              </>
            )}
            <span>·</span>
            <strong style={{ color: entry.points >= 0 ? C.green : C.coralDeep }}>
              {entry.points >= 0 ? "+" : ""}
              {entry.points}
            </strong>
            <span>·</span>
            <span>👎 {entry.disputeCount}</span>
            {entry.vouchCount > 0 && (
              <>
                <span>·</span>
                <span>👍 {entry.vouchCount}</span>
              </>
            )}
            <span>·</span>
            <span>{rel(entry.resolvedAt ?? entry.createdAt)}</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => onDecide(entry._id, "restore")}
          disabled={busy}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: RADIUS.sm,
            background: C.green,
            color: C.white,
            border: 0,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          ✓ Restore
        </button>
        <button
          type="button"
          onClick={() => onDecide(entry._id, "remove")}
          disabled={busy}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: RADIUS.sm,
            background: C.coralDeep,
            color: C.white,
            border: 0,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          ✗ Remove
        </button>
      </div>
      {lightbox && entry.photoUrl && (
        <PhotoLightbox
          src={entry.photoUrl}
          alt={entry.label}
          onClose={() => setLightbox(false)}
        />
      )}
    </div>
  );
}

export default function AdminDisputeReviewQueue() {
  const session = useSession();
  const token = session?.token;
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const resolve = useMutation(api.entries.adminResolveDispute);
  const pending = useQuery(
    api.entries.adminListPendingReview,
    token ? { token } : "skip",
  ) ?? [];

  const onDecide = async (entryId, decision) => {
    if (!token || busy) return;
    setBusy(true);
    try {
      await resolve({ token, entryId, decision });
      setToast({
        kind: "success",
        message: decision === "remove" ? "Entry removed." : "Entry restored.",
      });
    } catch (err) {
      setToast({ kind: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminToast toast={toast} onDismiss={() => setToast(null)} />
      <Card padding={0} style={{ overflow: "hidden" }}>
        {pending.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              fontFamily: "Nunito, sans-serif",
              fontSize: 13,
              color: C.textBody,
            }}
          >
            Nothing awaiting review.
          </div>
        ) : (
          pending.map((e) => (
            <Row key={e._id} entry={e} onDecide={onDecide} busy={busy} />
          ))
        )}
      </Card>
    </div>
  );
}
