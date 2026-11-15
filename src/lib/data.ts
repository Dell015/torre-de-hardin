/**
 * All site content lives here so the owners (or you) can edit it in one place.
 * Anything marked PLACEHOLDER is not confirmed by the resort yet.
 */

export const RESORT = {
  name: "Torre de Jardin",
  descriptor: "Villas, Resort & Event Place",
  tagline: "The city is far. That is the point.",
  address: "Junction Naguilian – San Mariano – Palanan Road, Naguilian, Isabela",
  phones: [
    { label: "0977 699 9360", tel: "+639776999360" },
    { label: "0999 508 2038", tel: "+639995082038" },
  ],
  facebook: "https://www.facebook.com/torre.de.jardin",
  messenger: "https://m.me/torre.de.jardin",
  maps: "https://www.google.com/maps/search/?api=1&query=Torre+de+Jardin+Naguilian+Isabela",
  // PLACEHOLDER — typical for resorts of this kind
  checkIn: "2:00 PM",
  checkOut: "12:00 NN",
};

export type StayId = "cabin" | "family" | "private";

export interface Stay {
  id: StayId;
  no: string;
  name: string;
  kicker: string;
  blurb: string;
  features: string[];
  sleeps: string; // PLACEHOLDER
  beds: string; // PLACEHOLDER
  images: { name: string; alt: string; pos?: string }[];
  units: number; // PLACEHOLDER — how many of this type exist
}

export const STAYS: Stay[] = [
  {
    id: "private",
    no: "01",
    name: "Private Villa",
    kicker: "Beside the water",
    blurb:
      "Two queen beds under exposed timber beams, a terrace that opens onto the lawn, and the pool a few steps from the door. The villa for people who came here to do very little, very well.",
    features: ["Hot & cold shower", "Free Wi-Fi", "Pool access", "Air-conditioned", "Private terrace"],
    sleeps: "4 guests",
    beds: "2 queen beds",
    images: [
      { name: "room-a", alt: "Private villa bedroom with two beds and timber beams" },
      { name: "pool-villas", alt: "The row of private villas facing the pool" },
      { name: "room-b", alt: "Villa interior with glass doors to the terrace" },
    ],
    units: 3,
  },
  {
    id: "family",
    no: "02",
    name: "Family Villa",
    kicker: "Everyone under one roof",
    blurb:
      "One big, bright room under a white-timber ceiling: several beds in a row, a wooden lounge set in the middle, and room for the whole family to spread out. Built for the reunion, the birthday weekend and the cousins who tag along.",
    features: ["Open lounge area", "Several beds", "Free Wi-Fi", "Pool access", "Air-conditioned"],
    sleeps: "8 guests",
    beds: "Double, twin & single beds",
    images: [
      { name: "fam-a", alt: "Family villa lounge with wooden sofa set and beds beyond", pos: "50% 78%" },
      { name: "fam-b", alt: "Family villa king bed with a trundle and lounge in the background", pos: "50% 78%" },
      { name: "fam-c", alt: "Family villa seen from the lounge toward the beds", pos: "50% 78%" },
      { name: "fam-d", alt: "Two beds with a patterned runner under a white ceiling", pos: "50% 78%" },
      { name: "fam-e", alt: "Row of three beds along the window wall", pos: "50% 78%" },
      { name: "fam-f", alt: "Beds and a wall fan in the family villa", pos: "50% 78%" },
    ],
    units: 1,
  },
  {
    id: "cabin",
    no: "03",
    name: "Cabin",
    kicker: "Small, leafy, just right",
    blurb:
      "A compact cabin with a tropical-print wall, warm timber and a terrace on the grass. Made for two, or for one person who needs a weekend to themselves.",
    features: ["Garden terrace", "Hot & cold shower", "Free Wi-Fi", "Pool access", "Air-conditioned"],
    sleeps: "2 guests",
    beds: "1 double + 1 single",
    images: [
      { name: "room-tropic", alt: "Cabin bedroom with tropical wall mural" },
      { name: "terrace", alt: "Rattan table and chairs on the cabin terrace" },
      { name: "villa-night", alt: "Cabin exterior glowing at night" },
    ],
    units: 2,
  },
];

export interface Occasion {
  no: string;
  name: string;
  line: string;
  image: string;
  pos?: string;
}

