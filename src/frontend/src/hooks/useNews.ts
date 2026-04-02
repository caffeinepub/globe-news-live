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
  {
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    source: "BBC",
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
    source: "DW",
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

    // Jitter to avoid pin stacking
    const jitter = () => (Math.random() - 0.5) * 2.5;

    if (geo) {
      results.push({
        id: `${feed.source}-${id++}-${Date.now()}`,
        title,
        description,
        url: link,
        source: feed.source,
        publishedAt: pubDate,
        lat: geo.lat + jitter(),
        lng: geo.lng + jitter(),
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
        lat: feed.defaultLat + offset.lat * 0.3 + jitter(),
        lng: feed.defaultLng + offset.lng * 0.3 + jitter(),
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

      // Sort by most recent
      allItems.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );

      console.log(`[useNews] Loaded ${allItems.length} news items`);
      setNews(allItems.slice(0, 150));
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
