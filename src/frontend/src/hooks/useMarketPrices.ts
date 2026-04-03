import { useEffect, useState } from "react";
import { createActorWithConfig } from "../config";

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

// ── Coinbase Spot (CORS: access-control-allow-origin: *) ────────────────────────
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
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  return res.json();
}

// ── CoinGecko 30-day history ────────────────────────────────────────────────
async function fetchCGHistory(coinId: string): Promise<number[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`CG history HTTP ${res.status}`);
  const data = await res.json();
  return (data?.prices ?? []).map((p: [number, number]) => p[1]);
}

// ── Parse stooq CSV (returned by backend http-outcalls) ─────────────────────────
// CSV format: Date,Open,High,Low,Close,Volume
function parseStooqCSV(csv: string): { price: number; prevClose: number } {
  if (!csv || typeof csv !== "string") return { price: 0, prevClose: 0 };
  const lines = csv
    .trim()
    .split("\n")
    .filter((l) => l && !l.toLowerCase().startsWith("date"));
  if (lines.length === 0) return { price: 0, prevClose: 0 };
  const lastLine = lines[lines.length - 1];
  const cols = lastLine.split(",");
  const price = Number.parseFloat(cols[4] ?? "0"); // Close price
  let prevClose = price;
  if (lines.length >= 2) {
    const prevCols = lines[lines.length - 2].split(",");
    prevClose = Number.parseFloat(prevCols[4] ?? "0") || price;
  }
  if (!Number.isFinite(price) || price <= 0) return { price: 0, prevClose: 0 };
  return { price, prevClose };
}

// ── Market data backend interface (available after new backend deployment) ────
// Using unknown to avoid TypeScript errors before bindgen regenerates backend.ts
interface MarketBackend {
  refreshMarketData(): Promise<void>;
  getCachedSP500(): Promise<string>;
  getCachedNASDAQ(): Promise<string>;
  getCachedDow(): Promise<string>;
  getCachedOil(): Promise<string>;
}

// ── Fetch indices/oil via ICP backend http-outcalls ───────────────────────────
// The ICP canister fetches stooq.com server-to-server (no CORS restriction)
async function fetchIndicesFromBackend(actor: unknown): Promise<{
  sp500: { price: number; prevClose: number };
  nasdaq: { price: number; prevClose: number };
  dow: { price: number; prevClose: number };
  oil: { price: number; prevClose: number };
}> {
  const marketActor = actor as MarketBackend;
  const zero = { price: 0, prevClose: 0 };

  // Check if backend has the new market data methods (only after new deployment)
  if (typeof marketActor.refreshMarketData !== "function") {
    return { sp500: zero, nasdaq: zero, dow: zero, oil: zero };
  }

  try {
    await marketActor.refreshMarketData();
  } catch {
    // Ignore refresh errors; try to read whatever is cached
  }

  const [sp500CSV, nasdaqCSV, dowCSV, oilCSV] = await Promise.all([
    marketActor.getCachedSP500().catch(() => ""),
    marketActor.getCachedNASDAQ().catch(() => ""),
    marketActor.getCachedDow().catch(() => ""),
    marketActor.getCachedOil().catch(() => ""),
  ]);

  return {
    sp500: parseStooqCSV(sp500CSV),
    nasdaq: parseStooqCSV(nasdaqCSV),
    dow: parseStooqCSV(dowCSV),
    oil: parseStooqCSV(oilCSV),
  };
}

