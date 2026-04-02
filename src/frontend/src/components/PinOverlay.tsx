import { AlertTriangle, Clock, ExternalLink, MapPin, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { NewsItem } from "../backend.d";
import type { EarthquakeItem, ISSItem, VolcanoItem } from "../types";

type ModalItem = NewsItem | EarthquakeItem | ISSItem | VolcanoItem;

function isEarthquake(item: ModalItem): item is EarthquakeItem {
  return (item as EarthquakeItem).isEarthquake === true;
}

function isISS(item: ModalItem): item is ISSItem {
  return (item as ISSItem).isISS === true;
}

function isVolcano(item: ModalItem): item is VolcanoItem {
  return (item as VolcanoItem).isVolcano === true;
}

function isNews(item: ModalItem): item is NewsItem {
  return !isEarthquake(item) && !isISS(item) && !isVolcano(item);
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

function volcanoStatusColor(status: string): string {
  if (status === "Erupting") return "#FF4500";
  if (status === "Unrest") return "#FF6AC1";
  return "#FF8C69";
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

  function getAccentGradient(i: ModalItem): string {
    if (isEarthquake(i))
      return `linear-gradient(90deg, ${getMagnitudeColor(i.magnitude)}, #FFB340)`;
    if (isISS(i)) return "linear-gradient(90deg, #00FFFF, #0080FF)";
    if (isVolcano(i))
      return `linear-gradient(90deg, ${volcanoStatusColor(i.status)}, #FF8C69)`;
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
                {isEarthquake(item) ? (
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
                ) : isISS(item) ? (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
                    style={{
                      background: "rgba(0,255,255,0.1)",
                      color: "#00FFFF",
                      border: "1px solid rgba(0,255,255,0.3)",
                    }}
                  >
                    ISS LIVE
                  </span>
                ) : isVolcano(item) ? (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
                    style={{
                      background: "rgba(255,69,0,0.15)",
                      color: volcanoStatusColor(item.status),
                      border: "1px solid rgba(255,69,0,0.3)",
                    }}
                  >
                    🌋 VOLCANO
                  </span>
                ) : (
                  <span className="badge-breaking">BREAKING</span>
                )}
                <span
                  className="text-xs font-semibold"
                  style={{ color: "#A9B3C7" }}
                >
                  {isEarthquake(item)
                    ? "USGS"
                    : isISS(item)
                      ? "wheretheiss.at"
                      : isVolcano(item)
                        ? item.country
                        : item.source}
                </span>
                {isNews(item) && (
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

              {isISS(item) && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: "rgba(0,255,255,0.06)",
                        border: "1px solid rgba(0,255,255,0.15)",
                      }}
                    >
                      <div
                        style={{
                          color: "#00FFFF",
                          fontSize: "1.5rem",
                          fontWeight: 800,
                        }}
                      >
                        {item.altitude}
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "#A9B3C7",
                            marginLeft: 4,
                          }}
                        >
                          km
                        </span>
                      </div>
                      <div style={{ color: "#A9B3C7", fontSize: "0.7rem" }}>
                        Altitude
                      </div>
                    </div>
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: "rgba(0,255,255,0.06)",
                        border: "1px solid rgba(0,255,255,0.15)",
                      }}
                    >
                      <div
                        style={{
                          color: "#00FFFF",
                          fontSize: "1.5rem",
                          fontWeight: 800,
                        }}
                      >
                        {item.velocity.toLocaleString()}
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "#A9B3C7",
                            marginLeft: 4,
                          }}
                        >
                          km/h
                        </span>
                      </div>
                      <div style={{ color: "#A9B3C7", fontSize: "0.7rem" }}>
                        Velocity
                      </div>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2"
                    style={{ color: "#A9B3C7", fontSize: "0.8rem" }}
                  >
                    <MapPin
                      className="w-4 h-4 shrink-0"
                      style={{ color: "#00FFFF" }}
                    />
                    <span>
                      Position: {item.lat.toFixed(2)}° lat,{" "}
                      {item.lng.toFixed(2)}° lng
                    </span>
                  </div>
                  <p style={{ color: "#3A4560", fontSize: "0.75rem" }}>
                    The ISS orbits Earth at ~400km altitude traveling at
                    approximately 28,000 km/h, completing one orbit every 90
                    minutes. This position updates every 10 seconds.
                  </p>
                </div>
              )}

              {isVolcano(item) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex flex-col items-center justify-center rounded-2xl shrink-0"
                      style={{
                        width: 72,
                        height: 72,
                        background: "rgba(255,69,0,0.1)",
                        border: `2px solid ${volcanoStatusColor(item.status)}`,
                      }}
                    >
                      <span style={{ fontSize: "1.6rem" }}>🌋</span>
                      <span
                        style={{
                          fontSize: "0.55rem",
                          color: volcanoStatusColor(item.status),
                          fontWeight: 700,
                        }}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <MapPin
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#FF8C00" }}
                        />
                        <span
                          style={{ color: "#E9EEF7", fontSize: "0.875rem" }}
                        >
                          {item.name}, {item.country}
                        </span>
                      </div>
                      <div style={{ color: "#A9B3C7", fontSize: "0.8rem" }}>
                        Lat: {item.lat.toFixed(3)}°, Lng: {item.lng.toFixed(3)}°
                      </div>
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                        style={{
                          background: `${volcanoStatusColor(item.status)}20`,
                          color: volcanoStatusColor(item.status),
                          border: `1px solid ${volcanoStatusColor(item.status)}40`,
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <p style={{ color: "#3A4560", fontSize: "0.75rem" }}>
                    Source: Smithsonian Institution Global Volcanism Program.
                    Activity status based on reports from 2024–2026.
                  </p>
                </div>
              )}

              {isEarthquake(item) && (
                <>
                  {/* Magnitude display */}
                  <div className="flex items-center gap-4 mb-5">
                    <div
                      className="flex flex-col items-center justify-center rounded-2xl"
                      style={{
                        width: 80,
                        height: 80,
                        background: `rgba(${
                          item.magnitude >= 7
                            ? "255,32,32"
                            : item.magnitude >= 5
                              ? "255,107,0"
                              : "255,140,0"
                        },0.12)`,
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
                          Depth: {item.depth} km
                        </span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{
                      background: "rgba(255,140,0,0.12)",
                      color: "#FF8C00",
                      border: "1px solid rgba(255,140,0,0.3)",
                    }}
                    data-ocid="overlay.link"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on USGS
                  </a>
                </>
              )}

              {isNews(item) && (
                <>
                  {item.description && (
                    <p
                      className="text-sm leading-relaxed mb-5"
                      style={{ color: "#A9B3C7" }}
                    >
                      {item.description.length > 280
                        ? `${item.description.slice(0, 280)}\u2026`
                        : item.description}
                    </p>
                  )}

                  <div
                    className="flex items-center gap-3 mb-5 text-xs"
                    style={{ color: "#3A4560" }}
                  >
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.country}
                    </span>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{
                      background: "rgba(255,59,59,0.12)",
                      color: "#FF3B3B",
                      border: "1px solid rgba(255,59,59,0.3)",
                    }}
                    data-ocid="overlay.link"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Read full story
                  </a>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
