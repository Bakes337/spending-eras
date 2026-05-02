export interface DummyEra {
  name: string;
  tagline: string;
  description: string;
  season: string;
  year: number;
  startDate: string;
  endDate: string;
  totalSpent: number;
  topCategory: string;
  colorTheme: string;
  emoji: string;
  rank: number;
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number; transactionCount: number }>;
  topMerchants: Array<{ name: string; amount: number; visits: number; category: string }>;
  weeklyAverage: number;
  peakWeek: string;
  funFact: string;
  categoryVibe: string;
}

export const DUMMY_ERAS: DummyEra[] = [
  {
    name: "The Night Out Era",
    tagline: "Your wallet knew every bouncer in town",
    description: "This was your going-out prime. Bars, clubs, late-night bites, and Ubers at 2am — you were living. Friday nights were practically a subscription service.",
    season: "Summer",
    year: 2023,
    startDate: "2023-06-01",
    endDate: "2023-08-31",
    totalSpent: 4280.50,
    topCategory: "Bars & Nightlife",
    colorTheme: "#7C3AED",
    emoji: "🎉",
    rank: 1,
    categoryBreakdown: [
      { category: "Bars & Nightlife", amount: 1640, percentage: 38, transactionCount: 42 },
      { category: "Restaurants", amount: 980, percentage: 23, transactionCount: 31 },
      { category: "Rideshare", amount: 720, percentage: 17, transactionCount: 38 },
      { category: "Entertainment", amount: 540, percentage: 13, transactionCount: 12 },
      { category: "Other", amount: 400, percentage: 9, transactionCount: 15 },
    ],
    topMerchants: [
      { name: "The Rusty Pelican", amount: 520, visits: 12, category: "Bars & Nightlife" },
      { name: "Uber", amount: 410, visits: 28, category: "Rideshare" },
      { name: "Taco Bell", amount: 180, visits: 9, category: "Restaurants" },
      { name: "Chipotle", amount: 165, visits: 11, category: "Restaurants" },
    ],
    weeklyAverage: 330,
    peakWeek: "July 4th Week",
    funFact: "You spent more on Ubers this season than on groceries. Priorities.",
    categoryVibe: "dive bars & late-night Ubers",
  },
  {
    name: "The Outdoor Obsessive Era",
    tagline: "Gear, trails, and altitude highs",
    description: "You discovered REI and never looked back. Camping equipment, hiking boots, national park fees, and way too many carabiners. Weekends were for summits.",
    season: "Fall",
    year: 2023,
    startDate: "2023-09-01",
    endDate: "2023-11-30",
    totalSpent: 3190.75,
    topCategory: "Outdoors & Recreation",
    colorTheme: "#065F46",
    emoji: "🏕️",
    rank: 3,
    categoryBreakdown: [
      { category: "Outdoors & Recreation", amount: 1380, percentage: 43, transactionCount: 22 },
      { category: "Gas", amount: 520, percentage: 16, transactionCount: 18 },
      { category: "Restaurants", amount: 440, percentage: 14, transactionCount: 19 },
      { category: "Groceries", amount: 510, percentage: 16, transactionCount: 24 },
      { category: "Other", amount: 340, percentage: 11, transactionCount: 9 },
    ],
    topMerchants: [
      { name: "REI", amount: 890, visits: 6, category: "Outdoors & Recreation" },
      { name: "Shell Gas", amount: 290, visits: 14, category: "Gas" },
      { name: "Whole Foods", amount: 220, visits: 8, category: "Groceries" },
      { name: "TrailheadBrew Co.", amount: 175, visits: 7, category: "Restaurants" },
    ],
    weeklyAverage: 245,
    peakWeek: "Columbus Day Weekend",
    funFact: "You drove 3,200 miles to reach trailheads this season. That's roughly LA to NYC.",
    categoryVibe: "REI hauls & trailhead fuel",
  },
  {
    name: "The Homebody Era",
    tagline: "Cozy, intentional, maybe a little boring",
    description: "You stayed in and thrived. Grocery delivery, streaming, candles, and the occasional DoorDash treat. Your bank account appreciated the quiet season.",
    season: "Winter",
    year: 2023,
    startDate: "2023-12-01",
    endDate: "2024-02-29",
    totalSpent: 2840.00,
    topCategory: "Groceries",
    colorTheme: "#1E3A5F",
    emoji: "🏠",
    rank: 6,
    categoryBreakdown: [
      { category: "Groceries", amount: 980, percentage: 35, transactionCount: 28 },
      { category: "Streaming & Subscriptions", amount: 420, percentage: 15, transactionCount: 8 },
      { category: "Food Delivery", amount: 580, percentage: 20, transactionCount: 22 },
      { category: "Home & Garden", amount: 460, percentage: 16, transactionCount: 11 },
      { category: "Other", amount: 400, percentage: 14, transactionCount: 18 },
    ],
    topMerchants: [
      { name: "Trader Joe's", amount: 540, visits: 14, category: "Groceries" },
      { name: "DoorDash", amount: 380, visits: 16, category: "Food Delivery" },
      { name: "Netflix", amount: 60, visits: 3, category: "Streaming" },
      { name: "IKEA", amount: 340, visits: 2, category: "Home & Garden" },
    ],
    weeklyAverage: 218,
    peakWeek: "Christmas Week",
    funFact: "You ordered DoorDash 16 times — an average of once every 5 days. Worth it.",
    categoryVibe: "Trader Joe's & couch delivery",
  },
  {
    name: "The Wanderlust Era",
    tagline: "Flights, hotels, and passport stamps",
    description: "You caught the travel bug and let it run wild. International flights, boutique hotels, local restaurants, museum passes. You were a tourist and proud of it.",
    season: "Spring",
    year: 2024,
    startDate: "2024-03-01",
    endDate: "2024-05-31",
    totalSpent: 6450.20,
    topCategory: "Travel",
    colorTheme: "#B45309",
    emoji: "✈️",
    rank: 2,
    categoryBreakdown: [
      { category: "Flights", amount: 2180, percentage: 34, transactionCount: 6 },
      { category: "Hotels", amount: 1640, percentage: 25, transactionCount: 9 },
      { category: "Restaurants", amount: 980, percentage: 15, transactionCount: 38 },
      { category: "Activities & Tours", amount: 840, percentage: 13, transactionCount: 14 },
      { category: "Other", amount: 810, percentage: 13, transactionCount: 22 },
    ],
    topMerchants: [
      { name: "United Airlines", amount: 1240, visits: 3, category: "Flights" },
      { name: "Airbnb", amount: 980, visits: 4, category: "Hotels" },
      { name: "Google Flights", amount: 940, visits: 3, category: "Flights" },
      { name: "Local Eats (Barcelona)", amount: 420, visits: 18, category: "Restaurants" },
    ],
    weeklyAverage: 497,
    peakWeek: "Spring Break Week",
    funFact: "You visited 4 countries and 6 cities. Your passport needs a stretch.",
    categoryVibe: "Airbnbs & Barcelona tapas",
  },
  {
    name: "The Gym Rat Era",
    tagline: "Gains, protein shakes, and athletic wear",
    description: "You committed to the lifestyle. Gym memberships, protein powders, Lululemon, and post-workout smoothies. Your body was your side project.",
    season: "Summer",
    year: 2024,
    startDate: "2024-06-01",
    endDate: "2024-08-31",
    totalSpent: 2150.60,
    topCategory: "Health & Fitness",
    colorTheme: "#DC2626",
    emoji: "💪",
    rank: 5,
    categoryBreakdown: [
      { category: "Health & Fitness", amount: 840, percentage: 39, transactionCount: 18 },
      { category: "Groceries", amount: 520, percentage: 24, transactionCount: 22 },
      { category: "Restaurants", amount: 380, percentage: 18, transactionCount: 14 },
      { category: "Supplements", amount: 260, percentage: 12, transactionCount: 6 },
      { category: "Other", amount: 150, percentage: 7, transactionCount: 9 },
    ],
    topMerchants: [
      { name: "Equinox", amount: 390, visits: 3, category: "Health & Fitness" },
      { name: "Lululemon", amount: 340, visits: 2, category: "Health & Fitness" },
      { name: "GNC", amount: 180, visits: 3, category: "Supplements" },
      { name: "Chipotle", amount: 220, visits: 14, category: "Restaurants" },
    ],
    weeklyAverage: 165,
    peakWeek: "July 4th Week",
    funFact: "You spent $340 on Lululemon — that's about $113 per workout you actually did.",
    categoryVibe: "Equinox & Lululemon hauls",
  },
  {
    name: "The Foodie Era",
    tagline: "Tasting menus and reservation apps",
    description: "You treated dining as a sport. Michelin-starred spots, chef's tasting menus, specialty cocktail bars. The Resy app was your social calendar.",
    season: "Fall",
    year: 2024,
    startDate: "2024-09-01",
    endDate: "2024-11-30",
    totalSpent: 3780.90,
    topCategory: "Fine Dining",
    colorTheme: "#9D174D",
    emoji: "🍽️",
    rank: 4,
    categoryBreakdown: [
      { category: "Fine Dining", amount: 1840, percentage: 49, transactionCount: 14 },
      { category: "Bars & Cocktails", amount: 680, percentage: 18, transactionCount: 22 },
      { category: "Groceries", amount: 560, percentage: 15, transactionCount: 18 },
      { category: "Food Delivery", amount: 380, percentage: 10, transactionCount: 12 },
      { category: "Other", amount: 320, percentage: 8, transactionCount: 11 },
    ],
    topMerchants: [
      { name: "Le Bernardin", amount: 480, visits: 1, category: "Fine Dining" },
      { name: "Eleven Madison Park", amount: 620, visits: 2, category: "Fine Dining" },
      { name: "Attaboy", amount: 340, visits: 6, category: "Bars & Cocktails" },
      { name: "Whole Foods", amount: 310, visits: 9, category: "Groceries" },
    ],
    weeklyAverage: 291,
    peakWeek: "Restaurant Week",
    funFact: "Your average dinner out cost $131. You had 14 of them. No regrets.",
    categoryVibe: "tasting menus & Attaboy tabs",
  },
];
