import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import type { IDL as IDLType } from "@icp-sdk/core/candid";
import { useEffect, useState } from "react";
import { loadConfig } from "../config";

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

// ── Parse stooq CSV ─────────────────────────────────────────────────────────────────
// Format: Symbol,Date,Time,Open,High,Low,Close,Volume (realtime q/l endpoint)
function parseStooqRealtimeCSV(csv: string): { price: number; open: number } {
  if (!csv || typeof csv !== "string") return { price: 0, open: 0 };
  const lines = csv
    .trim()
    .split("\n")
    .filter((l) => l && !l.toLowerCase().startsWith("symbol"));
  if (lines.length === 0) return { price: 0, open: 0 };
  const lastLine = lines[lines.length - 1];
  const cols = lastLine.split(",");
  // Symbol,Date,Time,Open,High,Low,Close,Volume
  const open = Number.parseFloat(cols[3] ?? "0");
  const close = Number.parseFloat(cols[6] ?? "0");
  if (!Number.isFinite(close) || close <= 0) return { price: 0, open: 0 };
  return { price: close, open: open > 0 ? open : close };
}

// ── Fetch indices/oil from the ICP backend via raw actor call ──────────────────
// The backend canister has refreshMarketData, getCachedSP500, etc.
// We call them using a raw actor with a custom IDL (backend.did.js only has 5 methods,
// but the deployed canister DOES have these methods since Caffeine compiles main.mo).
let _marketActor: Record<
  string,
  (...args: unknown[]) => Promise<unknown>
> | null = null;

async function getMarketActor(): Promise<Record<
  string,
  (...args: unknown[]) => Promise<unknown>