export const OCCASIONS: Occasion[] = [
  {
    no: "i",
    name: "Weddings",
    line: "Garden ceremonies on the lawn, a long table under the stars, and a tower that lights up the first dance.",
    image: "wedding-arch",
  },
  {
    no: "ii",
    name: "Birthdays & Debuts",
    line: "Eighteen candles or eighty. Round tables on the grass, music by the pool, and cake at golden hour.",
    image: "garden-roof-a",
  },
  {
    no: "iii",
    name: "Christenings",
    line: "Soft white flowers, shade for the grandparents, and a quiet corner for the little guest of honour.",
    image: "wedding-aisle",
  },
  {
    no: "iv",
    name: "Family Reunions",
    line: "Forty people, one long weekend. Villas for sleeping, the hall for eating, the pool for everything else.",
    image: "hall-b",
  },
  {
    no: "v",
    name: "Retreats & Team Days",
    line: "Away from the office and the inbox. A hall that seats a crowd and a lawn for the games that follow.",
    image: "hall-a",
  },
  {
    no: "vi",
    name: "Proposals & Quiet Nights",
    line: "Bougainvillea, string lights, and a violet tower in the dark. You will only need to bring the ring.",
    image: "tower-bloom",
  },
];

export interface Hour {
  no: string;
  time: string;
  clock: string;
  head: string;
  body: string;
  image: string;
  pos: string;
}

export const HOURS: Hour[] = [
  {
    no: "I",
    time: "Morning",
    clock: "6:30 AM",
    head: "Coffee on the terrace. Nothing on the calendar.",
    body: "Wake to open sky and cool grass. Breakfast takes exactly as long as you want it to.",
    image: "pool-dawn",
    pos: "50% 55%",
  },
  {
    no: "II",
    time: "Noon",
    clock: "12:00 NN",
    head: "The pool is yours until the sun gets bored.",
    body: "Swim, float, repeat. The water is warm, the villas are a few steps away, and nobody is counting.",
    image: "pool-wide",
    pos: "50% 50%",
  },
  {
    no: "III",
    time: "Golden hour",
    clock: "5:45 PM",
    head: "Everything turns the colour of honey.",
    body: "The light comes in low across the hills. This is the hour when people stop talking and simply look.",
    image: "sunset",
    pos: "50% 38%",
  },
  {
    no: "IV",
    time: "Night",
    clock: "8:00 PM",
    head: "Then the tower comes on.",
    body: "A lit crown in the dark, bougainvillea at its feet, and a long table with your people around it.",
    image: "tower-violet",
    pos: "50% 42%",
  },
];

export interface Plate {
  image: string;
  caption: string;
  h: "tall" | "wide" | "mid";
}

export const PLATES: Plate[] = [
  { image: "aerial-day-c", caption: "The estate, from above", h: "wide" },
  { image: "pool-moon", caption: "A moon chair by the water", h: "tall" },
  { image: "tower-bougainvillea", caption: "Bougainvillea, after dark", h: "tall" },
  { image: "wedding-aisle", caption: "An aisle of white", h: "tall" },
  { image: "pool-villas", caption: "The villas, facing the pool", h: "wide" },
  { image: "room-e", caption: "Timber and glass", h: "tall" },
  { image: "hall-b", caption: "The function hall", h: "wide" },
  { image: "wedding-table", caption: "Gold plates, blue linen", h: "tall" },
  { image: "tower-play", caption: "The lawn at night", h: "wide" },
  { image: "aerial-night", caption: "The whole garden, lit", h: "wide" },
];

export const POLICIES = [
  {
    q: "Reservations & deposit",
    a: "Every request is reviewed by the owners and confirmed by text or Messenger. A deposit of x% holds your dates once confirmed. The balance is settled on arrival.",
  },
  {
    q: "Changing or cancelling",
    a: "Dates can be moved once, subject to availability, when requested x days before arrival. Cancellation terms will be confirmed with the owners.",
  },
  {
    q: "The pool",
    a: "Open to staying guests during your stay. Please shower before entering, children must be supervised, and glass is not allowed on the pool deck.",
  },
  {
    q: "Events & outside suppliers",
    a: "The function hall and garden need a confirmed reservation. Caterers, stylists and sound suppliers are welcome. Please share your list at least x days before the event.",
  },
  {
    q: "Pets, smoking & quiet hours",
    a: "House rules on pets and smoking will be confirmed with the owners. Quiet hours begin at x PM, so the hills stay quiet for everyone.",
  },
];

export const AMENITIES = [
  "Swimming pool with shallow deck",
  "Shaded cabana & moon chairs",
  "Garden lawn for up to x guests",
  "Air-conditioned function hall",
  "The tower walkway",
  "Children's play lawn",
  "Hot & cold showers",
  "Free Wi-Fi",
  "Free on-site parking",
];

export const EVENT_TYPES = [
  "Wedding",
  "Birthday / Debut",
  "Christening",
  "Family reunion",
  "Corporate / Team day",
  "Proposal / Intimate dinner",
  "Other",
];
