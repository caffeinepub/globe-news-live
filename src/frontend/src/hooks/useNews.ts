import { useCallback, useEffect, useState } from "react";
import type { NewsItem } from "../backend.d";
import { geocodeText } from "../utils/geocode";

// rss2json.com: free, no API key needed (do NOT add &count= — that requires a paid key)
const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

const FEEDS: Array<{
  url: string;
  source: string;
  defaultLat: number;
  defaultLng: number;
  defaultCountry: string;
}> = [
  // ── Global / English ─────────────────────────────────────────────────
  {
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    source: "BBC World",
    defaultLat: 51.5,
    defaultLng: -0.1,
    defaultCountry: "UK",
  },
  {
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    source: "Al Jazeera",
    defaultLat: 25.3,
    defaultLng: 51.5,
    defaultCountry: "Qatar",
  },
  {
    url: "https://rss.dw.com/xml/rss-en-world",
    source: "DW World",
    defaultLat: 52.5,
    defaultLng: 13.4,
    defaultCountry: "Germany",
  },
  {
    url: "https://www.france24.com/en/rss",
    source: "France 24",
    defaultLat: 48.8,
    defaultLng: 2.3,
    defaultCountry: "France",
  },
  {
    url: "https://feeds.npr.org/1004/rss.xml",
    source: "NPR",
    defaultLat: 38.9,
    defaultLng: -77.0,
    defaultCountry: "USA",
  },
  {
    url: "https://www.theguardian.com/world/rss",
    source: "Guardian",
    defaultLat: 51.5,
    defaultLng: -0.1,
    defaultCountry: "UK",
  },
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    source: "NY Times",
    defaultLat: 40.7,
    defaultLng: -74.0,
    defaultCountry: "USA",
  },
  {
    url: "https://feeds.reuters.com/reuters/topNews",
    source: "Reuters",
    defaultLat: 51.5,
    defaultLng: -0.1,
    defaultCountry: "UK",
  },
  {
    url: "https://www.euronews.com/rss?format=mrss&level=theme&name=news",
    source: "Euronews",
    defaultLat: 45.7,
    defaultLng: 4.8,
    defaultCountry: "France",
  },
  {
    url: "https://feeds.skynews.com/feeds/rss/world.xml",
    source: "Sky News",
    defaultLat: 51.5,
    defaultLng: -0.1,
    defaultCountry: "UK",
  },
  {
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    source: "BBC Tech",
    defaultLat: 51.5,
    defaultLng: -0.1,
    defaultCountry: "UK",
  },
  {
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    source: "BBC Business",
    defaultLat: 51.5,
    defaultLng: -0.1,
    defaultCountry: "UK",
  },

  // ── Americas ─────────────────────────────────────────────────────────
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Americas.xml",
    source: "NYT Americas",
    defaultLat: 0.0,
    defaultLng: -70.0,
    defaultCountry: "Americas",
  },
  {
    url: "https://feeds.npr.org/1057/rss.xml",
    source: "NPR World",
    defaultLat: 38.9,
    defaultLng: -77.0,
    defaultCountry: "USA",
  },
  {
    url: "https://rss.dw.com/xml/rss-en-americas",
    source: "DW Americas",
    defaultLat: 0.0,
    defaultLng: -70.0,
    defaultCountry: "Americas",
  },
  {
    url: "https://www.theguardian.com/us-news/rss",
    source: "Guardian US",
    defaultLat: 40.7,
    defaultLng: -74.0,
    defaultCountry: "USA",
  },
  {
    url: "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml",
    source: "BBC Latin America",
    defaultLat: -15.0,
    defaultLng: -60.0,
    defaultCountry: "Latin America",
  },

  // ── Europe ───────────────────────────────────────────────────────────
  {
    url: "https://www.theguardian.com/world/europe-news/rss",
    source: "Guardian Europe",
    defaultLat: 50.0,
    defaultLng: 10.0,
    defaultCountry: "Europe",
  },
  {
    url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    source: "BBC Europe",
    defaultLat: 50.0,
    defaultLng: 10.0,
    defaultCountry: "Europe",
  },
  {
    url: "https://rss.dw.com/xml/rss-en-eu",
    source: "DW EU",
    defaultLat: 52.5,
    defaultLng: 13.4,
    defaultCountry: "Germany",
  },
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Europe.xml",
    source: "NYT Europe",
    defaultLat: 50.0,
    defaultLng: 10.0,
    defaultCountry: "Europe",
  },

  // ── Middle East & Africa ─────────────────────────────────────────────
  {
    url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    source: "BBC Middle East",
    defaultLat: 25.0,
    defaultLng: 45.0,
    defaultCountry: "Middle East",
  },
  {
    url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    source: "BBC Africa",
    defaultLat: 0.0,
    defaultLng: 20.0,
    defaultCountry: "Africa",
  },
  {
    url: "https://rss.dw.com/xml/rss-en-africa",
    source: "DW Africa",
    defaultLat: 0.0,
    defaultLng: 20.0,
    defaultCountry: "Africa",
  },
  {
    url: "https://rss.dw.com/xml/rss-en-middleeast",
    source: "DW Middle East",
    defaultLat: 25.0,
    defaultLng: 45.0,
    defaultCountry: "Middle East",
  },
  {
    url: "https://www.aljazeera.com/xml/rss/africa.xml",
    source: "Al Jazeera Africa",
    defaultLat: 0.0,
    defaultLng: 20.0,
    defaultCountry: "Africa",
  },
  {
    url: "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf",
    source: "All Africa",
    defaultLat: 0.0,
    defaultLng: 20.0,
    defaultCountry: "Africa",
  },

  // ── Asia Pacific ─────────────────────────────────────────────────────
  {
    url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    source: "BBC Asia",
    defaultLat: 20.0,
    defaultLng: 100.0,
    defaultCountry: "Asia",
  },
  {
    url: "https://rss.dw.com/xml/rss-en-asia",
    source: "DW Asia",
    defaultLat: 20.0,
    defaultLng: 100.0,
    defaultCountry: "Asia",
  },
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml",
    source: "NYT Asia",
    defaultLat: 20.0,
    defaultLng: 100.0,
    defaultCountry: "Asia",
  },
  {
    url: "https://www.theguardian.com/world/asia/rss",
    source: "Guardian Asia",
    defaultLat: 20.0,
    defaultLng: 100.0,
    defaultCountry: "Asia",
  },
  {
    url: "https://www.channelnewsasia.com/rss/feeds/world",
    source: "CNA",
    defaultLat: 1.4,
    defaultLng: 103.8,
    defaultCountry: "Singapore",
  },
  {
    url: "https://japantoday.com/feed",
    source: "Japan Today",
    defaultLat: 35.7,
    defaultLng: 139.7,
    defaultCountry: "Japan",
  },
  {
    url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    source: "Times of India",
    defaultLat: 28.6,
    defaultLng: 77.2,
    defaultCountry: "India",
  },
  {
    url: "https://rss.dw.com/xml/rss-en-south-asia",
    source: "DW South Asia",
    defaultLat: 23.0,
    defaultLng: 80.0,
    defaultCountry: "South Asia",
  },

  // ── Russia / Eastern Europe ───────────────────────────────────────────
  {
    url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    source: "BBC EE",
    defaultLat: 55.0,
    defaultLng: 40.0,
    defaultCountry: "Russia",
  },
  {
    url: "https://rss.dw.com/xml/rss-en-ukraine",
    source: "DW Ukraine",
    defaultLat: 50.4,
    defaultLng: 30.5,
    defaultCountry: "Ukraine",
  },

  // ── Oceania ───────────────────────────────────────────────────────────
  {
    url: "https://www.rnz.co.nz/rss/world.xml",
    source: "RNZ",
    defaultLat: -41.3,
    defaultLng: 174.8,
    defaultCountry: "New Zealand",
  },
  {
    url: "https://www.abc.net.au/news/feed/2942460/rss.xml",
    source: "ABC Australia",
    defaultLat: -35.3,
    defaultLng: 149.1,
    defaultCountry: "Australia",
  },

  // ── Science / Technology ──────────────────────────────────────────────
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml",
    source: "NYT Science",
    defaultLat: 40.7,
    defaultLng: -74.0,
    defaultCountry: "USA",
  },
  {
    url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    source: "BBC Science",
    defaultLat: 51.5,
    defaultLng: -0.1,
    defaultCountry: "UK",
  },
];

