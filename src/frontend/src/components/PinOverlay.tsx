import {
  AlertTriangle,
  Clock,
  ExternalLink,
  MapPin,
  Radio,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { NewsItem } from "../backend.d";
import type { EarthquakeItem, StreamItem } from "../types";

type ModalItem = NewsItem | StreamItem | EarthquakeItem;

function isStream(item: ModalItem): item is StreamItem {
  return (item as StreamItem).isStream === true;
}

function isEarthquake(item: ModalItem): item is EarthquakeItem {
  return (item as EarthquakeItem).isEarthquake === true;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatTimestamp(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(ms);
  }
}

function getMagnitudeColor(mag: number): string {
  if (mag >= 7) return "#FF2020";
  if (mag >= 5) return "#FF6B00";
  if (mag >= 3) return "#FF8C00";
  return "#FFA940";
}

interface PinOverlayProps {
  item: ModalItem | null;
  onClose: () => void;
}

export function PinOverlay({ item, onClose }: PinOverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Determine accent color based on type
  function getAccentGradient(i: ModalItem): string {
    if (isStream(i)) return "linear-gradient(90deg, #2F7BFF, #5B9BFF)";
    if (isEarthquake(i))
      return `linear-gradient(90deg, ${getMagnitudeColor(i.magnitude)}, #FFB340)`;
    return "linear-gradient(90deg, #FF3B3B, #FF6B6B)";
  }

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-ocid="overlay.modal"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "rgba(7,10,15,0.8)",
              backdropFilter: "blur(8px)",
            }}
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            className="relative z-10 w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{
              background: "#111827",
              border: "1px solid #1B2334",
              boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
            }}
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            {/* Top accent bar */}
            <div
              className="h-1"
              style={{ background: getAccentGradient(item) }}
            />

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid #1B2334" }}
            >
              <div className="flex items-center gap-2.5">
                {isStream(item) ? (
                  <span className="badge-live flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5" />
                    LIVE
                  </span>
                ) : isEarthquake(item) ? (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
                    style={{
                      background: "rgba(255,140,0,0.15)",
                      color: "#FF8C00",
                      border: "1px solid rgba(255,140,0,0.3)",
                    }}
                  >
                    <AlertTriangle className="w-2.5 h-2.5" />
                    EARTHQUAKE
                  </span>
                ) : (
                  <span className="badge-breaking">BREAKING</span>
                )}
                <span
                  className="text-xs font-semibold"
                  style={{ color: "#A9B3C7" }}
                >
                  {isEarthquake(item) ? "USGS" : item.source}
                </span>
                {!isStream(item) && !isEarthquake(item) && (
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: "#A9B3C7" }}
                  >
                    <Clock className="w-3 h-3" />
                    {formatDate(item.publishedAt)}
                  </span>
                )}
                {isEarthquake(item) && (
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: "#A9B3C7" }}
                  >
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(item.time)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "#A9B3C7" }}
                data-ocid="overlay.close_button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              <h2
                className="text-lg font-bold leading-snug mb-4 font-display"
                style={{ color: "#E9EEF7" }}
              >
                {item.title}
              </h2>

              {isStream(item) ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4" style={{ color: "#2F7BFF" }} />
                    <span className="text-sm" style={{ color: "#A9B3C7" }}>
                      {item.country}
                    </span>
                  </div>
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ background: "#000" }}
                  >
                    <div className="relative" style={{ paddingTop: "56.25%" }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1`}
                        title={item.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  </div>
                </>
              ) : isEarthquake(item) ? (
                <>
                  {/* Magnitude display */}
                  <div className="flex items-center gap-4 mb-5">
                    <div
                      className="flex flex-col items-center justify-center rounded-2xl"
                      style={{
                        width: 80,
                        height: 80,
                        background: `rgba(${item.magnitude >= 7 ? "255,32,32" : item.magnitude >= 5 ? "255,107,0" : "255,140,0"},0.12)`,
                        border: `2px solid ${getMagnitudeColor(item.magnitude)}`,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        className="font-black leading-none"
                        style={{
                          fontSize: "1.8rem",
                          color: getMagnitudeColor(item.magnitude),
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {item.magnitude.toFixed(1)}
                      </span>
                      <span
                        className="text-xs font-semibold mt-0.5"
                        style={{ color: "#A9B3C7" }}
                      >
                        Magnitude
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <MapPin
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#FF8C00" }}
                        />
                        <span className="text-sm" style={{ color: "#E9EEF7" }}>
                          {item.place}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ color: "#A9B3C7", flexShrink: 0 }}
                          aria-label="Depth"
                          role="img"
                        >
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                          <line x1="5" y1="21" x2="19" y2="21" />
                        </svg>
                        <span className="text-sm" style={{ color: "#A9B3C7" }}>
                          Depth:{" "}
                          <span style={{ color: "#E9EEF7" }}>
                            {item.depth.toFixed(1)} km
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* USGS link */}
                  {item.url && (
                    <div className="flex justify-end">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
                        style={{ background: "#FF8C00" }}
                        data-ocid="overlay.primary_button"
                      >
                        View on USGS
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p
                    className="text-sm leading-relaxed mb-5"
                    style={{ color: "#A9B3C7" }}
                  >
                    {item.description ||
                      "No description available for this story."}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin
                        className="w-3.5 h-3.5"
                        style={{ color: "#A9B3C7" }}
                      />
                      <span className="text-xs" style={{ color: "#A9B3C7" }}>
                        {item.country}
                      </span>
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
                        style={{ background: "#FF3B3B" }}
                        data-ocid="overlay.primary_button"
                      >
                        Read Full Story
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