// ── Main fetch orchestrator ───────────────────────────────────────────────────
async function fetchAllAssets(actor: unknown): Promise<MarketAsset[]> {
  // Run crypto + metals from browser (CORS-open), indices from backend (bypasses CORS)
  const [cgResult, coinbaseResults, btcHistResult, indicesResult] =
    await Promise.allSettled([
      fetchCoinGecko(["bitcoin", "ethereum"]),
      Promise.allSettled([
        coinbaseSpot("BTC-USD"),
        coinbaseSpot("ETH-USD"),
        coinbaseSpot("XAU-USD"),
        coinbaseSpot("XAG-USD"),
      ]),
      fetchCGHistory("bitcoin"),
      fetchIndicesFromBackend(actor),
    ]);

  const cg: CGPrices = cgResult.status === "fulfilled" ? cgResult.value : {};

  const cbResults =
    coinbaseResults.status === "fulfilled" ? coinbaseResults.value : [];

  const btcHistory: number[] =
    btcHistResult.status === "fulfilled" ? btcHistResult.value : [];

  const indices =
    indicesResult.status === "fulfilled"
      ? indicesResult.value
      : {
          sp500: { price: 0, prevClose: 0 },
          nasdaq: { price: 0, prevClose: 0 },
          dow: { price: 0, prevClose: 0 },
          oil: { price: 0, prevClose: 0 },
        };

  const assets: MarketAsset[] = [];

  const cbSpot = (idx: number): number => {
    if (Array.isArray(cbResults) && cbResults[idx]?.status === "fulfilled") {
      return (cbResults[idx] as PromiseFulfilledResult<number>).value;
    }
    return 0;
  };

  const spotPrice = (cbIdx: number, cgId?: string): number => {
    const cb = cbSpot(cbIdx);
    if (cb > 0) return cb;
    if (cgId && cg[cgId]?.usd > 0) return cg[cgId].usd;
    return 0;
  };

  const cgChange = (cgId: string): number => cg[cgId]?.usd_24h_change ?? 0;

  const stooqChange = (price: number, prevClose: number): number => {
    if (prevClose > 0 && price > 0)
      return ((price - prevClose) / prevClose) * 100;
    return 0;
  };

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

  // Bitcoin — Coinbase primary, CoinGecko fallback
  const btcPrice = spotPrice(0, "bitcoin");
  add(
    "bitcoin",
    "Bitcoin",
    "BTC",
    btcPrice,
    cgChange("bitcoin"),
    btcHistory.length > 1 ? btcHistory : [btcPrice],
  );

  // Ethereum — Coinbase primary, CoinGecko fallback
  add(
    "ethereum",
    "Ethereum",
    "ETH",
    spotPrice(1, "ethereum"),
    cgChange("ethereum"),
  );

  // Gold — Coinbase XAU-USD (troy oz)
  add("gold", "Gold", "XAU/oz", spotPrice(2), 0);

  // Silver — Coinbase XAG-USD
  add("silver", "Silver", "XAG/oz", spotPrice(3), 0);

  // S&P 500 — stooq ^spx via ICP backend http-outcalls
  const { price: sp500Price, prevClose: sp500Prev } = indices.sp500;
  if (sp500Price > 0) {
    add(
      "sp500",
      "S&P 500",
      "SPX",
      sp500Price,
      stooqChange(sp500Price, sp500Prev),
    );
  }

  // NASDAQ 100 — stooq ^ndq via ICP backend http-outcalls
  const { price: ndxPrice, prevClose: ndxPrev } = indices.nasdaq;
  if (ndxPrice > 0) {
    add("nasdaq", "NASDAQ", "NDX", ndxPrice, stooqChange(ndxPrice, ndxPrev));
  }

  // Dow Jones — stooq ^dji via ICP backend http-outcalls
  const { price: djiPrice, prevClose: djiPrev } = indices.dow;
  if (djiPrice > 0) {
    add("dow", "Dow Jones", "DJIA", djiPrice, stooqChange(djiPrice, djiPrev));
  }

  // WTI Oil — stooq cl.f via ICP backend http-outcalls
  const { price: oilPrice, prevClose: oilPrev } = indices.oil;
  if (oilPrice > 0) {
    add("oil", "Oil (WTI)", "WTI", oilPrice, stooqChange(oilPrice, oilPrev));
  }

  // Sort by defined order
  const ORDER = [
    "bitcoin",
    "ethereum",
    "gold",
    "silver",
    "sp500",
    "nasdaq",
    "dow",
    "oil",
  ];
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
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      if (!cancelled) setState((prev) => ({ ...prev, isLoading: true }));
      try {
        // Create anonymous actor (no auth needed for market data reads)
        const actor = await createActorWithConfig();
        const assets = await fetchAllAssets(actor);
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
    timer = setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer !== null) clearInterval(timer);
    };
  }, []);

  return state;
}
