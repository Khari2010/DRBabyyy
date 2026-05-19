import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";

export default function EntryRow({ entry }) {
  const session = useSession();
  const token = session?.token;
  const mySlug = session?.slug;
  const vouch = useMutation(api.entries.vouch);
  const dispute = useMutation(api.entries.dispute);
  const challenges = useQuery(api.challenges.listActive) ?? [];
  const holidayMap = useHolidayNameMap();
  const playerName = (slug) => displayName(slug, holidayMap);

  const challenge = entry.challengeId
    ? challenges.find((c) => c.challengeId === entry.challengeId)
    : null;
  const isMine = mySlug && entry.subjectSlug === mySlug;
  const canReact = !!token && !entry.myReaction && entry.status === "active" && !isMine;

  const label = entry.type === "challenge"
    ? `${playerName(entry.subjectSlug)} claimed: ${challenge?.title ?? entry.challengeId} (${entry.points >= 0 ? "+" : ""}${entry.points})`
    : `${playerName(entry.subjectSlug)} got fouled: ${entry.negativeId} (${entry.points})`;

  const badge = entry.status === "verified" ? "🛡" : entry.status === "disputed" ? "⚠️" : null;

  return (
    <div style={{
      padding: 10,
      borderBottom: `1px solid ${C.sandDark}`,
      opacity: entry.status === "disputed" ? 0.5 : 1,
    }}>
      <div style={{
        textDecoration: entry.status === "disputed" ? "line-through" : "none",
      }}>
        {label} {badge}
      </div>
      {canReact && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button
            onClick={() => vouch({ token, entryId: entry._id }).catch((e) => alert(e.message))}
            style={{ padding: "4px 10px", borderRadius: 6, background: C.green, color: C.white, border: 0 }}
          >
            ✓ I saw it
          </button>
          <button
            onClick={() => dispute({ token, entryId: entry._id }).catch((e) => alert(e.message))}
            style={{ padding: "4px 10px", borderRadius: 6, background: C.coralDeep, color: C.white, border: 0 }}
          >
            ✗ Didn't happen
          </button>
        </div>
      )}
      {entry.myReaction && (
        <div style={{ fontSize: 11, color: C.textBody, marginTop: 4 }}>
          You {entry.myReaction === "vouch" ? "vouched" : "disputed"} this
        </div>
      )}
    </div>
  );
}
