import { C } from "./colors.js";

export const MEMBERS = ["Kai", "Khari", "Candice", "Kyanna", "Camara", "Miles"];
export const FULL_GROUP = MEMBERS;

export const PLAYERS = [
  { id: 1, num: "01", slug: "kai", name: "Kai", title: "The Director", role: "Cameraman & Game Master", bio: "Directs the games, directs the camera, runs the whole production. Something switches when he's on holiday — he transforms into a completely different person. Expect maximum energy, maximum content, and zero chill.", color: C.blue, emoji: "🎬", avatar: "/images/avatars/kai.png" },
  { id: 2, num: "02", slug: "khari", name: "Khari", title: "The Gaffer", role: "The overseer — keeps everything running", bio: "The boss who runs the show. Steady, reliable, always got advice whether you asked for it or not. Doesn't stress about challenges or competitions, but somehow never really loses either. The quiet confidence that holds the whole trip together.", color: C.gold, emoji: "🧔‍♂️", avatar: "/images/avatars/khari.png" },
  { id: 3, num: "03", slug: "candice", name: "Candice", title: "The Sunshine", role: "TikTok queen & the smile that lights up the room", bio: "Her smile is contagious — she doesn't need to be loud to lift the whole room. Always on TikTok, always down to have fun, and lights up every room with her joy.", color: C.coral, emoji: "☀️", avatar: "/images/avatars/candice.png" },
  { id: 4, num: "04", slug: "kyanna", name: "Kyanna", title: "The Ex-Wildcard", role: "Claims she's retired from the chaos. We'll see.", bio: "She was once the wildcard but now claims retirement and wants to chill by the pool. She'll tell everyone she's done with the chaos... but give it two drinks and we'll see how long that retirement lasts.", color: C.purple, emoji: "😈", avatar: "/images/avatars/kyanna.png" },
  { id: 5, num: "05", slug: "camara", name: "Camara", title: "The Messy One", role: "Never stops, never sleeps, always tries to be the main character", bio: "Gets the most drunk, will never sleep, doesn't ever want to stop partying. Three drinks deep and it's already over — says he can handle it every time, never can, and somehow always ends up in the most embarrassing situation possible.", color: C.green, emoji: "💣", avatar: "/images/avatars/camara.png" },
  { id: 6, num: "06", slug: "miles", name: "Miles", title: "The Joker", role: "Funniest in the room, first to disappear", bio: "Always funny, always cracking people up, and might just vanish into thin air halfway through the night. Will have everyone crying laughing at dinner then completely disappear by midnight with zero explanation.", color: C.cyan, emoji: "🃏", avatar: "/images/avatars/miles.png" },
  { id: 7, num: "0?", slug: "ebony", name: "???", title: "The UV Babe", role: "Pretty face, killer figure, lives by the UV index", bio: "The ultimate hot girl. Pretty face, killer figure, and permanently checking the UV levels for the perfect tanning window. Lives for a good sunset and the kind of energy that flips the whole vibe of a holiday — if she actually books, this trip levels up instantly. Identity classified. Status: pending. Whispers in the group chat say it's happening. 👀", color: C.pink, emoji: "🌅", avatar: null, mystery: true },
];

// Slugs that appear in the login picker and have private pages in v1.
// Ebony (slug: "ebony") is excluded to preserve the mystery; she's added when confirmed.
export const V1_LOGIN_SLUGS = ["kai", "khari", "candice", "kyanna", "camara", "miles"];

export const playerBySlug = (slug) => PLAYERS.find((p) => p.slug === slug) ?? null;
