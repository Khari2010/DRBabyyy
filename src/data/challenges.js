// Challenges keyed by id with a category for grouping in the /games dashboard.
// Categories: social (with strangers), drinks, fitness, content, wild
// (high-stakes), squad (within the group), chill (low-effort).
export const CHALLENGES = [
  { id: 1, title: "Kiss Someone", icon: "💋", points: 100, category: "social" },
  { id: 2, title: "Sing in Public", icon: "🎤", points: 15, bonus: "+50 crowd, +50 money", category: "wild" },
  { id: 3, title: "Run 1km", icon: "🏃", points: 20, category: "fitness" },
  { id: 4, title: "5 Shots at Once", icon: "🥃", points: 20, category: "drinks" },
  { id: 5, title: "Get Someone to Buy You Drinks", icon: "🍹", points: 5, category: "social" },
  { id: 6, title: "Selfie with Stranger", icon: "🤳", points: 3, category: "social" },
  { id: 7, title: "Selfie with Someone Sleeping", icon: "😴", points: 3, bonus: "+30 get everyone", category: "squad" },
  { id: 8, title: "Wear Someone's Clothes (10 min)", icon: "👕", points: 15, category: "squad" },
  { id: 9, title: "30 Min Gym Workout", icon: "💪", points: 15, category: "fitness" },
  { id: 10, title: "Get Number / Insta / Snap", icon: "📱", points: 5, category: "social" },
  { id: 11, title: "Build Sand Sculpture", icon: "🏖️", points: 30, category: "chill" },
  { id: 12, title: "Stranger Gives You Money", icon: "💸", points: 75, category: "wild" },
  { id: 13, title: "Make a TikTok", icon: "📹", points: 2, category: "content" },
  { id: 14, title: "Stranger Joins TikTok", icon: "🎬", points: 20, category: "content" },
  { id: 15, title: "Cliff Jump", icon: "🪂", points: 100, category: "wild" },
  { id: 16, title: "Find Group Lookalike", icon: "👥", points: 70, category: "squad" },
  { id: 17, title: "Sleep Somewhere Else", icon: "🛏️", points: 100, category: "wild" },
  { id: 18, title: "Receive Compliments", icon: "😊", points: 7, category: "social" },
  { id: 19, title: "Get a Tan", icon: "☀️", points: 1, category: "chill" },
  { id: 20, title: "Hold Hands with Stranger", icon: "🤝", points: 15, category: "social" },
  { id: 21, title: "Down a Drink", icon: "🍺", points: 2, category: "drinks" },
  { id: 22, title: "Shot", icon: "🥂", points: 2, category: "drinks" },
  { id: 23, title: "Play Game with Stranger", icon: "🎲", points: 25, category: "social" },
  { id: 24, title: "Buy Souvenir", icon: "🎁", points: 4, category: "chill" },
  { id: 25, title: "Matching Outfit Stranger", icon: "👯", points: 15, category: "social" },
  { id: 26, title: "Pic with 5 People 50+", icon: "📸", points: 50, category: "wild" },
  { id: 27, title: "Ask Something Embarrassing", icon: "😳", points: 35, category: "social" },
  { id: 28, title: "Scare Someone in Group", icon: "👻", points: 10, category: "squad" },
  { id: 29, title: "Try Something New", icon: "✨", points: 10, category: "wild" },
  { id: 30, title: "Ride Gianni's Bike", icon: "🚲", points: 85, category: "wild" },
  { id: 31, title: "Give Massage", icon: "💆", points: 1, bonus: "per minute", category: "squad" },
  { id: 32, title: "Shower with Someone", icon: "🚿", points: 100, category: "wild" },
  { id: 33, title: "Get a Tattoo", icon: "🖋️", points: 250, category: "wild" },
  { id: 34, title: "All Nighter (until midday)", icon: "🌙", points: 40, category: "wild" },
  { id: 35, title: "Scavenger Hunt (Food/Plant/Animal/Object)", icon: "🔍", points: 80, category: "squad" },
];

export const NEGATIVE_POINTS = [
  { action: "Throwing up", points: -50, icon: "🤮" },
  { action: "Going to bed before 11pm", points: -40, icon: "😴" },
  { action: "Debating chosen drinks", points: -10, icon: "🙄" },
  { action: "First to go to bed", points: -30, icon: "💤" },
];

export const CHALLENGE_CATEGORIES = [
  { id: "social", label: "Social", icon: "🤝", blurb: "Win over strangers." },
  { id: "drinks", label: "Drinks", icon: "🍻", blurb: "Bar-side bravery." },
  { id: "fitness", label: "Fitness", icon: "💪", blurb: "Earn it physically." },
  { id: "content", label: "Content", icon: "📹", blurb: "Camera ready." },
  { id: "wild", label: "Wild", icon: "🔥", blurb: "High stakes only." },
  { id: "squad", label: "Squad", icon: "👯", blurb: "With the crew." },
  { id: "chill", label: "Chill", icon: "🌴", blurb: "Easy points." },
];

export function challengesByCategory(categoryId) {
  return CHALLENGES.filter((c) => c.category === categoryId);
}

// Re-export FORFEITS from forfeits.js for backwards compatibility with anything
// that still imports them from here. New code should import from "./forfeits.js".
export { FORFEITS, FORFEIT_LABELS } from "./forfeits.js";
