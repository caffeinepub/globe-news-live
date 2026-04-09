import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsItem } from "../types";

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

// Reading speed: ~30px per second — slow, comfortable, readable (halved from 60)
const PX_PER_SECOND = 30;

export function NewsTicker({ articles }: NewsTickerProps) {
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

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

  // Measure actual rendered track width for accurate animation duration
  useEffect(() => {
    if (!trackRef.current) return;
    const observer = new ResizeObserver(() => {
      if (trackRef.current) {
        // The track contains 2 copies; half width = one copy
        setTrackWidth(trackRef.current.scrollWidth / 2);
      }
    });
    observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, []);

  // Duration based on actual measured width — halved speed means doubled duration
  const animationDuration =
    trackWidth > 0 ? Math.max(60, Math.round(trackWidth / PX_PER_SECOND)) : 240;

  if (tickerItems.length === 0) return null;

  return (
    <div
      style={{
        background: "#0A0D14",
        borderTop: "1px solid #1B2334",
        borderLeft: "1px solid #1B2334",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: "34px",
        flexShrink: 0,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-ocid="ticker.section"
    >
      {/* LIVE label */}
      <div
        style={{
          background: "#0F172A",
          borderRight: "1px solid #1B2334",
          height: "100%",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "0 10px",
          flexShrink: 0,
        }}
      >
        <span
          className="animate-pulse-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#FF3B3B",
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#FF3B3B",
            fontSize: "0.58rem",
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
          left: "60px",
          top: 0,
          bottom: 0,
          width: "24px",
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
          width: "32px",
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
            whiteSpace: "nowrap",
            animationName: "ticker-scroll",
            animationDuration: `${animationDuration}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationPlayState: paused ? "paused" : "running",
            willChange: "transform",
          }}
        >
          {/* Duplicate items x2 for seamless loop */}
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <span
              key={`${item.id}-${idx}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0 4px",
              }}
            >
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.title}
                style={{
                  color: "#E9EEF7",
                  textDecoration: "none",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#60A5FA";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#E9EEF7";
                }}
              >
                {item.title}
              </a>
              <span
                style={{
                  color: "#3A4560",
                  fontSize: "0.6rem",
                  marginLeft: "6px",
                  fontWeight: 400,
                }}
              >
                {item.source} · {relativeTime(item.publishedAt)}
              </span>
              <span
                style={{
                  color: "#1B2334",
                  margin: "0 24px",
                  fontSize: "0.75rem",
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
