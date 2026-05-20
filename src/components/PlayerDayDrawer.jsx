import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { PLAYERS } from "../data/players.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import { C } from "../data/colors.js";
import { HEADING, BODY, MICRO_LABEL, RADIUS } from "../data/design.js";
import BottomSheet from "./primitives/BottomSheet.jsx";
import Avatar from "./primitives/Avatar.jsx";

function playerBySlug(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

function SectionTitle({ children }) {
  return (
    <div style={{
      ...MICRO_LABEL,
      color: C.textBody,
      marginTop: 18,
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function EmptyRow({ children }) {
  return (
    <div style={{
      fontFamily: "Nunito, sans-serif",
      fontSize: 13,
      color: C.textBody,
      padding: "8px 0",
    }}>
      {children}
    </div>
  );
}

function ActionButtons({ claim, mySlug, token }) {
  const vouch = useMutation(api.entries.vouch);
  const dispute = useMutation(api.entries.dispute);
  const removeNegative = useMutation(api.entries.removeNegative);

  if (!token || !mySlug) return null;
  if (claim.status !== "active") {
    if (claim.myReaction) {
      return (
        <div style={{
          fontSize: 10,
          color: C.textBody,
          fontFamily: "Nunito, sans-serif",
          fontStyle: "italic",
        }}>
          you {claim.myReaction === "vouch" ? "vouched" : "disputed"}
        </div>
      );
    }
    return null;
  }
  if (claim.myReaction) {
    return (
      <div style={{
        fontSize: 10,
        color: C.textBody,
        fontFamily: "Nunito, sans-serif",
        fontStyle: "italic",
      }}>
        you {claim.myReaction === "vouch" ? "vouched" : "disputed"}
      </div>
    );
  }
  if (claim.type === "scavenger") {
    return null;
  }

  const isFoul = claim.type === "negative";
  const isMyFoulLogged = isFoul && claim.appliedBySlug === mySlug;
  const isMyClaim = !isFoul && claim.subjectSlug === mySlug;
  const isMyFoulReceived = isFoul && claim.subjectSlug === mySlug;
  const canVouch = !isMyClaim && !isMyFoulLogged && !isMyFoulReceived;
  const canDispute = !isMyClaim && !isMyFoulLogged;
  const canRemove = isMyFoulLogged;

  if (canRemove) {
    return (
      <button
        type="button"
        onClick={() => removeNegative({ token, entryId: claim.entryId }).catch((e) => alert(e.message))}
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          background: "transparent",
          color: C.coralDeep,
          border: `1px solid ${C.coralDeep}`,
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 10,
          cursor: "pointer",
        }}
      >
        Undo
      </button>
    );
  }

  if (!canVouch && !canDispute) return null;

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {canVouch && (
        <button
          type="button"
          onClick={() => vouch({ token, entryId: claim.entryId }).catch((e) => alert(e.message))}
          title="Vouch"
          style={{
            width: 30,
            height: 26,
            borderRadius: 6,
            background: C.green,
            color: C.white,
            border: 0,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ✓
        </button>
      )}
      {canDispute && (
        <button
          type="button"
          onClick={() => dispute({ token, entryId: claim.entryId }).catch((e) => alert(e.message))}
          title={isMyFoulReceived ? "Dispute this foul" : "Didn't happen"}
          style={{
            width: 30,
            height: 26,
            borderRadius: 6,
            background: C.coralDeep,
            color: C.white,
            border: 0,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ✗
        </button>
      )}
    </div>
  );
}

function ClaimRow({ claim, mySlug, token }) {
  const statusLabel = claim.status === "verified"
    ? "verified"
    : claim.status === "disputed"
    ? "rejected"
    : "pending";
  const statusColor = claim.status === "verified"
    ? C.green
    : claim.status === "disputed"
    ? C.coralDeep
    : C.textBody;
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 0",
      borderBottom: `1px solid ${C.sandDark}`,
      opacity: claim.status === "disputed" ? 0.55 : 1,
    }}>
      <div style={{
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 14,
        color: claim.points >= 0 ? C.green : C.coralDeep,
        minWidth: 36,
      }}>
        {claim.points >= 0 ? "+" : ""}{claim.points}
      </div>
      {claim.photoUrl ? (
        <img
          src={claim.photoUrl}
          alt=""
          style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }}
        />
      ) : (
        <div style={{ fontSize: 18 }}>{claim.labelIcon}</div>
      )}
      <div style={{
        flex: 1,
        minWidth: 0,
        fontFamily: "Nunito, sans-serif",
        fontSize: 13,
        color: C.dark,
        textDecoration: claim.status === "disputed" ? "line-through" : "none",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {claim.label}
        <div style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 700,
          fontSize: 10,
          color: statusColor,
          textTransform: "lowercase",
          marginTop: 2,
        }}>
          {statusLabel}
        </div>
      </div>
      <ActionButtons claim={claim} mySlug={mySlug} token={token} />
    </div>
  );
}

export default function PlayerDayDrawer({ open, slug, dailyKey, dayLabel, onClose }) {
  const session = useSession();
  const token = session?.token;
  const mySlug = session?.slug;
  const data = useQuery(
    api.players.getPlayerDay,
    open && slug ? { slug, dailyKey, token } : "skip",
  );
  const holidayMap = useHolidayNameMap();
  const flowHistory = useQuery(api.flowVotes.getFlowHistory, {});
  const flowWins = flowHistory?.lifetime?.[slug] ?? 0;

  if (!open || !slug) {
    return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;
  }

  const player = playerBySlug(slug);
  const name = displayName(slug, holidayMap, player?.name);
  const loading = data === undefined;
  const vouchEntries = data
    ? Object.entries(data.vouchedBy).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 4,
      }}>
        {player && <Avatar player={player} size="md" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            ...HEADING.h3,
            color: C.dark,
            margin: 0,
          }}>
            {name}
          </div>
          {dayLabel && (
            <div style={{
              ...MICRO_LABEL,
              color: C.textBody,
              marginTop: 4,
            }}>
              {dayLabel}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 14, marginBottom: 4 }}>
        <div>
          <div style={{ ...MICRO_LABEL, color: C.textBody }}>Flow State wins</div>
          <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18, color: C.gold }}>
            👑 {flowWins}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ ...BODY, textAlign: "center", padding: 24 }}>
          Loading…
        </div>
      ) : (
        <>
          <SectionTitle>Claims</SectionTitle>
          {data.claims.length === 0 ? (
            <EmptyRow>No claims {dailyKey ? "today" : "yet"}.</EmptyRow>
          ) : (
            data.claims.map((c) => <ClaimRow key={c.entryId} claim={c} mySlug={mySlug} token={token} />)
          )}

          <SectionTitle>Vouches received</SectionTitle>
          {vouchEntries.length === 0 ? (
            <EmptyRow>No vouches yet.</EmptyRow>
          ) : (
            vouchEntries.map(([voucherSlug, count]) => (
              <div key={voucherSlug} style={{
                fontFamily: "Nunito, sans-serif",
                fontSize: 13,
                color: C.dark,
                padding: "6px 0",
                borderBottom: `1px solid ${C.sandDark}`,
              }}>
                <strong>{displayName(voucherSlug, holidayMap)}</strong>
                {" "}× {count}
              </div>
            ))
          )}

          <SectionTitle>Fouls</SectionTitle>
          {data.fouls.length === 0 ? (
            <EmptyRow>No fouls {dailyKey ? "today" : "yet"}.</EmptyRow>
          ) : (
            data.fouls.map((f) => <ClaimRow key={f.entryId} claim={f} mySlug={mySlug} token={token} />)
          )}
        </>
      )}
    </BottomSheet>
  );
}
