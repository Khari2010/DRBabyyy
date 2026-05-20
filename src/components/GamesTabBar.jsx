import { useSearchParams } from "react-router-dom";
import { C } from "../data/colors.js";
import Pill from "./primitives/Pill.jsx";

const TABS = [
  { key: "challenges", label: "Challenges" },
  { key: "scavenger", label: "Scavenger" },
];

export default function GamesTabBar() {
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") === "scavenger" ? "scavenger" : "challenges";
  const setTab = (k) => {
    const next = new URLSearchParams(params);
    if (k === "challenges") next.delete("tab"); else next.set("tab", k);
    setParams(next, { replace: true });
  };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "16px 0 8px" }}>
      {TABS.map((t) => (
        <Pill
          key={t.key}
          active={active === t.key}
          accent={C.gold}
          onClick={() => setTab(t.key)}
          aria-pressed={active === t.key}
        >
          {t.label}
        </Pill>
      ))}
    </div>
  );
}

export function useGamesTab() {
  const [params] = useSearchParams();
  return params.get("tab") === "scavenger" ? "scavenger" : "challenges";
}
