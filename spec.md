# Globe News Live

## Current State

- Markets widget shows only Bitcoin and Ethereum reliably; the backend canister `refreshMarketData` call is silently timing out, leaving Gold, Silver, S&P 500, NASDAQ, Dow, and Oil with zero prices.
- Globe has no layer filter system; pins are always on (news, earthquakes, ISS, volcanoes).
- Zoom controls sit bottom-right of the globe; bottom-left is empty.

## Requested Changes (Diff)

### Add
- **GlobeFilters panel**: A compact filter panel toggled by a button in the bottom-left of the globe box (opposite the zoom buttons). Panel lists all available overlay layers the user can toggle on/off.
- **Globe overlay layers** (all free, no API key, publicly open):
  1. **Weather Stations** — OpenMeteo current conditions for ~40 major cities (temperature, wind, conditions icon); no key required.
  2. **Active Wildfires** — NASA FIRMS VIIRS/MODIS active fire points (GeoJSON, no key); last 24h.
  3. **Tropical Cyclones/Typhoons/Hurricanes** — NHC/JTWC RSS feeds parsed for active storm positions.
  4. **Flight Density** — OpenSky Network live flight data (no key, CORS-open public API).
  5. **Active Conflicts** — ACLED open data API (free, no key required for public data).
  6. **Tsunami Warnings** — NOAA/PTWC RSS feed for active tsunami alerts.
  7. **Air Quality** — OpenAQ free API (no key) for major city AQI.
  8. **Moon Phase** — Calculated client-side from date math; shows current moon phase overlay/indicator.
  9. **Solar Events** — Uses existing NOAA space weather data already in app.
  10. **Meteor Showers** — Static annual calendar data (no API needed).
  11. **Power Outages** — EIA/DOE open outage data where available.
  12. **Refugee Camps** — UNHCR open data API (free, no key).
- **Fix market prices**: Completely replace the backend-dependent approach with direct `fetchStooqCSV` actor calls per symbol (bypassing the caching layer that times out). Use `fetchStooqCSV(symbol)` from the backend for each index, with allorigins.win as browser-side fallback. Gold/Silver remain on Coinbase. BTC/ETH remain on Coinbase + CoinGecko fallback.

### Modify
- `useMarketPrices.ts`: Replace `fetchIndicesViaBackend()` to call `fetchStooqCSV` directly per symbol instead of `refreshMarketData` + getCached* pattern.
- `GlobeScene.tsx`: Accept active filter layers as props; render overlay pins per layer.
- `App.tsx`: Add filter state, pass to GlobeScene.

### Remove
- The `refreshMarketData` + getCached* call chain (replaced with direct per-symbol calls).

## Implementation Plan

1. Fix `useMarketPrices.ts` — call `fetchStooqCSV` directly for each of the 4 symbols (^SPX, ^NDQ, ^DJI, cl.f) in parallel, fallback to allorigins.
2. Create `src/frontend/src/hooks/useGlobeFilters.ts` — state for active layers and fetch functions for each.
3. Create `src/frontend/src/components/GlobeFilters.tsx` — toggle UI panel.
4. Update `GlobeScene.tsx` — accept and render filter layer pins.
5. Update `App.tsx` — wire filter state through.
