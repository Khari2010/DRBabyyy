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
    position: "relative",
    background: `linear-gradient(135deg, ${player.color}22, ${C.sand})`,
    border: `1px solid ${player.color}33`,
    borderRadius: 20,
    padding: "clamp(18px, 4vw, 24px) clamp(16px, 4vw, 22px)",
    textAlign: "center",
    boxShadow: `0 10px 28px ${player.color}1A`,
    boxSizing: "border-box",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };

  if (state.kind === "before") {
    const { days } = state;
    const bigNum = days === 0 ? "TODAY" : String(days);
    const labelText =
      days === 0 ? "you fly today" : days === 1 ? "day to go" : "days to go";
    return (
      <div style={cardStyle}>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: days === 0 ? "clamp(32px, 7vw, 52px)" : "clamp(44px, 8vw, 72px)",
            color: player.color,
            lineHeight: 0.95,
            letterSpacing: -1,
          }}
        >
          {bigNum}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 10,
            letterSpacing: 2.5,
            color: player.color,
            textTransform: "uppercase",
          }}
        >
          {labelText}
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.textBody,
            fontWeight: 600,
          }}
        >
          until you land 🌴
        </div>
      </div>
    );
  }

  if (state.kind === "during") {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: "clamp(36px, 8vw, 52px)", lineHeight: 1, marginBottom: 6 }}>🌴</div>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: "clamp(18px, 3.5vw, 24px)",
            color: C.dark,
            lineHeight: 1.1,
          }}
        >
          You're in Punta Cana
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
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
        <div style={{ fontSize: "clamp(32px, 7vw, 48px)", lineHeight: 1, marginBottom: 6 }}>💛</div>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: "clamp(18px, 3.5vw, 24px)",
            color: C.dark,
            lineHeight: 1.1,
          }}
        >
          Hope you had a blast
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
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
      <div style={{ fontFamily: "Nunito, sans-serif", color: C.textBody, fontWeight: 600, fontSize: 13 }}>
        Your flight details aren't locked in yet.
      </div>
    </div>
  );
}
