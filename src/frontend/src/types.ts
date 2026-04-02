export interface StreamItem {
  id: string;
  title: string;
  source: string;
  lat: number;
  lng: number;
  country: string;
  videoId: string;
  description: string;
  isStream: true;
}

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

export const LIVESTREAMS: StreamItem[] = [
  {
    id: "ls1",
    title: "Al Jazeera English Live",
    source: "Al Jazeera",
    lat: 25.3,
    lng: 51.5,
    country: "Qatar",
    videoId: "FtZoPnCMows",
    description:
      "24/7 live breaking news and in-depth analysis from Al Jazeera English",
    isStream: true,
  },
  {
    id: "ls2",
    title: "DW News Live",
    source: "DW",
    lat: 52.5,
    lng: 13.4,
    country: "Germany",
    videoId: "pdEBkgbzGCY",
    description:
      "Live news from Deutsche Welle — Germany's international broadcaster",
    isStream: true,
  },
  {
    id: "ls3",
    title: "France 24 Live",
    source: "France 24",
    lat: 48.8,
    lng: 2.3,
    country: "France",
    videoId: "h3MuIUNCCLI",
    description: "Live international news 24/7 from France 24",
    isStream: true,
  },
  {
    id: "ls4",
    title: "Bloomberg Markets Live",
    source: "Bloomberg",
    lat: 40.7,
    lng: -74.0,
    country: "USA",
    videoId: "dp8PhLsUcFE",
    description: "Live business news, market data, and financial analysis",
    isStream: true,
  },
  {
    id: "ls5",
    title: "ABC News Live",
    source: "ABC News",
    lat: 34.0,
    lng: -118.2,
    country: "USA",
    videoId: "W1Q3EWzGAMA",
    description: "Live breaking news coverage from ABC News",
    isStream: true,
  },
  {
    id: "ls6",
    title: "Sky News Live",
    source: "Sky News",
    lat: 51.5,
    lng: -0.1,
    country: "UK",
    videoId: "9Auq9mYxFEE",
    description: "Live 24/7 news from Sky News UK",
    isStream: true,
  },
  {
    id: "ls7",
    title: "NHK World Live",
    source: "NHK World",
    lat: 35.7,
    lng: 139.7,
    country: "Japan",
    videoId: "29GG4ACfbOA",
    description:
      "Japan's international public broadcaster — live news and programs",
    isStream: true,
  },
  {
    id: "ls8",
    title: "CGTN Global Live",
    source: "CGTN",
    lat: 39.9,
    lng: 116.4,
    country: "China",
    videoId: "LZALMDEjGlc",
    description: "Live news from China Global Television Network",
    isStream: true,
  },
  {
    id: "ls9",
    title: "Times Now Live",
    source: "Times Now",
    lat: 19.1,
    lng: 72.9,
    country: "India",
    videoId: "GXroGidJwFU",
    description: "India's leading English news channel — live breaking news",
    isStream: true,
  },
  {
    id: "ls10",
    title: "Euronews Live",
    source: "Euronews",
    lat: 45.7,
    lng: 4.8,
    country: "France",
    videoId: "g4FpLqLMSLk",
    description: "Live European and world news from Euronews",
    isStream: true,
  },
];

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
