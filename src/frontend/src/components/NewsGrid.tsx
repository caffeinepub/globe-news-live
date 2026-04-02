import { ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import type { NewsItem } from "../backend.d";

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

interface NewsGridProps {
  articles: NewsItem[];
  onItemClick: (item: NewsItem) => void;
}

export function NewsGrid({ articles, onItemClick }: NewsGridProps) {
  // Take 4 most recent articles that have some content
  const featured = articles.slice(0, 4);

  if (featured.length === 0) return null;

  return (
    <section className="px-4 pb-8" data-ocid="newsgrid.section">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-1 h-5 rounded-full"
          style={{ background: "#FF3B3B" }}
        />
        <h2
          className="text-xs font-black tracking-[0.2em] uppercase font-display"
          style={{ color: "#E9EEF7" }}
        >
          FEATURED STORIES
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {featured.map((item, idx) => (
          <motion.div
            key={item.id}
            className="rounded-xl cursor-pointer overflow-hidden"
            style={{ background: "#111827", border: "1px solid #1B2334" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07 }}
            onClick={() => onItemClick(item)}
            whileHover={{
              borderColor: "rgba(47,123,255,0.4)",
              y: -2,
            }}
            data-ocid={`newsgrid.item.${idx + 1}`}
          >
            {/* Colored top bar */}
            <div
              className="h-1"
              style={{
                background:
                  idx % 2 === 0
                    ? "linear-gradient(90deg, #FF3B3B, #FF6B6B)"
                    : "linear-gradient(90deg, #2F7BFF, #5B9BFF)",
              }}
            />

            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="badge-breaking"
                  style={{ fontSize: "0.55rem" }}
                >
                  BREAKING
                </span>
                <span className="text-xs truncate" style={{ color: "#A9B3C7" }}>
                  {item.source}
                </span>
              </div>

              <h3
                className="text-sm font-bold leading-snug line-clamp-3 mb-3"
                style={{ color: "#E9EEF7" }}
              >
                {item.title}
              </h3>

              {item.description && (
                <p
                  className="text-xs line-clamp-2 mb-3"
                  style={{ color: "#A9B3C7" }}
                >
                  {item.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#A9B3C7" }}>
                  {relativeTime(item.publishedAt)}
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs font-bold transition-colors"
                  style={{ color: "#2F7BFF" }}
                  data-ocid={`newsgrid.item.${idx + 1}.primary_button`}
                >
                  READ MORE <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
