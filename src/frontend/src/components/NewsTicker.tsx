import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsItem } from "../backend.d";

interface NewsTickerProps {
  articles: NewsItem[];
}

function relativeTime(iso: string): string {
  try {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  } catch {
    return "";
  }
}

function setAnchorColor(e: React.MouseEvent<HTMLAnchorElement>, color: string) {
  e.currentTarget.style.color = color;
}

// Reading speed: ~80px per second — comfortable, readable
const PX_PER_SECOND = 80;
// Average character width in px at 0.72rem (~11.5px)
const CHAR_WIDTH_PX = 9;
// Separator width estimate
const SEPARATOR_WIDTH_PX = 120;

export function NewsTicker({ articles }: NewsTickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(120);

  // Filter to past hour; fall back to past 3 hours if fewer than 5; then all
  const tickerItems = useMemo(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const threeHours = 3 * oneHour;

    let recent = articles.filter(
      (a) => now - new Date(a.publishedAt).getTime() < oneHour,
    );
    if (recent.length < 5) {
      recent = articles.filter(
        (a) => now - new Date(a.publishedAt).getTime() < threeHours,
      );
    }
    if (recent.length === 0) recent = articles.slice(0, 40);

    // Deduplicate by first 60 chars of title
    const seen = new Set<string>();
    return recent.filter((a) => {
      const key = a.title.slice(0, 60).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [articles]);

  // Calculate animation duration based on content width and target reading speed
  useEffect(() => {
    if (tickerItems.length === 0) return;
    // Estimate total pixel width of one pass (half the duplicated track)
    const totalPx = tickerItems.reduce(
      (sum, a) => sum + a.title.length * CHAR_WIDTH_PX + SEPARATOR_WIDTH_PX,
      0,
    );
    // Duration = distance / speed (in seconds)
    const duration = Math.max(60, Math.round(totalPx / PX_PER_SECOND));
    setAnimationDuration(duration);
  }, [tickerItems]);

  if (tickerItems.length === 0) return null;

  return (
    <div
      className="news-ticker-container"
      style={{
        background: "#0A0D14",
        borderTop: "1px solid #1B2334",
        borderLeft: "1px solid #1B2334",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: "36px",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-ocid="ticker.section"
    >
      {/* LIVE label */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-3"
        style={{
          background: "#0F172A",
          borderRight: "1px solid #1B2334",
          height: "100%",
          zIndex: 2,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
          style={{ background: "#FF3B3B" }}
        />
        <span
          className="text-xs font-black tracking-widest uppercase"
          style={{
            color: "#FF3B3B",
            fontSize: "0.6rem",
            whiteSpace: "nowrap",
          }}
        >
          LIVE
        </span>
      </div>

      {/* Fading edges */}
      <div
        style={{
          position: "absolute",
          left: "66px",
          top: 0,
          bottom: 0,
          width: "30px",
          background: "linear-gradient(to right, #0A0D14, transparent)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "40px",
          background: "linear-gradient(to left, #0A0D14, transparent)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Scrolling track */}
      <div
        style={{
          overflow: "hidden",
          flex: 1,
          height: "100%",
          position: "relative",
        }}
      >
        <div
          ref={trackRef}
          className="ticker-track"
          style={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            whiteSpace: "nowrap",
            // BUG FIX: must include animationName so the browser applies
            // the @keyframes ticker-scroll defined in index.css
            animationName: "ticker-scroll",
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationDuration: `${animationDuration}s`,
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {/* Duplicate items for seamless loop */}
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <span key={`${item.id}-t${idx}`} className="ticker-item">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.title}
                style={{
                  color: "#E9EEF7",
                  textDecoration: "none",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => setAnchorColor(e, "#60A5FA")}
                onMouseLeave={(e) => setAnchorColor(e, "#E9EEF7")}
              >
                {item.title}
              </a>
              <span
                style={{
                  color: "#3A4560",
                  fontSize: "0.62rem",
                  marginLeft: "6px",
                  fontWeight: 400,
                }}
              >
                {item.source} · {relativeTime(item.publishedAt)}
              </span>
              <span
                style={{
                  color: "#1B2334",
                  margin: "0 28px",
                  fontSize: "0.8rem",
                }}
              >
                ◆
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
