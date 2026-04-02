// Country name/keyword → approximate lat/lng
// Used to geocode news stories by scanning title+description for country names

export interface GeoLocation {
  lat: number;
  lng: number;
  country: string;
}

// Ordered from most-specific (multi-word) to least to avoid partial matches
export const COUNTRY_GEO: Array<{
  keywords: string[];
  lat: number;
  lng: number;
  country: string;
}> = [
  // Americas
  {
    keywords: [
      "united states",
      "u.s.",
      "u.s.a",
      "usa",
      "america",
      "washington d.c",
      "washington dc",
      "white house",
      "pentagon",
      "congress",
      "senate",
    ],
    lat: 38.9,
    lng: -77.0,
    country: "USA",
  },
  { keywords: ["new york"], lat: 40.7, lng: -74.0, country: "USA" },
  {
    keywords: ["los angeles", "california"],
    lat: 34.0,
    lng: -118.2,
    country: "USA",
  },
  { keywords: ["chicago"], lat: 41.8, lng: -87.6, country: "USA" },
  {
    keywords: ["texas", "houston", "dallas", "austin"],
    lat: 30.3,
    lng: -97.7,
    country: "USA",
  },
  {
    keywords: ["florida", "miami", "orlando", "tallahassee"],
    lat: 27.9,
    lng: -81.5,
    country: "USA",
  },
  {
    keywords: [
      "canada",
      "ottawa",
      "toronto",
      "vancouver",
      "montreal",
      "quebec",
    ],
    lat: 45.4,
    lng: -75.7,
    country: "Canada",
  },
  {
    keywords: ["mexico", "mexico city"],
    lat: 19.4,
    lng: -99.1,
    country: "Mexico",
  },
  {
    keywords: [
      "brazil",
      "brasilia",
      "rio de janeiro",
      "são paulo",
      "sao paulo",
    ],
    lat: -15.8,
    lng: -47.9,
    country: "Brazil",
  },
  {
    keywords: ["argentina", "buenos aires"],
    lat: -34.6,
    lng: -58.4,
    country: "Argentina",
  },
  {
    keywords: ["colombia", "bogota", "bogotá"],
    lat: 4.7,
    lng: -74.1,
    country: "Colombia",
  },
  { keywords: ["chile", "santiago"], lat: -33.5, lng: -70.6, country: "Chile" },
  {
    keywords: ["venezuela", "caracas"],
    lat: 10.5,
    lng: -66.9,
    country: "Venezuela",
  },
  { keywords: ["peru", "lima"], lat: -12.0, lng: -77.0, country: "Peru" },
  { keywords: ["cuba", "havana"], lat: 23.1, lng: -82.4, country: "Cuba" },
  {
    keywords: ["haiti", "port-au-prince"],
    lat: 18.5,
    lng: -72.3,
    country: "Haiti",
  },
  {
    keywords: ["venezuela", "caracas"],
    lat: 10.5,
    lng: -66.9,
    country: "Venezuela",
  },

  // Europe
  {
    keywords: [
      "united kingdom",
      "u.k.",
      "uk ",
      "britain",
      "british",
      "england",
      "london",
      "scotland",
      "wales",
      "westminster",
      "downing street",
    ],
    lat: 51.5,
    lng: -0.1,
    country: "UK",
  },
  {
    keywords: ["france", "paris", "french", "elysee", "élysée"],
    lat: 48.8,
    lng: 2.3,
    country: "France",
  },
  {
    keywords: [
      "germany",
      "berlin",
      "german",
      "bundestag",
      "bundesrat",
      "munich",
      "hamburg",
      "frankfurt",
    ],
    lat: 52.5,
    lng: 13.4,
    country: "Germany",
  },
  {
    keywords: [
      "russia",
      "moscow",
      "kremlin",
      "russian",
      "putin",
      "siberia",
      "st petersburg",
    ],
    lat: 55.7,
    lng: 37.6,
    country: "Russia",
  },
  {
    keywords: ["ukraine", "kyiv", "kiev", "ukrainian", "zelensky", "zelenskyy"],
    lat: 50.4,
    lng: 30.5,
    country: "Ukraine",
  },
  {
    keywords: ["italy", "rome", "italian", "milan", "naples", "sicily"],
    lat: 41.9,
    lng: 12.5,
    country: "Italy",
  },
  {
    keywords: ["spain", "madrid", "barcelona", "spanish"],
    lat: 40.4,
    lng: -3.7,
    country: "Spain",
  },
  {
    keywords: ["poland", "warsaw", "polish", "krakow"],
    lat: 52.2,
    lng: 21.0,
    country: "Poland",
  },
  {
    keywords: ["netherlands", "amsterdam", "dutch", "hague", "the hague"],
    lat: 52.4,
    lng: 4.9,
    country: "Netherlands",
  },
  {
    keywords: ["sweden", "stockholm", "swedish"],
    lat: 59.3,
    lng: 18.1,
    country: "Sweden",
  },
  {
    keywords: ["norway", "oslo", "norwegian"],
    lat: 59.9,
    lng: 10.7,
    country: "Norway",
  },
  {
    keywords: ["denmark", "copenhagen", "danish"],
    lat: 55.7,
    lng: 12.6,
    country: "Denmark",
  },
  {
    keywords: ["finland", "helsinki", "finnish"],
    lat: 60.2,
    lng: 24.9,
    country: "Finland",
  },
  {
    keywords: ["switzerland", "bern", "zurich", "geneva", "swiss"],
    lat: 46.9,
    lng: 7.4,
    country: "Switzerland",
  },
  {
    keywords: ["austria", "vienna", "austrian"],
    lat: 48.2,
    lng: 16.4,
    country: "Austria",
  },
  {
    keywords: ["belgium", "brussels", "belgian"],
    lat: 50.8,
    lng: 4.4,
    country: "Belgium",
  },
  {
    keywords: ["portugal", "lisbon", "portuguese"],
    lat: 38.7,
    lng: -9.1,
    country: "Portugal",
  },
  {
    keywords: ["greece", "athens", "greek"],
    lat: 37.9,
    lng: 23.7,
    country: "Greece",
  },
  {
    keywords: ["hungary", "budapest", "hungarian", "orban"],
    lat: 47.5,
    lng: 19.0,
    country: "Hungary",
  },
  {
    keywords: ["czech republic", "czechia", "prague"],
    lat: 50.1,
    lng: 14.4,
    country: "Czech Republic",
  },
  {
    keywords: ["romania", "bucharest", "romanian"],
    lat: 44.4,
    lng: 26.1,
    country: "Romania",
  },
  {
    keywords: ["serbia", "belgrade", "serbian"],
    lat: 44.8,
    lng: 20.5,
    country: "Serbia",
  },
  {
    keywords: ["turkey", "ankara", "istanbul", "turkish", "erdogan"],
    lat: 39.9,
    lng: 32.9,
    country: "Turkey",
  },

  // Middle East
  {
    keywords: ["israel", "jerusalem", "tel aviv", "israeli", "netanyahu"],
    lat: 31.8,
    lng: 35.2,
    country: "Israel",
  },
  {
    keywords: ["gaza", "hamas", "west bank", "palestine", "palestinian"],
    lat: 31.5,
    lng: 34.5,
    country: "Palestine",
  },
  {
    keywords: ["iran", "tehran", "iranian", "khamenei"],
    lat: 35.7,
    lng: 51.4,
    country: "Iran",
  },
  {
    keywords: ["iraq", "baghdad", "iraqi"],
    lat: 33.3,
    lng: 44.4,
    country: "Iraq",
  },
  {
    keywords: ["saudi arabia", "riyadh", "jeddah", "saudi"],
    lat: 24.7,
    lng: 46.7,
    country: "Saudi Arabia",
  },
  {
    keywords: ["syria", "damascus", "syrian", "aleppo"],
    lat: 33.5,
    lng: 36.3,
    country: "Syria",
  },
  {
    keywords: ["lebanon", "beirut", "lebanese", "hezbollah"],
    lat: 33.9,
    lng: 35.5,
    country: "Lebanon",
  },
  {
    keywords: ["yemen", "sanaa", "houthi"],
    lat: 15.4,
    lng: 44.2,
    country: "Yemen",
  },
  {
    keywords: ["jordan", "amman", "jordanian"],
    lat: 31.9,
    lng: 35.9,
    country: "Jordan",
  },
  {
    keywords: ["qatar", "doha", "qatari"],
    lat: 25.3,
    lng: 51.5,
    country: "Qatar",
  },
  {
    keywords: ["uae", "dubai", "abu dhabi", "emirates"],
    lat: 24.5,
    lng: 54.4,
    country: "UAE",
  },
  { keywords: ["kuwait", "kuwaiti"], lat: 29.4, lng: 47.9, country: "Kuwait" },
  { keywords: ["bahrain", "manama"], lat: 26.2, lng: 50.6, country: "Bahrain" },
  { keywords: ["oman", "muscat"], lat: 23.6, lng: 58.6, country: "Oman" },
  {
    keywords: ["afghanistan", "kabul", "afghan", "taliban"],
    lat: 34.5,
    lng: 69.2,
    country: "Afghanistan",
  },
  {
    keywords: ["pakistan", "islamabad", "karachi", "lahore", "pakistani"],
    lat: 33.7,
    lng: 73.1,
    country: "Pakistan",
  },

  // Asia
  {
    keywords: [
      "china",
      "beijing",
      "shanghai",
      "chinese",
      "xi jinping",
      "hong kong",
      "shenzhen",
    ],
    lat: 39.9,
    lng: 116.4,
    country: "China",
  },
  { keywords: ["hong kong"], lat: 22.3, lng: 114.2, country: "Hong Kong" },
  {
    keywords: ["taiwan", "taipei", "taiwanese"],
    lat: 25.0,
    lng: 121.5,
    country: "Taiwan",
  },
  {
    keywords: ["japan", "tokyo", "japanese", "osaka", "kyoto"],
    lat: 35.7,
    lng: 139.7,
    country: "Japan",
  },
  {
    keywords: ["south korea", "korea", "seoul", "korean"],
    lat: 37.5,
    lng: 126.9,
    country: "South Korea",
  },
  {
    keywords: ["north korea", "pyongyang", "kim jong"],
    lat: 39.0,
    lng: 125.8,
    country: "North Korea",
  },
  {
    keywords: [
      "india",
      "new delhi",
      "delhi",
      "mumbai",
      "modi",
      "indian",
      "bangalore",
      "kolkata",
    ],
    lat: 28.6,
    lng: 77.2,
    country: "India",
  },
  {
    keywords: ["bangladesh", "dhaka", "bangladeshi"],
    lat: 23.7,
    lng: 90.4,
    country: "Bangladesh",
  },
  {
    keywords: ["myanmar", "burma", "yangon", "naypyidaw"],
    lat: 19.7,
    lng: 96.1,
    country: "Myanmar",
  },
  {
    keywords: ["thailand", "bangkok", "thai"],
    lat: 13.8,
    lng: 100.5,
    country: "Thailand",
  },
  {
    keywords: ["vietnam", "hanoi", "ho chi minh", "vietnamese"],
    lat: 21.0,
    lng: 105.8,
    country: "Vietnam",
  },
  {
    keywords: ["indonesia", "jakarta", "indonesian", "bali"],
    lat: -6.2,
    lng: 106.8,
    country: "Indonesia",
  },
  {
    keywords: ["philippines", "manila", "filipino"],
    lat: 14.6,
    lng: 120.9,
    country: "Philippines",
  },
  {
    keywords: ["malaysia", "kuala lumpur", "malaysian"],
    lat: 3.1,
    lng: 101.7,
    country: "Malaysia",
  },
  {
    keywords: ["singapore", "singaporean"],
    lat: 1.4,
    lng: 103.8,
    country: "Singapore",
  },
  {
    keywords: ["cambodia", "phnom penh"],
    lat: 11.6,
    lng: 104.9,
    country: "Cambodia",
  },
  {
    keywords: ["sri lanka", "colombo"],
    lat: 6.9,
    lng: 79.9,
    country: "Sri Lanka",
  },
  { keywords: ["nepal", "kathmandu"], lat: 27.7, lng: 85.3, country: "Nepal" },
  {
    keywords: ["kazakhstan", "astana"],
    lat: 51.2,
    lng: 71.4,
    country: "Kazakhstan",
  },
  {
    keywords: ["uzbekistan", "tashkent"],
    lat: 41.3,
    lng: 69.2,
    country: "Uzbekistan",
  },
  {
    keywords: ["mongolia", "ulaanbaatar"],
    lat: 47.9,
    lng: 106.9,
    country: "Mongolia",
  },

  // Africa
  {
    keywords: ["nigeria", "abuja", "lagos", "nigerian"],
    lat: 9.1,
    lng: 7.5,
    country: "Nigeria",
  },
  {
    keywords: [
      "south africa",
      "pretoria",
      "johannesburg",
      "cape town",
      "south african",
    ],
    lat: -25.7,
    lng: 28.2,
    country: "South Africa",
  },
  {
    keywords: ["egypt", "cairo", "egyptian"],
    lat: 30.0,
    lng: 31.2,
    country: "Egypt",
  },
  {
    keywords: ["ethiopia", "addis ababa", "ethiopian"],
    lat: 9.0,
    lng: 38.7,
    country: "Ethiopia",
  },
  {
    keywords: ["kenya", "nairobi", "kenyan"],
    lat: -1.3,
    lng: 36.8,
    country: "Kenya",
  },
  {
    keywords: ["tanzania", "dar es salaam", "tanzanian"],
    lat: -6.8,
    lng: 39.3,
    country: "Tanzania",
  },
  {
    keywords: ["ghana", "accra", "ghanaian"],
    lat: 5.6,
    lng: -0.2,
    country: "Ghana",
  },
  {
    keywords: ["senegal", "dakar", "senegalese"],
    lat: 14.7,
    lng: -17.4,
    country: "Senegal",
  },
  {
    keywords: ["morocco", "rabat", "casablanca", "moroccan"],
    lat: 34.0,
    lng: -6.8,
    country: "Morocco",
  },
  {
    keywords: ["libya", "tripoli", "libyan"],
    lat: 32.9,
    lng: 13.2,
    country: "Libya",
  },
  {
    keywords: ["sudan", "khartoum", "sudanese"],
    lat: 15.6,
    lng: 32.5,
    country: "Sudan",
  },
  {
    keywords: ["somalia", "mogadishu", "somali", "al-shabaab"],
    lat: 2.1,
    lng: 45.3,
    country: "Somalia",
  },
  {
    keywords: ["congo", "kinshasa", "drc", "democratic republic"],
    lat: -4.3,
    lng: 15.3,
    country: "DR Congo",
  },
  {
    keywords: ["mali", "bamako", "malian"],
    lat: 12.6,
    lng: -8.0,
    country: "Mali",
  },
  {
    keywords: ["zimbabwe", "harare", "zimbabwean"],
    lat: -17.8,
    lng: 31.1,
    country: "Zimbabwe",
  },
  {
    keywords: ["mozambique", "maputo"],
    lat: -25.9,
    lng: 32.6,
    country: "Mozambique",
  },
  { keywords: ["angola", "luanda"], lat: -8.8, lng: 13.2, country: "Angola" },
  {
    keywords: ["cameroon", "yaounde"],
    lat: 3.9,
    lng: 11.5,
    country: "Cameroon",
  },

  // Oceania
  {
    keywords: ["australia", "canberra", "sydney", "melbourne", "australian"],
    lat: -35.3,
    lng: 149.1,
    country: "Australia",
  },
  {
    keywords: ["new zealand", "wellington", "auckland", "kiwi"],
    lat: -41.3,
    lng: 174.8,
    country: "New Zealand",
  },

  // International orgs / global
  {
    keywords: [
      "united nations",
      "un ",
      "nato",
      "g7",
      "g20",
      "imf",
      "world bank",
      "wto",
      "who ",
      "eu ",
      "european union",
    ],
    lat: 40.7,
    lng: -74.0,
    country: "International",
  },
];

/**
 * Scan text for country keywords and return the best GeoLocation match.
 * Returns null if no match found.
 */
export function geocodeText(text: string): GeoLocation | null {
  const lower = text.toLowerCase();
  // Try most specific (multi-word) first by iterating in order
  for (const entry of COUNTRY_GEO) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return { lat: entry.lat, lng: entry.lng, country: entry.country };
      }
    }
  }
  return null;
}
