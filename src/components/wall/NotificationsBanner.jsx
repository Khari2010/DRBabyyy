import { usePushSubscription } from "../../lib/usePushSubscription.js";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";

export default function NotificationsBanner() {
  const { state, requestPermission } = usePushSubscription();

  if (state === "granted" || state === "denied" || state === "unsupported") return null;

  if (state === "needs-install") {
    return (
      <div style={banner}>
        <strong>Add DR Baby to your home screen first.</strong>{" "}
        In Safari: tap <span style={{ whiteSpace: "nowrap" }}>Share → Add to Home Screen</span>.
        Then open it from the icon and come back here.
      </div>
    );
  }

  // state === "default"
  return (
    <button
      onClick={requestPermission}
      style={{ ...banner, cursor: "pointer", textAlign: "left", width: "100%", border: "none" }}
    >
      🔔 <strong>Turn on notifications</strong> so you don't miss the chat.
    </button>
  );
}

const banner = {
  background: C.yellow,
  color: C.dark,
  borderRadius: RADIUS.lg,
  boxShadow: SHADOW.card,
  padding: "10px 14px",
  marginBottom: 12,
  fontFamily: "Nunito, sans-serif",
  fontSize: 14,
};