> | null> {
  if (_marketActor) return _marketActor;
  try {
    const config = await loadConfig();
    const canisterId = config.backend_canister_id;
    if (!canisterId || canisterId === "undefined") return null;

    // Build a minimal IDL factory for market methods on the backend canister
    const marketIdlFactory = ({ IDL }: { IDL: typeof IDLType }) =>
      IDL.Service({
        refreshMarketData: IDL.Func([], [], []),
        getCachedSP500: IDL.Func([], [IDL.Text], ["query"]),
        getCachedNASDAQ: IDL.Func([], [IDL.Text], ["query"]),
        getCachedDow: IDL.Func([], [IDL.Text], ["query"]),
        getCachedOil: IDL.Func([], [IDL.Text], ["query"]),
      });

    const agent = new HttpAgent({
      host: config.backend_host,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actor = Actor.createActor(marketIdlFactory as any, {
      agent,
      canisterId,
    }) as Record<string, (...args: unknown[]) => Promise<unknown>>;

    _marketActor = actor;
    return actor;
  } catch {
    return null;
  }
}

async function fetchIndicesViaBackend(): Promise<{
  sp500: { price: number; open: number };
  nasdaq: { price: number; open: number };
  dow: { price: number; open: number };
  oil: { price: number; open: number };
}> {
  const zero = { price: 0, open: 0 };

  try {
    const actor = await getMarketActor();
    if (!actor) return { sp500: zero, nasdaq: zero, dow: zero, oil: zero };

    // Trigger a refresh (fire-and-forget if it fails)
    try {
      await Promise.race([
        actor.refreshMarketData(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 15000),
        ),
      ]);
    } catch {
      // Best-effort refresh; may already have cached data
    }

    const [sp500CSV, nasdaqCSV, dowCSV, oilCSV] = await Promise.all([
      (actor.getCachedSP500() as Promise<string>).catch(() => ""),
      (actor.getCachedNASDAQ() as Promise<string>).catch(() => ""),
      (actor.getCachedDow() as Promise<string>).catch(() => ""),
      (actor.getCachedOil() as Promise<string>).catch(() => ""),
    ]);

    return {
      sp500: parseStooqRealtimeCSV(sp500CSV),
      nasdaq: parseStooqRealtimeCSV(nasdaqCSV),
      dow: parseStooqRealtimeCSV(dowCSV),
      oil: parseStooqRealtimeCSV(oilCSV),
    };
  } catch {
    return { sp500: zero, nasdaq: zero, dow: zero, oil: zero };
  }
}

// ── Browser-direct stooq fetch via allorigins proxy ────────────────────────
// Fallback if backend is unavailable
async function fetchStooqDirect(
  symbol: string,
): Promise<{ price: number; open: number }> {
  // Use allorigins.win as a CORS proxy for stooq
  // The q/l endpoint returns: Symbol,Date,Time,Open,High,Low,Close,Volume
  const stooqUrl = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(stooqUrl)}`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`allorigins HTTP ${res.status}`);
  const json = await res.json();
  const csv = typeof json?.contents === "string" ? json.contents : "";
  return parseStooqRealtimeCSV(csv);
}

// ── Main fetch orchestrator ───────────────────────────────────────────────────
async function fetchAllAssets(): Promise<MarketAsset[]> {
  // Run crypto + metals from browser (CORS-open), indices from backend
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
      fetchIndicesViaBackend(),
    ]);

  const cg: CGPrices = cgResult.status === "fulfilled" ? cgResult.value : {};

  const cbResults =
    coinbaseResults.status === "fulfilled" ? coinbaseResults.value : [];

  const btcHistory: number[] =
    btcHistResult.status === "fulfilled" ? btcHistResult.value : [];

  let indices =
    indicesResult.status === "fulfilled"
      ? indicesResult.value
      : {
          sp500: { price: 0, open: 0 },
          nasdaq: { price: 0, open: 0 },
          dow: { price: 0, open: 0 },
          oil: { price: 0, open: 0 },
        };

  // If backend failed or returned zeros, try direct stooq via allorigins proxy
  const backendFailed =
    indices.sp500.price === 0 ||
    indices.nasdaq.price === 0 ||
    indices.dow.price === 0;

  if (backendFailed) {
    const fallbacks = await Promise.allSettled([
      fetchStooqDirect("%5Espx"), // ^SPX
      fetchStooqDirect("%5Endq"), // ^NDQ
      fetchStooqDirect("%5Edji"), // ^DJI
      fetchStooqDirect("cl.f"), // WTI Oil
    ]);
    if (fallbacks[0].status === "fulfilled" && fallbacks[0].value.price > 0)
      indices.sp500 = fallbacks[0].value;
    if (fallbacks[1].status === "fulfilled" && fallbacks[1].value.price > 0)
      indices.nasdaq = fallbacks[1].value;
    if (fallbacks[2].status === "fulfilled" && fallbacks[2].value.price > 0)
      indices.dow = fallbacks[2].value;
    if (fallbacks[3].status === "fulfilled" && fallbacks[3].value.price > 0)
      indices.oil = fallbacks[3].value;
  }

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

  const openChange = (price: number, open: number): number => {
    if (open > 0 && price > 0) return ((price - open) / open) * 100;
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

  // S&P 500
  if (indices.sp500.price > 0) {
    add(
      "sp500",
      "S&P 500",
      "SPX",
      indices.sp500.price,
      openChange(indices.sp500.price, indices.sp500.open),
    );
  }

  // NASDAQ
  if (indices.nasdaq.price > 0) {
    add(
      "nasdaq",
      "NASDAQ",
      "NDX",
      indices.nasdaq.price,
      openChange(indices.nasdaq.price, indices.nasdaq.open),
    );
  }

  // Dow Jones
  if (indices.dow.price > 0) {
    add(
      "dow",
      "Dow Jones",
      "DJIA",
      indices.dow.price,
      openChange(indices.dow.price, indices.dow.open),
    );
  }

  // WTI Oil
  if (indices.oil.price > 0) {
    add(
      "oil",
      "Oil (WTI)",
      "WTI",
      indices.oil.price,
      openChange(indices.oil.price, indices.oil.open),
    );
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
    timer = setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer !== null) clearInterval(timer);
    };
  }, []);

  return state;
}
