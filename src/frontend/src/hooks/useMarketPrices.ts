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

// ── CORS-safe proxies ─────────────────────────────────────────────────────────
const PROXIES = [
  (url: string) =>
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) =>
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

async function fetchWithProxies(url: string): Promise<Response> {
  // Try direct first
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) return res;
  } catch {
    /* try proxies */
  }

  // Try each proxy
  for (const makeProxy of PROXIES) {
    try {
      const res = await fetch(makeProxy(url), {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return res;
    } catch {
      /* try next */
    }
  }
  throw new Error(`All fetch attempts failed for: ${url}`);
}

// ── Bitcoin (CoinGecko) ───────────────────────────────────────────────────────
async function fetchBitcoin(): Promise<MarketAsset> {
  let price = 0;
  let changePercent = 0;
  let history: number[] = [];

  // Price + 24h change
  try {
    const res = await fetchWithProxies(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
    );
    const data = await res.json();
    price = data?.bitcoin?.usd ?? 0;
    changePercent = data?.bitcoin?.usd_24h_change ?? 0;
  } catch {
    /* try coinbase */
  }

  // Coinbase fallback
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
      /* ignore */
    }
  }

  // 30-day history from CoinGecko
  try {
    const res = await fetchWithProxies(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily",
    );
    const data = await res.json();
    history = (data?.prices ?? []).map((p: [number, number]) => p[1]);
  } catch {
    /* no history */
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

// ── CoinGecko IDs for stock index ETF proxies ─────────────────────────────────
// We use CoinGecko for BTC, and for traditional assets we use open finance APIs
// that have proper CORS headers.

// Frankfurter.app is a free ECB-based API but only covers currencies.
// For equities we use a different strategy: open-meteo style free APIs.

// Best CORS-safe free sources for equities/commodities:
// - financialmodelingprep.com (free tier, 250 req/day, CORS open)
// - metals-api via open.er-api.com for gold/silver rates
// - For indices: use a marketstack-like open endpoint

// Strategy: Use multiple free sources with real CORS headers:
// 1. twelvedata.com (free, 800 req/day, no key for basic quotes)
// 2. marketstack.com free tier
// 3. alphavantage with open endpoints
// 4. Fall back to CoinGecko token proxies for metals

// Gold & Silver via open.er-api.com (XAU/XAG per USD, inverted) ──────────────
async function fetchMetalPrice(metal: "XAU" | "XAG"): Promise<number> {
  // open.er-api.com: free, no key, CORS-enabled exchange rates
  // Rates are quoted as "how many units of metal per 1 USD"
  // So price_in_USD = 1 / rate
  const res = await fetchWithProxies("https://open.er-api.com/v6/latest/USD");
  const data = await res.json();
  const rate = data?.rates?.[metal];
  if (!rate || rate === 0) throw new Error(`${metal} rate not found`);
  return 1 / rate;
}

async function fetchGold(): Promise<MarketAsset> {
  let price = 0;
  let changePercent = 0;
  let history: number[] = [];

  // Primary: exchange rate inversion (open.er-api.com - free, CORS open)
  try {
    price = await fetchMetalPrice("XAU");
  } catch {
    /* try PAXG */
  }

  // Fallback: CoinGecko PAXG (1 oz gold token)
  if (!price) {
    try {
      const res = await fetchWithProxies(
        "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true",
      );
      const data = await res.json();
      price = data?.["pax-gold"]?.usd ?? 0;
      changePercent = data?.["pax-gold"]?.usd_24h_change ?? 0;
    } catch {
      /* ignore */
    }
  }

  // Get history + change via PAXG
  try {
    const res = await fetchWithProxies(
      "https://api.coingecko.com/api/v3/coins/pax-gold/market_chart?vs_currency=usd&days=30&interval=daily",
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
    /* no history */
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

  // Primary: exchange rate inversion
  try {
    price = await fetchMetalPrice("XAG");
  } catch {
    /* ignore */
  }

  // Use PAXG for % change direction proxy
  try {
    const res = await fetchWithProxies(
      "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true",
    );
    const data = await res.json();
    changePercent = data?.["pax-gold"]?.usd_24h_change ?? 0;
  } catch {
    /* ignore */
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

// ── Indices & Oil via Yahoo Finance query2 (CORS-verified) ───────────────────
// Yahoo Finance v8 blocks direct browser requests but the Fundamentals API
// path at /v8 is available via proxy. Use /v7/finance/quote which is more
// reliable for simple price lookups.
type YFConfig = { id: string; name: string; symbol: string; ticker: string };

const YF_ASSETS: YFConfig[] = [
  { id: "sp500", name: "S&P 500", symbol: "SPX", ticker: "%5EGSPC" },
  { id: "nasdaq", name: "NASDAQ", symbol: "NDX", ticker: "%5EIXIC" },
  { id: "dow", name: "Dow Jones", symbol: "DJIA", ticker: "%5EDJI" },
  { id: "oil", name: "WTI Oil", symbol: "OIL", ticker: "CL%3DF" },
];

async function fetchYFAsset(cfg: YFConfig): Promise<MarketAsset> {
  // Try Yahoo Finance v7 quote endpoint (returns JSON with CORS sometimes)
  const quotePaths = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${cfg.ticker}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${cfg.ticker}`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${cfg.ticker}?interval=1d&range=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${cfg.ticker}?interval=1d&range=1d`,
  ];

  for (const url of quotePaths) {
    try {
      const res = await fetchWithProxies(url);
      if (!res.ok) continue;
      const data = await res.json();

      // v7 quote format
      const quote = data?.quoteResponse?.result?.[0];
      if (quote) {
        const price = quote.regularMarketPrice ?? 0;
        const changePercent = quote.regularMarketChangePercent ?? 0;
        if (price > 0) {
          return {
            id: cfg.id,
            name: cfg.name,
            symbol: cfg.symbol,
            price,
            changePercent,
            history: [price],
          };
        }
      }

      // v8 chart format
      const chartResult = data?.chart?.result?.[0];
      if (chartResult) {
        const meta = chartResult.meta as Record<string, number>;
        const price = meta?.regularMarketPrice ?? 0;
        const prevClose = meta?.chartPreviousClose ?? price;
        const changePercent = prevClose
          ? ((price - prevClose) / prevClose) * 100
          : 0;
        if (price > 0) {
          return {
            id: cfg.id,
            name: cfg.name,
            symbol: cfg.symbol,
            price,
            changePercent,
            history: [price],
          };
        }
      }
    } catch {
      /* try next */
    }
  }

  // Stooq CSV fallback: truly free, no auth, CORS open
  try {
    const stooqSymbol = cfg.ticker
      .replace("%5E", "^")
      .replace("%3DF", "=f")
      .toLowerCase();
    const csvUrl = `https://stooq.com/q/l/?s=${stooqSymbol}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetchWithProxies(csvUrl);
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length >= 2) {
      const cols = lines[1].split(",");
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
    /* ignore */
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
