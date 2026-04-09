import { loadConfig } from "@caffeineai/core-infrastructure";
import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import type { IDL as IDLType } from "@icp-sdk/core/candid";
import { useEffect, useRef, useState } from "react";

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

// ── Metals.live (free, no key, CORS-open) ────────────────────────────────────
async function fetchMetalsLive(): Promise<{ gold: number; silver: number }> {
  const res = await fetch("https://api.metals.live/v1/spot", {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`metals.live HTTP ${res.status}`);
  const data = await res.json();
  // Returns array of objects like [{ gold: 1900.5 }, { silver: 23.1 }, ...]
  let gold = 0;
  let silver = 0;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item?.gold === "number" && item.gold > 0) gold = item.gold;
      if (typeof item?.silver === "number" && item.silver > 0)
        silver = item.silver;
    }
  }
  return { gold, silver };
}

// ── Parse stooq DAILY CSV ────────────────────────────────────────────────────
// Format: Date,Open,High,Low,Close,Volume
function parseStooqCSV(csv: string): {
  price: number;
  prevClose: number;
  history: number[];
} {
  const zero = { price: 0, prevClose: 0, history: [] };
  if (!csv || typeof csv !== "string" || csv.trim().length === 0) return zero;
  const lines = csv
    .trim()
    .split("\n")
    .filter(
      (l) =>
        l &&
        !l.toLowerCase().startsWith("date") &&
        !l.toLowerCase().startsWith("symbol"),
    );
  if (lines.length === 0) return zero;
  const lastCols = lines[lines.length - 1].split(",");
  // Date(0), Open(1), High(2), Low(3), Close(4), Volume(5)
  const price = Number.parseFloat(lastCols[4] ?? "0");
  if (!Number.isFinite(price) || price <= 0) return zero;
  let prevClose = 0;
  if (lines.length >= 2) {
    const prevCols = lines[lines.length - 2].split(",");
    prevClose = Number.parseFloat(prevCols[4] ?? "0");
  }
  const history = lines
    .slice(-30)
    .map((l) => Number.parseFloat(l.split(",")[4] ?? "0"))
    .filter((v) => v > 0);
  return { price, prevClose: prevClose > 0 ? prevClose : price, history };
}

// ── Backend Actor (raw, custom IDL) ─────────────────────────────────────────
// We use a raw actor because the auto-generated bindings may not include
// market methods if bindgen ran before those methods were added.
type MarketActor = {
  refreshMarketData: () => Promise<undefined>;
  getCachedSP500: () => Promise<string>;
  getCachedNASDAQ: () => Promise<string>;
  getCachedDow: () => Promise<string>;
  getCachedOil: () => Promise<string>;
  fetchStooqCSV: (symbol: string) => Promise<string>;
};

let _actorCache: MarketActor | null = null;
let _actorPromise: Promise<MarketActor | null> | null = null;

async function getMarketActor(): Promise<MarketActor | null> {
  if (_actorCache) return _actorCache;
  if (_actorPromise) return _actorPromise;

  _actorPromise = (async () => {
    try {
      const config = await loadConfig();
      const canisterId = config.backend_canister_id;
      if (!canisterId || canisterId === "undefined") return null;

      const idlFactory = ({ IDL }: { IDL: typeof IDLType }) =>
        IDL.Service({
          refreshMarketData: IDL.Func([], [], []),
          getCachedSP500: IDL.Func([], [IDL.Text], ["query"]),
          getCachedNASDAQ: IDL.Func([], [IDL.Text], ["query"]),
          getCachedDow: IDL.Func([], [IDL.Text], ["query"]),
          getCachedOil: IDL.Func([], [IDL.Text], ["query"]),
          fetchStooqCSV: IDL.Func([IDL.Text], [IDL.Text], []),
        });

      const agent = new HttpAgent({ host: config.backend_host });
      // biome-ignore lint/suspicious/noExplicitAny: raw actor
      const actor = Actor.createActor(idlFactory as any, {
        agent,
        canisterId,
      }) as unknown as MarketActor;

      _actorCache = actor;
      return actor;
    } catch {
      return null;
    }
  })();

  return _actorPromise;
}

async function fetchIndexFromBackend(
  actor: MarketActor,
  method: keyof Pick<
    MarketActor,
    "getCachedSP500" | "getCachedNASDAQ" | "getCachedDow" | "getCachedOil"
  >,
): Promise<{ price: number; prevClose: number; history: number[] }> {
  try {
    const csv = await Promise.race([
      actor[method](),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 20000),
      ),
    ]);
    return parseStooqCSV(csv);
  } catch {
    return { price: 0, prevClose: 0, history: [] };
  }
}

async function fetchIndexFallback(
  symbol: string,
): Promise<{ price: number; prevClose: number; history: number[] }> {
  // fetchStooqCSV does a server-side HTTP outcall — no CORS restriction
  try {
    const actor = await getMarketActor();
    if (!actor) return { price: 0, prevClose: 0, history: [] };
    const csv = await Promise.race([
      actor.fetchStooqCSV(symbol),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 25000),
      ),
    ]);
    return parseStooqCSV(csv);
  } catch {
    return { price: 0, prevClose: 0, history: [] };
  }
}

