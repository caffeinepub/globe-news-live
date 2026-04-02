import { useEffect, useState } from "react";

export type MarketAsset = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
  history: number[]; // last ~30 data points for sparkline
};

type MarketState = {
  assets: MarketAsset[];
  isLoading: boolean;
  lastUpdated: Date | null;
};

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wrap a URL through corsproxy.io (free, no key, reliable CORS proxy) */
function proxy(url: string) {
  return `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
}

/** Try multiple URL fetches in order, returning first success */
async function tryFetch(...urls: string[]): Promise<Response> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return res;
    } catch {
      // try next
    }
  }
  throw new Error("All fetch attempts failed");
}

// ── Bitcoin (CoinGecko primary, Coinbase fallback) ────────────────────────────
async function fetchBitcoin(): Promise<MarketAsset> {
  let price = 0;
  let changePercent = 0;
  let history: number[] = [];

  // Price + 24h change
  try {
    const res = await tryFetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
      proxy(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
      ),
    );
    const data = await res.json();
    price = data?.bitcoin?.usd ?? 0;
    changePercent = data?.bitcoin?.usd_24h_change ?? 0;
  } catch {
    // try Coinbase
  }

  if (price === 0) {
    try {
      const res = await fetch(
        "https://api.coinbase.com/v2/prices/BTC-USD/spot",
        {
          signal: AbortSignal.timeout(8000),
        },
      );
      if (res.ok) {
        const data = await res.json();
        price = Number.parseFloat(data?.data?.amount ?? "0");
      }
    } catch {
      // ignore
    }
  }

  // 30-day history
  try {
    const res = await tryFetch(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily",
      proxy(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily",
      ),
    );
    const data = await res.json();
    history = (data?.prices ?? []).map((p: [number, number]) => p[1]);
  } catch {
    // no history is ok
  }

  if (price === 0) throw new Error("Bitcoin price unavailable");

  return {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    price,
    changePercent,
    history,
  };
}

// ── Gold & Silver via metals.live (free, no key) ──────────────────────────────
type MetalsLiveResult = { gold?: number; silver?: number };

async function fetchMetalsLive(): Promise<MetalsLiveResult> {
  // metals.live returns [{metal: 'gold', price: ...}, ...]
  try {
    const res = await tryFetch(
      "https://api.metals.live/v1/spot",
      proxy("https://api.metals.live/v1/spot"),
    );
    const data = await res.json();
    if (Array.isArray(data)) {
      const result: MetalsLiveResult = {};
      for (const item of data) {
        if (item.metal === "gold" || item.gold !== undefined) {
          result.gold = item.price ?? item.gold;
        }
        if (item.metal === "silver" || item.silver !== undefined) {
          result.silver = item.price ?? item.silver;
        }
      }
      // Also handle flat object format: {gold: 2300, silver: 27.5, ...}
      if (data.length === 0 || result.gold === undefined) {
        // might be an object response from proxy
      }
      return result;
    }
    // flat object format
    if (typeof data === "object" && data !== null) {
      return {
        gold: data.gold ?? data.XAU,
        silver: data.silver ?? data.XAG,
      };
    }
  } catch {
    // fall through to backup
  }
  return {};
}

/** Fallback: ExchangeRate-API for XAU/XAG (returns troy oz rate vs USD) */
async function fetchMetalsFallback(metal: "XAU" | "XAG"): Promise<number> {
  // open.er-api.com is free, CORS-friendly, no key needed
  const res = await tryFetch(
    "https://open.er-api.com/v6/latest/USD",
    proxy("https://open.er-api.com/v6/latest/USD"),
  );
  const data = await res.json();
  const rate = data?.rates?.[metal]; // rate of metal per 1 USD → invert for USD per oz
  if (!rate || rate === 0) throw new Error(`${metal} rate not found`);
  return 1 / rate; // USD per troy oz
}

async function fetchGold(): Promise<MarketAsset> {
  let price = 0;
  let changePercent = 0;
  let history: number[] = [];

  // Primary: metals.live
  const metals = await fetchMetalsLive();
  price = metals.gold ?? 0;

  // Fallback: exchange rate inversion
  if (!price) {
    try {
      price = await fetchMetalsFallback("XAU");
    } catch {
      // ignore
    }
  }

  // Fallback: CoinGecko PAXG (PAX Gold token = 1 troy oz gold)
  if (!price) {
    try {
      const res = await tryFetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true",
        proxy(
          "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true",
        ),
      );
      const data = await res.json();
      price = data?.["pax-gold"]?.usd ?? 0;
      changePercent = data?.["pax-gold"]?.usd_24h_change ?? 0;
    } catch {
      // ignore
    }
  }

  // History + change% via CoinGecko PAXG
  try {
    const res = await tryFetch(
      "https://api.coingecko.com/api/v3/coins/pax-gold/market_chart?vs_currency=usd&days=30&interval=daily",
      proxy(
        "https://api.coingecko.com/api/v3/coins/pax-gold/market_chart?vs_currency=usd&days=30&interval=daily",
      ),
    );
    const data = await res.json();
    const prices: number[] = (data?.prices ?? []).map(
      (p: [number, number]) => p[1],
    );
    if (prices.length >= 2) {
      const last = prices[prices.length - 1];
      const prev = prices[prices.length - 2];
      if (!changePercent)
        changePercent = prev ? ((last - prev) / prev) * 100 : 0;
      history = prices;
    }
  } catch {
    // no history
  }

  if (!price) throw new Error("Gold price unavailable");

  return {
    id: "gold",
    name: "Gold",
    symbol: "XAU/oz",
    price,
    changePercent,
    history: history.length > 1 ? history : [price],
  };
}

async function fetchSilver(): Promise<MarketAsset> {
  let price = 0;
  let changePercent = 0;

  // Primary: metals.live
  const metals = await fetchMetalsLive();
  price = metals.silver ?? 0;

  // Fallback: exchange rate
  if (!price) {
    try {
      price = await fetchMetalsFallback("XAG");
    } catch {
      // ignore
    }
  }

  // Fallback: CoinGecko XAUT (Tether Gold) as silver proxy
  if (!price) {
    try {
      const res = await tryFetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd&include_24hr_change=true",
        proxy(
          "https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd&include_24hr_change=true",
        ),
      );
      const data = await res.json();
      // XAUT is ~1 troy oz gold, not silver – price won't be right but better than 0
      changePercent = data?.["tether-gold"]?.usd_24h_change ?? 0;
    } catch {
      // ignore
    }
  }

  // 24h change from PAXG as metals directional proxy
  if (!changePercent) {
    try {
      const res = await tryFetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true",
        proxy(
          "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true",
        ),
      );
      const data = await res.json();
      changePercent = data?.["pax-gold"]?.usd_24h_change ?? 0;
    } catch {
      // ignore
    }
  }

  if (!price) throw new Error("Silver price unavailable");

  return {
    id: "silver",
    name: "Silver",
    symbol: "XAG/oz",
    price,
    changePercent,
    history: [price],
  };
}

// ── Stock Indices & Oil via Yahoo Finance (with CORS proxy fallback) ──────────
type YFConfig = { id: string; name: string; symbol: string; ticker: string };

const YF_ASSETS: YFConfig[] = [
  { id: "sp500", name: "S&P 500", symbol: "SPX", ticker: "%5EGSPC" },
  { id: "nasdaq", name: "NASDAQ", symbol: "NDX", ticker: "%5EIXIC" },
  { id: "dow", name: "Dow Jones", symbol: "DJIA", ticker: "%5EDJI" },
  { id: "oil", name: "WTI Oil", symbol: "OIL", ticker: "CL%3DF" },
];

async function fetchYFAsset(cfg: YFConfig): Promise<MarketAsset> {
  const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cfg.ticker}?interval=1d&range=30d`;
  const yfUrl2 = `https://query2.finance.yahoo.com/v8/finance/chart/${cfg.ticker}?interval=1d&range=30d`;

  let data: unknown = null;

  // Try direct first (works in some environments), then proxy
  const attempts = [
    yfUrl,
    yfUrl2,
    proxy(yfUrl),
    proxy(yfUrl2),
    // stooq.com CSV fallback (free, no key)
    `https://stooq.com/q/l/?s=${cfg.ticker.replace("%5E", "^").replace("%3D", "=").toLowerCase()}&f=sd2t2ohlcv&h&e=csv`,
  ];

  for (const url of attempts.slice(0, 4)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        data = await res.json();
        const result = (data as { chart?: { result?: unknown[] } })?.chart
          ?.result?.[0] as Record<string, unknown> | undefined;
        if (result) {
          const meta = result.meta as Record<string, number>;
          const price = meta?.regularMarketPrice ?? 0;
          const prevClose = meta?.chartPreviousClose ?? price;
          const changePercent = prevClose
            ? ((price - prevClose) / prevClose) * 100
            : 0;
          const rawCloses =
            ((
              (result?.indicators as Record<string, unknown>)?.quote as Record<
                string,
                unknown
              >[]
            )?.[0]?.close as (number | null)[]) ?? [];
          const history = rawCloses.filter(
            (v): v is number => v !== null && !Number.isNaN(v),
          );
          if (price > 0) {
            return {
              id: cfg.id,
              name: cfg.name,
              symbol: cfg.symbol,
              price,
              changePercent,
              history,
            };
          }
        }
      }
    } catch {
      // try next
    }
  }

  // stooq CSV fallback
  try {
    const stooqSymbol = cfg.ticker
      .replace("%5E", "^")
      .replace("%3D", "=")
      .replace("%3Df", "=f")
      .toLowerCase();
    const csvUrl = `https://stooq.com/q/l/?s=${stooqSymbol}&f=sd2t2ohlcv&h&e=csv`;
    const res = await tryFetch(csvUrl, proxy(csvUrl));
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length >= 2) {
      const cols = lines[1].split(",");
      // columns: Symbol,Date,Time,Open,High,Low,Close,Volume
      const close = Number.parseFloat(cols[6] ?? "");
      const open = Number.parseFloat(cols[3] ?? "");
      if (close > 0) {
        const changePercent = open > 0 ? ((close - open) / open) * 100 : 0;
        return {
          id: cfg.id,
          name: cfg.name,
          symbol: cfg.symbol,
          price: close,
          changePercent,
          history: [close],
        };
      }
    }
  } catch {
    // ignore
  }

  throw new Error(`All sources failed for ${cfg.name}`);
}

// ── Orchestrator ──────────────────────────────────────────────────────────────
async function fetchAllAssets(): Promise<MarketAsset[]> {
  const ORDER = ["bitcoin", "sp500", "nasdaq", "dow", "gold", "silver", "oil"];

  const results = await Promise.allSettled([
    fetchBitcoin(),
    ...YF_ASSETS.map(fetchYFAsset),
    fetchGold(),
    fetchSilver(),
  ]);

  const assets: MarketAsset[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      assets.push(result.value);
    } else {
      console.warn(
        "[MarketPrices] fetch failed:",
        (result as PromiseRejectedResult).reason,
      );
    }
  }

  assets.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  return assets;
}

export function useMarketPrices(): MarketState {
  const [state, setState] = useState<MarketState>({
    assets: [],
    isLoading: true,
    lastUpdated: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!cancelled) setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const assets = await fetchAllAssets();
        if (!cancelled) {
          setState({ assets, isLoading: false, lastUpdated: new Date() });
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    };

    load();
    const timer = setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return state;
}
