export interface EarthquakeItem {
  id: string;
  lat: number;
  lng: number;
  magnitude: number;
  place: string;
  time: number; // Unix ms timestamp
  depth: number; // km
  title: string;
  url: string; // USGS event page URL
  isEarthquake: true;
}

// Category keyword mapping
export const CATEGORIES = [
  "All",
  "World",
  "Politics",
  "Tech",
  "Business",
  "Sports",
  "Science",
  "Entertainment",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Politics: [
    "politics",
    "election",
    "government",
    "president",
    "minister",
    "senate",
    "congress",
    "parliament",
    "vote",
    "democrat",
    "republican",
    "prime minister",
    "diplomat",
    "treaty",
    "sanctions",
  ],
  Tech: [
    "tech",
    "ai",
    "artificial intelligence",
    "software",
    "cyber",
    "robot",
    "startup",
    "apple",
    "google",
    "microsoft",
    "amazon",
    "meta",
    "openai",
    "chip",
    "semiconductor",
    "quantum",
    "algorithm",
  ],
  Business: [
    "economy",
    "market",
    "stock",
    "trade",
    "inflation",
    "gdp",
    "bank",
    "finance",
    "recession",
    "earnings",
    "fed",
    "interest rate",
    "nasdaq",
    "dow",
    "s&p",
    "ipo",
    "acquisition",
  ],
  Sports: [
    "sport",
    "football",
    "soccer",
    "basketball",
    "tennis",
    "olympic",
    "championship",
    "league",
    "tournament",
    "athlete",
    "nba",
    "nfl",
    "fifa",
    "world cup",
    "cricket",
  ],
  Science: [
    "science",
    "research",
    "study",
    "climate",
    "nasa",
    "space",
    "biology",
    "physics",
    "environment",
    "covid",
    "vaccine",
    "medicine",
    "health",
    "cancer",
    "virus",
  ],
  Entertainment: [
    "entertainment",
    "movie",
    "film",
    "music",
    "celebrity",
    "award",
    "oscar",
    "grammy",
    "netflix",
    "disney",
    "concert",
    "album",
    "actor",
    "singer",
  ],
  World: [],
};
