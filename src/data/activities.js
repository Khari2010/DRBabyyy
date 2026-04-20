// Activities shown on the player page adventure panel.
// `planned: true` = already on the itinerary.
// `planned: false` = unplanned candidate the crew can upvote to push onto the plan.
// Ids must be stable — they key the vote rows in Convex.
export const ACTIVITIES = [
  { id: "saona", name: "Saona Island", icon: "🏝️", blurb: "Full-day catamaran + speedboat to palm-lined white sand, turquoise natural pools, open bar, beachside BBQ. A 10-hour adventure.", planned: true, day: "21 May" },
  { id: "party-boat", name: "Caribbean Party Boat", icon: "🚤", blurb: "3-hour floating party catamaran: DJ, unlimited drinks, Caribbean food, VIP stop at a natural pool.", planned: true, day: "22 May" },
  { id: "altos", name: "Altos de Chavón", icon: "🌇", blurb: "Replica 16th-century Mediterranean village above the Chavón River. Cobblestone streets, galleries, golden-hour views.", planned: true, day: "23 May" },
  { id: "coco-bongo", name: "Coco Bongo", icon: "🎭", blurb: "Punta Cana's wildest nightlife — confetti, tribute acts, acrobats from 8pm, full club until 3am. Open bar.", planned: true, day: "23 May" },
  { id: "jellyfish", name: "Jellyfish Restaurant", icon: "🪼", blurb: "Beachfront restaurant on Bavaro Beach — fresh seafood, sunsets, upscale but laid-back.", planned: true, day: "24 May" },
  { id: "sky-dinner", name: "Dinner in the Sky", icon: "🎈", blurb: "Table suspended 50m in the air by a crane. Sunset cocktails, panoramic views, surreal.", planned: true, day: "24 May" },

  { id: "hoyo-azul", name: "Hoyo Azul cenote", icon: "🏊", blurb: "Freshwater cenote swim at Scape Park — deep turquoise pool surrounded by cliff jungle.", planned: false },
  { id: "dolphin-swim", name: "Dolphin swim", icon: "🐬", blurb: "Swim with dolphins at Dolphin Island Park.", planned: false },
  { id: "horseback-macao", name: "Horseback riding on Macao Beach", icon: "🏇", blurb: "Sunset ride along Macao Beach.", planned: false },
  { id: "zipline", name: "Zipline canopy tour", icon: "🪂", blurb: "Scape Park zipline course — treetop descents through jungle.", planned: false },
  { id: "macao-surf", name: "Macao Beach surf lesson", icon: "🏄", blurb: "Beginner-friendly surf lesson at Macao Beach — one of the area's best breaks.", planned: false },
  { id: "atv-buggy", name: "ATV buggy tour", icon: "🚙", blurb: "Off-road jungle and beach buggy tour.", planned: false },
];

export const PLANNED_ACTIVITIES = ACTIVITIES.filter((a) => a.planned);
export const UNPLANNED_ACTIVITIES = ACTIVITIES.filter((a) => !a.planned);
