import { motion } from "motion/react";
import type { NewsItem } from "../types";

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

function statusLabel(iso: string): { label: string; breaking: boolean } {
  try {
    const mins = (Date.now() - new Date(iso).getTime()) / 60000;
    if (mins < 120) return { label: "BREAKING", breaking: true };
    return { label: "LATEST", breaking: false };
  } catch {
    return { label: "LATEST", breaking: false };
  }
}

interface NewsPanelProps {
  articles: NewsItem[];
  isLoading: boolean;
  onItemClick: (item: NewsItem) => void;
}

export function NewsPanel({
  articles,
  isLoading,
  onItemClick,
}: NewsPanelProps) {
  return (
    <aside
      className="flex flex-col h-full"
      style={{ background: "#0F172A", borderLeft: "1px solid #1B2334" }}
      data-ocid="panel.section"
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid #1B2334" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse-dot"
            style={{ background: "#FF3B3B" }}
          />
          <h2
            className="text-xs font-black tracking-[0.15em] uppercase font-display"
            style={{ color: "#E9EEF7" }}
          >
            LATEST UPDATES
          </h2>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,59,59,0.15)", color: "#FF3B3B" }}
        >
          {articles.length}
        </span>
      </div>

      {/* Scrollable list */}
      <div
        className="news-scroll flex-1 overflow-y-auto"
        data-ocid="panel.list"
      >
        {isLoading && (
          <div className="p-4 space-y-3" data-ocid="panel.loading_state">
            {Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <div key={i} className="space-y-2">
                <div
                  className="h-3 rounded"
                  style={{
                    background: "#1B2334",
                    width: `${65 + (i % 3) * 10}%`,
                  }}
                />
                <div
                  className="h-2.5 rounded"
                  style={{ background: "#1B2334", width: "45%" }}
                />
              </div>
            ))}
          </div>
        )}

        {!isLoading && articles.length === 0 && (
          <div
            className="p-6 text-center text-sm"
            style={{ color: "#A9B3C7" }}
            data-ocid="panel.empty_state"
          >
            No stories found.
          </div>
        )}

        {/* News article entries — most recent first */}
        {articles.slice(0, 100).map((item, idx) => {
          const { label, breaking } = statusLabel(item.publishedAt);
          return (
            <motion.button
              type="button"
              key={item.id}
              onClick={() => onItemClick(item)}
              className="w-full text-left px-4 py-3 transition-colors"
              style={{ borderBottom: "1px solid rgba(27,35,52,0.8)" }}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.015 }}
              data-ocid={`panel.item.${idx + 1}`}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-start gap-2.5">
                {breaking ? (
                  <span className="badge-breaking mt-0.5 shrink-0">
                    {label}
                  </span>
                ) : (
                  <span
                    className="mt-0.5 shrink-0 text-xs font-bold tracking-wider uppercase"
                    style={{ color: "#A9B3C7", fontSize: "0.6rem" }}
                  >
                    {label}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-bold leading-tight line-clamp-2"
                    style={{ color: "#E9EEF7" }}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#A9B3C7" }}>
                    {item.source} · {relativeTime(item.publishedAt)}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </aside>
  );
}