// ── Main fetch orchestrator ──────────────────────────────────────────────────
async function fetchAllAssets(): Promise<MarketAsset[]> {
  // Step 1: Get backend actor
  const actor = await getMarketActor();

  // Step 2: Trigger a backend refresh (fire-and-forget style - don't await)
  // so the cache is warm for next fetch cycle
  if (actor) {
    actor.refreshMarketData().catch(() => {
      /* ignore */
    });
  }

  // Step 3: Fetch all assets in parallel
  const [
    btcResult,
    ethResult,
    goldCoinbaseResult,
    silverCoinbaseResult,
    metalsResult,
    sp500Result,
    nasdaqResult,
    dowResult,
    oilResult,
  ] = await Promise.allSettled([
    coinbaseSpot("BTC-USD"),
    coinbaseSpot("ETH-USD"),
    coinbaseSpot("XAU-USD"),
    coinbaseSpot("XAG-USD"),
    fetchMetalsLive(),
    actor
      ? fetchIndexFromBackend(actor, "getCachedSP500")
      : fetchIndexFallback("%5Espx"),
    actor
      ? fetchIndexFromBackend(actor, "getCachedNASDAQ")
      : fetchIndexFallback("%5Endq"),
    actor
      ? fetchIndexFromBackend(actor, "getCachedDow")
      : fetchIndexFallback("%5Edji"),
    actor
      ? fetchIndexFromBackend(actor, "getCachedOil")
      : fetchIndexFallback("cl.f"),
  ]);

  const get = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const btcPrice = get(btcResult, 0);
  const ethPrice = get(ethResult, 0);

  // Gold: Coinbase XAU-USD first, metals.live fallback
  const goldCoinbase = get(goldCoinbaseResult, 0);
  const metals = get(metalsResult, { gold: 0, silver: 0 });
  const goldPrice = goldCoinbase > 0 ? goldCoinbase : metals.gold;

  // Silver: Coinbase XAG-USD first, metals.live fallback
  const silverCoinbase = get(silverCoinbaseResult, 0);
  const silverPrice = silverCoinbase > 0 ? silverCoinbase : metals.silver;

  const sp500 = get(sp500Result, {
    price: 0,
    prevClose: 0,
    history: [] as number[],
  });
  const nasdaq = get(nasdaqResult, {
    price: 0,
    prevClose: 0,
    history: [] as number[],
  });
  const dow = get(dowResult, {
    price: 0,
    prevClose: 0,
    history: [] as number[],
  });
  const oil = get(oilResult, {
    price: 0,
    prevClose: 0,
    history: [] as number[],
  });

  // If backend returned empty (cache miss), try direct fetchStooqCSV per symbol
  const resolveIndex = async (
    data: { price: number; prevClose: number; history: number[] },
    symbol: string,
  ) => {
    if (data.price > 0) return data;
    return fetchIndexFallback(symbol);
  };

  const [sp500Final, nasdaqFinal, dowFinal, oilFinal] = await Promise.all([
    resolveIndex(sp500, "%5Espx"),
    resolveIndex(nasdaq, "%5Endq"),
    resolveIndex(dow, "%5Edji"),
    resolveIndex(oil, "cl.f"),
  ]);

  const pctChange = (price: number, prev: number) =>
    prev > 0 && price > 0 ? ((price - prev) / prev) * 100 : 0;

  const assets: MarketAsset[] = [];
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

  add("bitcoin", "Bitcoin", "BTC", btcPrice, 0);
  add("ethereum", "Ethereum", "ETH", ethPrice, 0);
  add("gold", "Gold", "XAU/oz", goldPrice, 0);
  add("silver", "Silver", "XAG/oz", silverPrice, 0);
  add(
    "sp500",
    "S&P 500",
    "SPX",
    sp500Final.price,
    pctChange(sp500Final.price, sp500Final.prevClose),
    sp500Final.history,
  );
  add(
    "nasdaq",
    "NASDAQ",
    "NDX",
    nasdaqFinal.price,
    pctChange(nasdaqFinal.price, nasdaqFinal.prevClose),
    nasdaqFinal.history,
  );
  add(
    "dow",
    "Dow Jones",
    "DJIA",
    dowFinal.price,
    pctChange(dowFinal.price, dowFinal.prevClose),
    dowFinal.history,
  );
  add(
    "oil",
    "Oil (WTI)",
    "WTI",
    oilFinal.price,
    pctChange(oilFinal.price, oilFinal.prevClose),
    oilFinal.history,
  );

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
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      if (!cancelledRef.current)
        setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const assets = await fetchAllAssets();
        if (!cancelledRef.current) {
          setState({ assets, isLoading: false, lastUpdated: new Date() });
        }
      } catch {
        if (!cancelledRef.current) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    };

    load();
    timer = setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      if (timer !== null) clearInterval(timer);
    };
  }, []);

  return state;
}
