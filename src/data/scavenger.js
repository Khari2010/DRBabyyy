import { C } from "./colors.js";

// Scavenger hunt items grouped into 4 categories. Mechanics (per-day rotation,
// who-claimed-what, points) come later — this is the visual seed list shown
// inside the locked /games dashboard.
export const SCAVENGER_ITEMS = [
  // Food
  { id: "coconut", category: "food", name: "Coconut still on the tree", icon: "🥥", difficulty: "easy", points: 5 },
  { id: "mango-stand", category: "food", name: "Fresh mango from a stand", icon: "🥭", difficulty: "easy", points: 5 },
  { id: "tostones", category: "food", name: "Tostones (fried plantain)", icon: "🍌", difficulty: "easy", points: 5 },
  { id: "presidente", category: "food", name: "Ice-cold Presidente beer", icon: "🍺", difficulty: "easy", points: 5 },
  { id: "mamajuana", category: "food", name: "Bottle of Mamajuana", icon: "🍶", difficulty: "medium", points: 10 },
  { id: "conch-fritter", category: "food", name: "Conch fritter", icon: "🦞", difficulty: "medium", points: 10 },
  { id: "tres-leches", category: "food", name: "Tres leches dessert", icon: "🍰", difficulty: "medium", points: 10 },
  { id: "rum-coconut", category: "food", name: "Rum poured into a coconut", icon: "🍹", difficulty: "medium", points: 10 },

  // Plant
  { id: "royal-palm", category: "plant", name: "Royal palm", icon: "🌴", difficulty: "easy", points: 5 },
  { id: "hibiscus", category: "plant", name: "Hibiscus flower", icon: "🌺", difficulty: "easy", points: 5 },
  { id: "banana-plant", category: "plant", name: "Banana plant", icon: "🍃", difficulty: "easy", points: 5 },
  { id: "bird-of-paradise", category: "plant", name: "Bird of paradise", icon: "🌸", difficulty: "medium", points: 10 },
  { id: "sea-grape", category: "plant", name: "Sea grape", icon: "🍇", difficulty: "medium", points: 10 },
  { id: "bromeliad", category: "plant", name: "Bromeliad in bloom", icon: "🌷", difficulty: "medium", points: 10 },
  { id: "cactus-fruit", category: "plant", name: "Cactus with fruit", icon: "🌵", difficulty: "wild", points: 20 },

  // Animal
  { id: "iguana", category: "animal", name: "Iguana sunbathing", icon: "🦎", difficulty: "easy", points: 5 },
  { id: "crab", category: "animal", name: "Crab on the beach", icon: "🦀", difficulty: "easy", points: 5 },
  { id: "stray-cat", category: "animal", name: "Stray cat with attitude", icon: "🐈", difficulty: "easy", points: 5 },
  { id: "pelican", category: "animal", name: "Pelican mid-dive", icon: "🐦", difficulty: "medium", points: 10 },
  { id: "tropical-fish", category: "animal", name: "Tropical fish (snorkel)", icon: "🐠", difficulty: "medium", points: 10 },
  { id: "hummingbird", category: "animal", name: "Hummingbird", icon: "🦜", difficulty: "medium", points: 10 },
  { id: "starfish", category: "animal", name: "Starfish (Saona Island)", icon: "⭐", difficulty: "wild", points: 20 },

  // Object
  { id: "peso", category: "object", name: "Dominican peso bill", icon: "💵", difficulty: "easy", points: 5 },
  { id: "conch-shell", category: "object", name: "Whole conch shell", icon: "🐚", difficulty: "medium", points: 10 },
  { id: "cigar", category: "object", name: "Hand-rolled cigar", icon: "🚬", difficulty: "medium", points: 10 },
  { id: "maracas", category: "object", name: "Pair of maracas", icon: "🪇", difficulty: "medium", points: 10 },
  { id: "domino", category: "object", name: "Old domino tile", icon: "🁫", difficulty: "wild", points: 20 },
  { id: "live-bachata", category: "object", name: "Live bachata band", icon: "🎶", difficulty: "wild", points: 20 },
  { id: "sand-dollar", category: "object", name: "Sand dollar", icon: "🪙", difficulty: "wild", points: 20 },
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

const ITEM_INDEX = new Map(SCAVENGER_ITEMS.map((i) => [i.id, i]));
export function itemById(id) {
  return ITEM_INDEX.get(id);
}
