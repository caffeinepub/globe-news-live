# Globe News Live

## Current State
Full-stack globe news app with:
- Interactive 3D globe with news pins (red) and earthquake pins (orange)
- Markets widget showing 7 assets (Bitcoin, Gold, Silver, S&P500, NASDAQ, Dow, Oil)
- Scrolling news ticker at bottom of right sidebar
- 40+ RSS news feeds, USGS earthquake feed, city-level geocoding

## Requested Changes (Diff)

### Add
- Backend `getMarketPrices` function using ICP http-outcalls to fetch stooq.com data server-side (bypasses browser CORS)
- ISS live position tracker: blue pin on globe showing real-time ISS location (updates every 10s)
- Active volcano pins: purple pins from Smithsonian/USGS volcano data
- Space weather widget: compact display of solar wind speed and Kp index from NOAA
- Live UTC clock in the header/sidebar

### Modify
- `useMarketPrices.ts`: replace browser-side stooq/Yahoo fetches with backend canister call for indices/oil; keep Coinbase for BTC/XAU/XAG (CORS open)
- `NewsTicker.tsx`: add `animationName: 'ticker-scroll'` to inline style so the CSS keyframe actually fires
- `GlobeScene.tsx`: add ISS pin and volcano pins as additional pin types
- `types.ts`: add VolcanoItem and ISSItem types
- `App.tsx`: wire ISS hook, volcano hook, space weather widget into layout
- `backend/main.mo`: add `getMarketPrices()` function using http-outcalls to stooq.com for SPY, QQQ, DIA, USO ETFs

### Remove
- Nothing removed

## Implementation Plan
1. Update `backend/main.mo`: add `getMarketPrices()` that fetches stooq CSV for SPY.US, QQQ.US, DIA.US, USO.US — returns structured price data
2. Update `useMarketPrices.ts`: call backend for indices/oil prices; use Coinbase for XAU/XAG spot; keep CoinGecko/Coinbase for BTC
3. Fix `NewsTicker.tsx`: add `animationName: 'ticker-scroll'` to the `ticker-track` inline style
4. Add `useISS.ts` hook: poll `https://api.wheretheiss.at/v1/satellites/25544` every 10s (CORS open)
5. Add `useVolcanoes.ts` hook: fetch from USGS/Smithsonian volcano GeoJSON feed
6. Add `useSpaceWeather.ts` hook: fetch NOAA solar wind data
7. Add `SpaceWeather.tsx` compact widget below markets
8. Update `types.ts` with new pin types
9. Wire all new hooks/components into `App.tsx` and `GlobeScene.tsx`
