import { Globe, RefreshCw, Search } from "lucide-react";
import { motion } from "motion/react";

interface HeaderProps {
  activeCategory?: string;
  onCategoryChange?: (cat: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: bigint | undefined;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

function formatLastUpdated(ts: bigint | undefined): string {
  if (!ts || ts === BigInt(0)) return "";
  return new Date(Number(ts) / 1_000_000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Header({
  onRefresh,
  isRefreshing,
  lastUpdated,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  const updatedStr = formatLastUpdated(lastUpdated);

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "#0C1222",
        borderBottom: "1px solid #1A2233",
      }}
      data-ocid="header.section"
    >
      <div className="flex items-center gap-3 px-4 h-14">
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 shrink-0"
          data-ocid="header.link"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #FF3B3B 0%, #2F7BFF 100%)",
              boxShadow: "0 0 16px rgba(47,123,255,0.4)",
            }}
          >
            <Globe className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="leading-none">
            <div className="text-sm font-black tracking-[0.2em] uppercase text-foreground font-display">
              GLOBE
            </div>
            <div
              className="text-xs font-bold tracking-[0.15em] uppercase"
              style={{ color: "#A9B3C7", lineHeight: 1 }}
            >
              NEWS LIVE
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Search */}
          <div className="relative hidden sm:flex items-center">
            <Search
              className="absolute left-2.5 w-3.5 h-3.5 pointer-events-none"
              style={{ color: "#A9B3C7" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search stories…"
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none w-40 transition-all"
              style={{
                background: "rgba(27,35,52,0.8)",
                border: "1px solid #1B2334",
                color: "#E9EEF7",
              }}
              data-ocid="header.search_input"
            />
          </div>

          {/* Last updated */}
          {updatedStr && (
            <span
              className="text-xs hidden md:block"
              style={{ color: "#A9B3C7" }}
            >
              Updated {updatedStr}
            </span>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "#A9B3C7" }}
            title="Refresh news"
            data-ocid="header.secondary_button"
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={
                isRefreshing
                  ? {
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }
                  : {}
              }
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
          </button>
        </div>
      </div>
    </header>
  );
}
