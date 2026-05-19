// convex/_seedData/challenges.ts
// One-time snapshot of CHALLENGES from src/data/challenges.js used to seed
// the Convex `challenges` table. After seeding, the table is source of truth.

export type SeedChallenge = {
  challengeId: string;
  title: string;
  icon: string;
  points: number;
  bonus?: string;
  category: string;
};

export const SEED_CHALLENGES: SeedChallenge[] = [
  { challengeId: "kiss-someone", title: "Kiss Someone", icon: "💋", points: 100, category: "social" },
  { challengeId: "sing-in-public", title: "Sing in Public", icon: "🎤", points: 15, bonus: "+50 crowd, +50 money", category: "wild" },
  { challengeId: "run-1km", title: "Run 1km", icon: "🏃", points: 20, category: "fitness" },
  { challengeId: "5-shots", title: "5 Shots at Once", icon: "🥃", points: 20, category: "drinks" },
  { challengeId: "buy-drinks", title: "Get Someone to Buy You Drinks", icon: "🍹", points: 5, category: "social" },
  { challengeId: "selfie-stranger", title: "Selfie with Stranger", icon: "🤳", points: 3, category: "social" },
  { challengeId: "selfie-sleeping", title: "Selfie with Someone Sleeping", icon: "😴", points: 3, bonus: "+30 get everyone", category: "squad" },
  { challengeId: "wear-clothes", title: "Wear Someone's Clothes (10 min)", icon: "👕", points: 15, category: "squad" },
  { challengeId: "gym-30", title: "30 Min Gym Workout", icon: "💪", points: 15, category: "fitness" },
  { challengeId: "get-contact", title: "Get Number / Insta / Snap", icon: "📱", points: 5, category: "social" },
  { challengeId: "sand-sculpture", title: "Build Sand Sculpture", icon: "🏖️", points: 30, category: "chill" },
  { challengeId: "stranger-money", title: "Stranger Gives You Money", icon: "💸", points: 75, category: "wild" },
  { challengeId: "make-tiktok", title: "Make a TikTok", icon: "📹", points: 2, category: "content" },
  { challengeId: "stranger-tiktok", title: "Stranger Joins TikTok", icon: "🎬", points: 20, category: "content" },
  { challengeId: "cliff-jump", title: "Cliff Jump", icon: "🪂", points: 100, category: "wild" },
  { challengeId: "find-lookalike", title: "Find Group Lookalike", icon: "👥", points: 70, category: "squad" },
  { challengeId: "sleep-elsewhere", title: "Sleep Somewhere Else", icon: "🛏️", points: 100, category: "wild" },
  { challengeId: "receive-compliments", title: "Receive Compliments", icon: "😊", points: 7, category: "social" },
  { challengeId: "get-tan", title: "Get a Tan", icon: "☀️", points: 1, category: "chill" },
  { challengeId: "hold-hands", title: "Hold Hands with Stranger", icon: "🤝", points: 15, category: "social" },
  { challengeId: "down-drink", title: "Down a Drink", icon: "🍺", points: 2, category: "drinks" },
  { challengeId: "shot", title: "Shot", icon: "🥂", points: 2, category: "drinks" },
  { challengeId: "play-game-stranger", title: "Play Game with Stranger", icon: "🎲", points: 25, category: "social" },
  { challengeId: "buy-souvenir", title: "Buy Souvenir", icon: "🎁", points: 4, category: "chill" },
  { challengeId: "matching-outfit", title: "Matching Outfit Stranger", icon: "👯", points: 15, category: "social" },
  { challengeId: "pic-5-over-50", title: "Pic with 5 People 50+", icon: "📸", points: 50, category: "wild" },
  { challengeId: "embarrassing-ask", title: "Ask Something Embarrassing", icon: "😳", points: 35, category: "social" },
  { challengeId: "scare-group", title: "Scare Someone in Group", icon: "👻", points: 10, category: "squad" },
  { challengeId: "try-new", title: "Try Something New", icon: "✨", points: 10, category: "wild" },
  { challengeId: "gianni-bike", title: "Ride Gianni's Bike", icon: "🚲", points: 85, category: "wild" },
  { challengeId: "give-massage", title: "Give Massage", icon: "💆", points: 1, bonus: "per minute", category: "squad" },
  { challengeId: "shower-with", title: "Shower with Someone", icon: "🚿", points: 100, category: "wild" },
  { challengeId: "tattoo", title: "Get a Tattoo", icon: "🖋️", points: 250, category: "wild" },
  { challengeId: "all-nighter", title: "All Nighter (until midday)", icon: "🌙", points: 40, category: "wild" },
  { challengeId: "scavenger-hunt", title: "Scavenger Hunt (Food/Plant/Animal/Object)", icon: "🔍", points: 80, category: "squad" },
];

export const NEGATIVE_POINTS_CONST = [
  { id: "throw-up", action: "Throwing up", points: -50, icon: "🤮" },
  { id: "bed-pre-11", action: "Going to bed before 11pm", points: -40, icon: "😴" },
  { id: "debate-drinks", action: "Debating chosen drinks", points: -10, icon: "🙄" },
  { id: "first-to-bed", action: "First to go to bed", points: -30, icon: "💤" },
] as const;
