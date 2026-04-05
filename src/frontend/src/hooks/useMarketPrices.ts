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

// ── Parse stooq DAILY CSV ──────────────────────────────────────────────────────
// Daily format from stooq /q/d/l/?s=SYMBOL&i=d:
// Date,Open,High,Low,Close,Volume
// 2025-01-15,5850.23,5902.10,5835.00,5893.45,3240000000
function parseStooqDailyCSV(csv: string): {
  price: number;
  prevClose: number;
  history: number[];
} {
  if (!csv || typeof csv !== "string")
    return { price: 0, prevClose: 0, history: [] };
  const lines = csv
    .trim()
    .split("\n")
    .filter(
      (l) =>
        l &&
        !l.toLowerCase().startsWith("date") &&
        !l.toLowerCase().startsWith("symbol"),
    );
  if (lines.length === 0) return { price: 0, prevClose: 0, history: [] };
  // Last line = most recent
  const lastCols = lines[lines.length - 1].split(",");
  // Date,Open,High,Low,Close,Volume => index 4 = Close
  const price = Number.parseFloat(lastCols[4] ?? "0");
  if (!Number.isFinite(price) || price <= 0)
    return { price: 0, prevClose: 0, history: [] };
  // Second-to-last = previous close
  let prevClose = 0;
  if (lines.length >= 2) {
    const prevCols = lines[lines.length - 2].split(",");
    prevClose = Number.parseFloat(prevCols[4] ?? "0");
  }
  // History: last 30 close prices
  const history = lines
    .slice(-30)
    .map((l) => Number.parseFloat(l.split(",")[4] ?? "0"))
    .filter((v) => v > 0);
  return { price, prevClose: prevClose > 0 ? prevClose : price, history };
}

// ── Backend actor for fetchStooqCSV per-symbol ──────────────────────────────
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

    const idlFactory = ({ IDL }: { IDL: typeof IDLType }) =>
      IDL.Service({
        fetchStooqCSV: IDL.Func([IDL.Text], [IDL.Text], []),
      });

    const agent = new HttpAgent({ host: config.backend_host });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actor = Actor.createActor(idlFactory as any, {
      agent,
      canisterId,
    }) as Record<string, (...args: unknown[]) => Promise<unknown>>;

    _marketActor = actor;
    return actor;
  } catch {
    return null;
  }
}

// Fetch a single stooq symbol via the ICP backend (no CORS restriction)
async function fetchStooqViaBackend(
  symbol: string,
): Promise<{ price: number; prevClose: number; history: number[] }> {
  const zero = { price: 0, prevClose: 0, history: [] };
  try {
    const actor = await getMarketActor();
    if (!actor) return zero;
    const csv = (await Promise.race([
      actor.fetchStooqCSV(symbol),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 25000),
      ),
    ])) as string;
    if (!csv || typeof csv !== "string") return zero;
    return parseStooqDailyCSV(csv);
  } catch {
    return zero;
  }
}

// Browser-side fallback: allorigins proxy
async function fetchStooqViaProxy(
  symbol: string,
): Promise<{ price: number; prevClose: number; history: number[] }> {
  const zero = { price: 0, prevClose: 0, history: [] };
  try {
    const stooqUrl = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(stooqUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`allorigins HTTP ${res.status}`);
    const json = await res.json();
    const csv = typeof json?.contents === "string" ? json.contents : "";
    return parseStooqDailyCSV(csv);
  } catch {
    return zero;
  }
}

// Fetch one index/oil symbol: try backend first, fallback to proxy
async function fetchIndex(
  symbol: string,
): Promise<{ price: number; prevClose: number; history: number[] }> {
  const result = await fetchStooqViaBackend(symbol);
  if (result.price > 0) return result;
  return fetchStooqViaProxy(symbol);
}

// ── Main fetch orchestrator ───────────────────────────────────────────────────
async function fetchAllAssets(): Promise<MarketAsset[]> {
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
      // Fetch all 4 indices/oil in parallel via backend then fallback
      Promise.all([
        fetchIndex("%5Espx"), // ^SPX = S&P 500
        fetchIndex("%5Endq"), // ^NDQ = NASDAQ
        fetchIndex("%5Edji"), // ^DJI = Dow Jones
        fetchIndex("cl.f"), // WTI Crude Oil
      ]),
    ]);

  const cg: CGPrices = cgResult.status === "fulfilled" ? cgResult.value : {};

  const cbResults =
    coinbaseResults.status === "fulfilled" ? coinbaseResults.value : [];

  const btcHistory: number[] =
    btcHistResult.status === "fulfilled" ? btcHistResult.value : [];

  const [sp500Data, nasdaqData, dowData, oilData] =
    indicesResult.status === "fulfilled"
      ? indicesResult.value
      : [
          { price: 0, prevClose: 0, history: [] },
          { price: 0, prevClose: 0, history: [] },
          { price: 0, prevClose: 0, history: [] },
          { price: 0, prevClose: 0, history: [] },
        ];

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

  const prevChange = (price: number, prevClose: number): number => {
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

  // Bitcoin
  const btcPrice = spotPrice(0, "bitcoin");
  add(
    "bitcoin",
    "Bitcoin",
    "BTC",
    btcPrice,
    cgChange("bitcoin"),
    btcHistory.length > 1 ? btcHistory : [btcPrice],
  );

  // Ethereum
  add(
    "ethereum",
    "Ethereum",
    "ETH",
    spotPrice(1, "ethereum"),
    cgChange("ethereum"),
  );

  // Gold
  add("gold", "Gold", "XAU/oz", spotPrice(2), 0);

  // Silver
  add("silver", "Silver", "XAG/oz", spotPrice(3), 0);

  // S&P 500
  if (sp500Data.price > 0) {
    add(
      "sp500",
      "S&P 500",
      "SPX",
      sp500Data.price,
      prevChange(sp500Data.price, sp500Data.prevClose),
      sp500Data.history,
    );
  }

  // NASDAQ
  if (nasdaqData.price > 0) {
    add(
      "nasdaq",
      "NASDAQ",
      "NDX",
      nasdaqData.price,
      prevChange(nasdaqData.price, nasdaqData.prevClose),
      nasdaqData.history,
    );
  }

  // Dow Jones
  if (dowData.price > 0) {
    add(
      "dow",
      "Dow Jones",
      "DJIA",
      dowData.price,
      prevChange(dowData.price, dowData.prevClose),
      dowData.history,
    );
  }

  // WTI Oil
  if (oilData.price > 0) {
    add(
      "oil",
      "Oil (WTI)",
      "WTI",
      oilData.price,
      prevChange(oilData.price, oilData.prevClose),
      oilData.history,
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
