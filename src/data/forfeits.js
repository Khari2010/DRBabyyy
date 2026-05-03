import { C } from "./colors.js";

// Forfeits = the wheel pool. Lowest scorer (or any wheel result) takes one.
// `id` keys results when wired to backend; `label` shows in lists + result modal;
// `icon` + `color` style the wheel slice. Colors are deliberately alternated
// cool/warm so adjacent slices contrast.
export const FORFEITS = [
  { id: "skinny-dip", label: "Skinny dipping", icon: "🌊", color: C.sky },
  { id: "naked-hotel", label: "Run naked round the hotel", icon: "💨", color: C.coral },
  { id: "pool-clothed", label: "Jump in the pool fully clothed", icon: "🏊", color: C.turquoise },
  { id: "wax", label: "Wax", icon: "🩹", color: C.gold },
  { id: "chili", label: "Eat a chili whole", icon: "🌶️", color: C.green },
  { id: "spanked", label: "Spanked by everyone", icon: "🍑", color: C.coralDeep },
  { id: "waterboard", label: "Waterboarded (10 sec)", icon: "💧", color: C.blue },
  { id: "cold-shower", label: "Cold shower (1 min)", icon: "🚿", color: C.yellow },
  { id: "deduct", label: "Deduct points from someone", icon: "📉", color: C.cyan },
  { id: "plank", label: "90 second plank", icon: "🪵", color: C.pink },
  { id: "opposite-undies", label: "Opposite sex underwear", icon: "🩲", color: C.purple },
  { id: "21-questions", label: "21 questions hot seat", icon: "🔥", color: C.coral },
  { id: "streak-beach", label: "Streaking at the beach", icon: "🏝️", color: C.turquoise },
  { id: "coin-flip", label: "Coin flip — double or nothing", icon: "🪙", color: C.gold },
];

export const FORFEIT_LABELS = FORFEITS.map((f) => f.label);
