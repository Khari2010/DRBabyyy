import { C } from "./colors.js";

// Scavenger hunt items grouped into 4 categories. Mechanics (per-day rotation,
// who-claimed-what, points) come later — this is the visual seed list shown
// inside the locked /games dashboard.
export const SCAVENGER_ITEMS = [
  // Food
  { id: "coconut", category: "food", name: "Coconut still on the tree", icon: "🥥" },
  { id: "mango-stand", category: "food", name: "Fresh mango from a stand", icon: "🥭" },
  { id: "tostones", category: "food", name: "Tostones (fried plantain)", icon: "🍌" },
  { id: "mamajuana", category: "food", name: "Bottle of Mamajuana", icon: "🍶" },
  { id: "presidente", category: "food", name: "Ice-cold Presidente beer", icon: "🍺" },
  { id: "conch-fritter", category: "food", name: "Conch fritter", icon: "🦞" },
  { id: "tres-leches", category: "food", name: "Tres leches dessert", icon: "🍰" },
  { id: "rum-coconut", category: "food", name: "Rum poured into a coconut", icon: "🍹" },

  // Plant
  { id: "royal-palm", category: "plant", name: "Royal palm", icon: "🌴" },
  { id: "hibiscus", category: "plant", name: "Hibiscus flower", icon: "🌺" },
  { id: "bird-of-paradise", category: "plant", name: "Bird of paradise", icon: "🌸" },
  { id: "sea-grape", category: "plant", name: "Sea grape", icon: "🍇" },
  { id: "cactus-fruit", category: "plant", name: "Cactus with fruit", icon: "🌵" },
  { id: "banana-plant", category: "plant", name: "Banana plant", icon: "🍃" },
  { id: "bromeliad", category: "plant", name: "Bromeliad in bloom", icon: "🌷" },

  // Animal
  { id: "pelican", category: "animal", name: "Pelican mid-dive", icon: "🐦" },
  { id: "iguana", category: "animal", name: "Iguana sunbathing", icon: "🦎" },
  { id: "crab", category: "animal", name: "Crab on the beach", icon: "🦀" },
  { id: "tropical-fish", category: "animal", name: "Tropical fish (snorkel)", icon: "🐠" },
  { id: "hummingbird", category: "animal", name: "Hummingbird", icon: "🦜" },
  { id: "stray-cat", category: "animal", name: "Stray cat with attitude", icon: "🐈" },
  { id: "starfish", category: "animal", name: "Starfish (Saona Island)", icon: "⭐" },

  // Object
  { id: "conch-shell", category: "object", name: "Whole conch shell", icon: "🐚" },
  { id: "peso", category: "object", name: "Dominican peso bill", icon: "💵" },
  { id: "domino", category: "object", name: "Old domino tile", icon: "🁫" },
  { id: "cigar", category: "object", name: "Hand-rolled cigar", icon: "🚬" },
  { id: "maracas", category: "object", name: "Pair of maracas", icon: "🪇" },
  { id: "live-bachata", category: "object", name: "Live bachata band", icon: "🎶" },
  { id: "sand-dollar", category: "object", name: "Sand dollar", icon: "🪙" },
];

export const SCAVENGER_CATEGORIES = [
  { id: "food", label: "Food", icon: "🍴", color: C.coralDeep },
  { id: "plant", label: "Plant", icon: "🌿", color: C.green },
  { id: "animal", label: "Animal", icon: "🐠", color: C.turquoise },
  { id: "object", label: "Object", icon: "🎁", color: C.gold },
];

export function itemsByCategory(categoryId) {
  return SCAVENGER_ITEMS.filter((i) => i.category === categoryId);
}
