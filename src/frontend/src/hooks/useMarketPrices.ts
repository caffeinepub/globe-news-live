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

// ── Coinbase Spot (CORS: access-control-allow-origin: *) ─────────────────────
async function coinbaseSpot(pair: string): Promise<number> {
  const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Coinbase ${pair} HTTP ${res.status}`);
  const data = await res.json();
  const val = Number.parseFloat(data?.data?.amount ?? "0");
  if (!val || val <= 0) throw new Error(`Coinbase ${pair} returned 0`);
  return val;
}

// ── CoinGecko batched (public API, no key, CORS open) ───────────────────────
type CGPrices = Record<string, { usd: number; usd_24h_change: number }>;

async function fetchCoinGecko(ids: string[]): Promise<CGPrices> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  return res.json();
}

// ── CoinGecko 30-day history ─────────────────────────────────────────────────
async function fetchCGHistory(coinId: string): Promise<number[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`CG history HTTP ${res.status}`);
  const data = await res.json();
  return (data?.prices ?? []).map((p: [number, number]) => p[1]);
}

// ── Main fetch orchestrator ───────────────────────────────────────────────────
async function fetchAllAssets(): Promise<MarketAsset[]> {
  // 1. Single batched CoinGecko call for prices + 24h change of crypto/tokenized assets
  //    IDs: bitcoin, ethereum, pax-gold (=1 oz gold), sp-500 (tokenized ETF tracker)
  let cg: CGPrices = {};
  try {
    cg = await fetchCoinGecko(["bitcoin", "ethereum", "pax-gold", "sp-500"]);
  } catch {
    // CoinGecko unavailable — fall back to Coinbase-only for crypto
  }

  // 2. Parallel Coinbase spot calls — confirmed CORS *
  //    BTC-USD, ETH-USD, XAU-USD (gold), XAG-USD (silver)
  const [btcResult, ethResult, xauResult, xagResult] = await Promise.allSettled(
    [
      coinbaseSpot("BTC-USD"),
      coinbaseSpot("ETH-USD"),
      coinbaseSpot("XAU-USD"),
      coinbaseSpot("XAG-USD"),
    ],
  );

  // 3. 30-day history for BTC (non-blocking)
  let btcHistory: number[] = [];
  try {
    btcHistory = await fetchCGHistory("bitcoin");
  } catch {
    /* no history */
  }

  const assets: MarketAsset[] = [];

  const spot = (r: PromiseSettledResult<number>, cgId?: string): number => {
    if (r.status === "fulfilled" && r.value > 0) return r.value;
    if (cgId && cg[cgId]?.usd > 0) return cg[cgId].usd;
    return 0;
  };

  const change = (cgId: string): number => cg[cgId]?.usd_24h_change ?? 0;

  const add = (
    id: string,
    name: string,
    symbol: string,
    price: number,
    changePercent: number,
    history: number[] = [],
  ) => {
    if (price > 0) {
      assets.push({
        id,
        name,
        symbol,
        price,
        changePercent,
        history: history.length > 1 ? history : [price],
      });
    }
  };

  // Bitcoin
  const btcPrice = spot(btcResult, "bitcoin");
  add(
    "bitcoin",
    "Bitcoin",
    "BTC",
    btcPrice,
    change("bitcoin"),
    btcHistory.length > 1 ? btcHistory : [btcPrice],
  );

  // Ethereum
  add(
    "ethereum",
    "Ethereum",
    "ETH",
    spot(ethResult, "ethereum"),
    change("ethereum"),
  );

  // Gold — Coinbase XAU-USD spot (confirmed working ~$4671), fallback PAXG
  const goldPrice = spot(xauResult, "pax-gold");
  add("gold", "Gold", "XAU/oz", goldPrice, change("pax-gold"));

  // Silver — Coinbase XAG-USD spot (confirmed working ~$72)
  const silverPrice = spot(xagResult);
  add("silver", "Silver", "XAG/oz", silverPrice, change("pax-gold"));

  // S&P 500 — CoinGecko sp-500 tokenized tracker (~$3116)
  const sp500Price = cg["sp-500"]?.usd ?? 0;
  add("sp500", "S&P 500", "SPX", sp500Price, change("sp-500"));

  // Sort by defined order
  const ORDER = ["bitcoin", "ethereum", "gold", "silver", "sp500"];
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
