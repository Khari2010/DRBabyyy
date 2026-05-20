import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PLAYERS } from "../data/players.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import { C } from "../data/colors.js";
import { RADIUS, HEADING, BODY, MICRO_LABEL } from "../data/design.js";
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

function ClaimRow({ claim }) {
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
      padding: "8px 0",
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
        fontFamily: "Nunito, sans-serif",
        fontSize: 13,
        color: C.dark,
        textDecoration: claim.status === "disputed" ? "line-through" : "none",
      }}>
        {claim.label}
      </div>
      <div style={{
        fontFamily: "Nunito, sans-serif",
        fontWeight: 700,
        fontSize: 11,
        color: statusColor,
        textTransform: "lowercase",
      }}>
        {statusLabel}
      </div>
    </div>
  );
}

export default function PlayerDayDrawer({ open, slug, dailyKey, dayLabel, onClose }) {
  const data = useQuery(
    api.players.getPlayerDay,
    open && slug ? { slug, dailyKey } : "skip",
  );
  const holidayMap = useHolidayNameMap();

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
            data.claims.map((c) => <ClaimRow key={c.entryId} claim={c} />)
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
            data.fouls.map((f) => <ClaimRow key={f.entryId} claim={f} />)
          )}
        </>
      )}
    </BottomSheet>
  );
}
