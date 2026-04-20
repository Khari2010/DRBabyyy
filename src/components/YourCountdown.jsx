import { FLIGHTS } from "../data/flights.js";
import { C } from "../data/colors.js";

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// Parse "18 May" → Date in 2026.
function parseTripDate(str) {
  if (!str) return null;
  const [dayStr, monStr] = str.split(" ");
  const day = Number(dayStr);
  const month = MONTHS[monStr];
  if (Number.isNaN(day) || month === undefined) return null;
  return new Date(2026, month, day);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function wholeDaysBetween(fromDate, toDate) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.floor((toDate - fromDate) / MS_PER_DAY);
}

function computeState(player) {
  const outbound = FLIGHTS.find(
    (f) => f.type === "Outbound" && f.who.includes(player.name),
  );
  const ret = FLIGHTS.find(
    (f) => f.type === "Return" && f.who.includes(player.name),
  );
  const outDate = parseTripDate(outbound?.date);
  const retDate = parseTripDate(ret?.date);
  const today = startOfToday();

  if (!outDate) return { kind: "unknown" };

  if (today < outDate) {
    const days = wholeDaysBetween(today, outDate);
    return { kind: "before", days, outDate, retDate };
  }
  if (retDate && today <= retDate) {
    return { kind: "during", outDate, retDate };
  }
  return { kind: "after", outDate, retDate };
}

export default function YourCountdown({ player }) {
  const state = computeState(player);

  const cardStyle = {
    maxWidth: 540,
    margin: "0 auto",
    background: `linear-gradient(135deg, ${player.color}15, ${C.sand})`,
    border: `1px solid ${player.color}33`,
    borderRadius: 24,
    padding: "32px 24px",
    textAlign: "center",
    boxShadow: `0 8px 24px ${player.color}15`,
  };

  if (state.kind === "before") {
    const { days } = state;
    const bigNum = days === 0 ? "TODAY" : String(days);
    const labelText =
      days === 0 ? "You fly today!" : days === 1 ? "DAY TO GO" : "DAYS TO GO";
    return (
      <div style={cardStyle}>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: days === 0 ? "clamp(40px, 10vw, 64px)" : "clamp(56px, 16vw, 96px)",
            color: player.color,
            lineHeight: 1,
            textShadow: `0 4px 24px ${player.color}33`,
          }}
        >
          {bigNum}
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            letterSpacing: 3,
            color: C.textBody,
            textTransform: "uppercase",
          }}
        >
          {labelText}
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: "Nunito, sans-serif",
            fontSize: 13,
            color: C.textBody,
            fontWeight: 600,
          }}
        >
          Until you fly to Punta Cana
        </div>
      </div>
    );
  }

  if (state.kind === "during") {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🌴</div>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: "clamp(22px, 5.5vw, 30px)",
            color: C.dark,
            lineHeight: 1.2,
          }}
        >
          You're in Punta Cana right now
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: "Nunito, sans-serif",
            fontSize: 13,
            color: C.textBody,
            fontWeight: 600,
          }}
        >
          Soak it up — you earned this.
        </div>
      </div>
    );
  }

  if (state.kind === "after") {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💛</div>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: "clamp(22px, 5.5vw, 30px)",
            color: C.dark,
            lineHeight: 1.2,
          }}
        >
          Hope you had a blast
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: "Nunito, sans-serif",
            fontSize: 13,
            color: C.textBody,
            fontWeight: 600,
          }}
        >
          Until next time.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: "Nunito, sans-serif", color: C.textBody }}>
        Your flight details aren't locked in yet.
      </div>
    </div>
  );
}