const REFRESH_MS = 60 * 60 * 1000; // 1 hour

interface Rss2JsonItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content?: string;
}

// Spread fallback pins around the globe to avoid stacking
const FALLBACK_OFFSETS = [
  { lat: 0, lng: 0 },
  { lat: 5, lng: 20 },
  { lat: -5, lng: -20 },
  { lat: 10, lng: 40 },
  { lat: -10, lng: -40 },
  { lat: 15, lng: 60 },
  { lat: -15, lng: -60 },
  { lat: 20, lng: 80 },
  { lat: -20, lng: -80 },
  { lat: 25, lng: 100 },
];

async function fetchFeed(feed: (typeof FEEDS)[0]): Promise<NewsItem[]> {
  // IMPORTANT: do not append &count= — it requires a paid rss2json API key
  const apiUrl = `${RSS2JSON}${encodeURIComponent(feed.url)}`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
  const json = await res.json();

  if (json.status !== "ok" || !Array.isArray(json.items)) {
    console.warn(
      `[useNews] Feed ${feed.source} returned status=${json.status}`,
      json.message,
    );
    return [];
  }

  const results: NewsItem[] = [];
  let id = 0;

  for (const item of json.items as Rss2JsonItem[]) {
    const title = (item.title ?? "").trim();
    const link = (item.link ?? "").trim();
    const description = (item.description ?? item.content ?? "")
      .replace(/<[^>]*>/g, "")
      .trim()
      .slice(0, 300);
    const pubDate = item.pubDate ?? "";

    if (!title || !link) continue;

    // Geocode from title + description
    const geo = geocodeText(`${title} ${description}`);

    // Jitter scales by geocoding precision:
    // city-level = 0.3° (tight, accurate pin placement)
    // country-level = 1.5° (spread to indicate uncertainty)
    // fallback = 2.0° (wide spread)
    const jitter = (radius: number) => (Math.random() - 0.5) * radius * 2;

    if (geo) {
      const jitterRadius = geo.precision === "city" ? 0.3 : 1.5;
      results.push({
        id: `${feed.source}-${id++}-${Date.now()}`,
        title,
        description,
        url: link,
        source: feed.source,
        publishedAt: pubDate,
        lat: geo.lat + jitter(jitterRadius),
        lng: geo.lng + jitter(jitterRadius),
        country: geo.country,
      });
    } else {
      // Fallback: place pin near the feed's origin country with spread offsets
      const offset = FALLBACK_OFFSETS[id % FALLBACK_OFFSETS.length];
      results.push({
        id: `${feed.source}-${id++}-${Date.now()}`,
        title,
        description,
        url: link,
        source: feed.source,
        publishedAt: pubDate,
        lat: feed.defaultLat + offset.lat * 0.3 + jitter(2.0),
        lng: feed.defaultLng + offset.lng * 0.3 + jitter(2.0),
        country: feed.defaultCountry,
      });
    }
  }

  return results;
}

export function useNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await Promise.allSettled(FEEDS.map(fetchFeed));
      const allItems: NewsItem[] = [];
      const seenUrls = new Set<string>();

      for (const result of results) {
        if (result.status === "fulfilled") {
          for (const item of result.value) {
            if (!seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              allItems.push(item);
            }
          }
        } else {
          console.warn("[useNews] Feed failed:", result.reason);
        }
      }

      // Sort by most recent first
      allItems.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );

      console.log(`[useNews] Loaded ${allItems.length} news items`);
      setNews(allItems.slice(0, 400));
      setLastUpdated(new Date());
    } catch (e) {
      console.error("[useNews] Failed to load news", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { news, isLoading, lastUpdated, refresh };
}
