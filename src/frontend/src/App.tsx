import { Toaster } from "@/components/ui/sonner";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import type { NewsItem } from "./backend.d";
import { GlobeScene } from "./components/GlobeScene";
import { Header } from "./components/Header";
import { MarketPrices } from "./components/MarketPrices";
import { NewsPanel } from "./components/NewsPanel";
import type { PinItem } from "./components/NewsPin";
import { NewsTicker } from "./components/NewsTicker";
import { PinOverlay } from "./components/PinOverlay";
import { SpaceWeatherWidget } from "./components/SpaceWeather";
import { useEarthquakes } from "./hooks/useEarthquakes";
import { useISS } from "./hooks/useISS";
import { useNews } from "./hooks/useNews";
import { useSpaceWeather } from "./hooks/useSpaceWeather";
import { useVolcanoes } from "./hooks/useVolcanoes";
import type { EarthquakeItem, ISSItem, VolcanoItem } from "./types";

type SelectedItem = PinItem | null;

export default function App() {
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { news, isLoading, lastUpdated, refresh } = useNews();
  const { earthquakes } = useEarthquakes();
  const issRaw = useISS();
  const volcanoes = useVolcanoes();
  const spaceWeather = useSpaceWeather();

  // Shape ISS position into ISSItem for the globe
  const issPosition: ISSItem | null = issRaw
    ? {
        id: "iss",
        lat: issRaw.lat,
        lng: issRaw.lng,
        altitude: issRaw.altitude,
        velocity: issRaw.velocity,
        title: `ISS — Live Position (${issRaw.altitude}km altitude, ${issRaw.velocity.toLocaleString()} km/h)`,
        isISS: true as const,
      }
    : null;

  const handlePinClick = useCallback((item: PinItem) => {
    setSelectedItem(item);
  }, []);

  const handleClose = useCallback(() => setSelectedItem(null), []);

  // Search filter
  const displayArticles = useMemo(() => {
    if (!searchQuery.trim()) return news;
    const q = searchQuery.toLowerCase();
    return news.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.country.toLowerCase().includes(q),
    );
  }, [news, searchQuery]);

  // Format last updated time
  const lastUpdatedDisplay = lastUpdated
    ? lastUpdated.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className="app-bg"
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        className="app-container"
        style={{
          margin: "0 auto",
          maxWidth: "100vw",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Header
          onRefresh={refresh}
          isRefreshing={isLoading}
          lastUpdated={
            lastUpdatedDisplay
              ? BigInt(lastUpdated?.getTime() ?? 0) * BigInt(1_000_000)
              : undefined
          }
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main content row — fills all remaining height, no overflow */}
        <main
          style={{
            display: "flex",
            flex: "1 1 0",
            minHeight: 0,
            overflow: "hidden",
            alignItems: "stretch",
          }}
        >
          {/* Globe column — contained, no bleed */}
          <div
            style={{
              position: "relative",
              flex: "1 1 0",
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Globe canvas box — strictly bounded */}
            <div
              style={{
                flex: "1 1 0",
                minHeight: 0,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <motion.div
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  inset: 0,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                <GlobeScene
                  newsItems={displayArticles}
                  earthquakes={earthquakes}
                  issPosition={issPosition}
                  volcanoes={volcanoes}
                  onPinClick={handlePinClick}
                />
              </motion.div>
            </div>

            {/* Pin legend */}
            <div
              className="flex flex-wrap justify-center gap-4 py-2 text-xs shrink-0"
              style={{ borderTop: "1px solid #1B2334", color: "#A9B3C7" }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#FF3B3B" }}
                />
                News ({displayArticles.length} pinned)
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ background: "#FFD700" }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: "#FFA500" }}
                />
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ background: "#FF6600" }}
                />
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block"
                  style={{ background: "#FF3300" }}
                />
                <span
                  className="w-4 h-4 rounded-full inline-block"
                  style={{ background: "#CC0000" }}
                />
                <span className="ml-1">
                  Earthquakes ({earthquakes.length} past 24h)
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#FF4500" }}
                />
                Volcanoes ({volcanoes.length} active)
              </span>
              {issPosition && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full animate-pulse-dot"
                    style={{ background: "#00FFFF" }}
                  />
                  ISS Live
                </span>
              )}
              {lastUpdatedDisplay && (
                <span style={{ color: "#3A4560" }}>
                  Updated {lastUpdatedDisplay} · auto-refreshes hourly
                </span>
              )}
              <span className="hidden sm:inline" style={{ color: "#3A4560" }}>
                Drag · Scroll / ±buttons / Double-click to zoom · Click pins
              </span>
            </div>
          </div>

          {/* Right sidebar — Markets + Ticker + Space Weather + News — desktop only */}
          <div
            className="hidden lg:flex flex-col shrink-0"
            style={{
              width: "36%",
              maxWidth: 460,
              minHeight: 0,
              overflow: "hidden",
              alignSelf: "stretch",
            }}
          >
            {/* Markets — compact, fixed height */}
            <MarketPrices />

            {/* News ticker — sits directly below Markets */}
            <NewsTicker articles={displayArticles} />

            {/* Space weather — single row */}
            <SpaceWeatherWidget data={spaceWeather} />

            {/* News panel fills all remaining space */}
            <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
              <NewsPanel
                articles={displayArticles}
                isLoading={isLoading}
                onItemClick={(item) => handlePinClick(item as PinItem)}
              />
            </div>
          </div>
        </main>

        {/* Mobile news panel */}
        <div
          className="lg:hidden"
          style={{
            borderTop: "1px solid #1B2334",
            maxHeight: "40vh",
            overflowY: "auto",
          }}
        >
          <NewsPanel
            articles={displayArticles}
            isLoading={isLoading}
            onItemClick={(item) => handlePinClick(item as PinItem)}
          />
        </div>

        {/* Footer */}
        <footer
          className="py-3 px-4 shrink-0"
          style={{ borderTop: "1px solid #1B2334", background: "#0C1222" }}
        >
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div
              className="flex items-center gap-2"
              style={{ color: "#A9B3C7" }}
            >
              <span
                className="font-black tracking-widest uppercase font-display"
                style={{ color: "#E9EEF7" }}
              >
                GLOBE NEWS LIVE
              </span>
              <span>— Real-time global news, updated hourly</span>
            </div>
            <div
              className="flex items-center gap-1"
              style={{ color: "#A9B3C7" }}
            >
              © {new Date().getFullYear()}. Built with{" "}
              <span style={{ color: "#FF3B3B" }}>♥</span> using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:opacity-80 underline underline-offset-2"
                style={{ color: "#E9EEF7" }}
              >
                caffeine.ai
              </a>
            </div>
          </div>
        </footer>
      </div>

      <PinOverlay item={selectedItem} onClose={handleClose} />
      <Toaster />
    </div>
  );
}
