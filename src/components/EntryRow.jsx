import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import Avatar from "./primitives/Avatar.jsx";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";

function playerForSlug(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

export default function EntryRow({ entry }) {
  const session = useSession();
  const token = session?.token;
  const mySlug = session?.slug;
  const vouch = useMutation(api.entries.vouch);
  const dispute = useMutation(api.entries.dispute);
  const challenges = useQuery(api.challenges.listActive) ?? [];
  const holidayMap = useHolidayNameMap();
  const playerName = (slug) => displayName(slug, holidayMap);

  const subject = playerForSlug(entry.subjectSlug);
  const challenge = entry.challengeId
    ? challenges.find((c) => c.challengeId === entry.challengeId)
    : null;
  const removeNegative = useMutation(api.entries.removeNegative);

  const isFoul = entry.type === "negative";
  const isMyFoulLogged = isFoul && mySlug && entry.appliedBySlug === mySlug;
  const isMyClaim = !isFoul && mySlug && entry.subjectSlug === mySlug;
  const isMyFoulReceived = isFoul && mySlug && entry.subjectSlug === mySlug;
  // Third parties get full vouch + dispute. Victim of a foul gets dispute only.
  const canVouch = !!token && !entry.myReaction && entry.status === "active"
    && !isMyClaim && !isMyFoulLogged && !isMyFoulReceived && entry.type !== "scavenger";
  const canDispute = !!token && !entry.myReaction && entry.status === "active"
    && !isMyClaim && !isMyFoulLogged && entry.type !== "scavenger";
  const canRemoveFoul = !!token && isMyFoulLogged && entry.status === "active";

  const label = entry.type === "challenge"
    ? `claimed: ${challenge?.title ?? entry.challengeId} (${entry.points >= 0 ? "+" : ""}${entry.points})`
    : entry.type === "scavenger"
    ? `found: ${entry.label ?? entry.scavengerItemId} (+${entry.points})`
    : `got fouled: ${entry.label ?? entry.negativeId} (${entry.points})`;

  const badge = entry.status === "verified"
    ? "🛡"
    : entry.status === "disputed"
    ? "⚠️"
    : entry.status === "pendingReview"
    ? "⏳"
    : null;
  const dimmed = entry.status === "disputed" || entry.status === "pendingReview";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      borderBottom: `1px solid ${C.sandDark}`,
      opacity: dimmed ? 0.5 : 1,
    }}>
      {subject && <Avatar player={subject} size="sm" />}
      {entry.type === "scavenger" && entry.photoUrl && (
        <img
          src={entry.photoUrl}
          alt=""
          style={{
            width: 36, height: 36, borderRadius: 8, objectFit: "cover",
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 13,
          color: C.dark,
          textDecoration: dimmed ? "line-through" : "none",
        }}>
          <strong>{playerName(entry.subjectSlug)}</strong> {label} {badge}
        </div>
        {(canVouch || canDispute) && (
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {canVouch && (
              <button
                onClick={() => vouch({ token, entryId: entry._id }).catch((e) => alert(e.message))}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: C.green,
                  color: C.white,
                  border: 0,
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                ✓ I saw it
              </button>
            )}
            {canDispute && (
              <button
                onClick={() => dispute({ token, entryId: entry._id }).catch((e) => alert(e.message))}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: C.coralDeep,
                  color: C.white,
                  border: 0,
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {isMyFoulReceived ? "✗ Dispute" : "✗ Didn't happen"}
              </button>
            )}
          </div>
        )}
        {canRemoveFoul && (
          <div style={{ marginTop: 6 }}>
            <button
              onClick={() => removeNegative({ token, entryId: entry._id }).catch((e) => alert(e.message))}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                background: "transparent",
                color: C.coralDeep,
                border: `1px solid ${C.coralDeep}`,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Undo foul
            </button>
          </div>
        )}
        {entry.myReaction && (
          <div style={{
            fontSize: 11,
            color: C.textBody,
            marginTop: 4,
            fontFamily: "Nunito, sans-serif",
          }}>
            You {entry.myReaction === "vouch" ? "vouched" : "disputed"} this
          </div>
        )}
      </div>
    </div>
  );
}
