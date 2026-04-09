import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  FILTER_LAYERS,
  type FilterLayerId,
  type MoonPhaseInfo,
} from "../types/filters";

interface GlobeFiltersProps {
  activeLayers: Set<FilterLayerId>;
  onToggle: (id: FilterLayerId) => void;
  moonPhase?: MoonPhaseInfo | null;
  loadingLayers?: Set<FilterLayerId>;
}

export function GlobeFilters({
  activeLayers,
  onToggle,
  moonPhase,
  loadingLayers = new Set(),
}: GlobeFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeCount = activeLayers.size;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "16px",
        left: "16px",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "6px",
      }}
    >
      {/* Filter panel — slides up above the button */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              background: "rgba(7, 14, 28, 0.94)",
              backdropFilter: "blur(12px)",
              border: "1px solid #1B2334",
              borderRadius: 12,
              padding: "10px 8px",
              minWidth: 210,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                color: "#3A4560",
                textTransform: "uppercase",
                paddingLeft: 4,
                paddingBottom: 8,
                borderBottom: "1px solid #1B2334",
                marginBottom: 6,
              }}
            >
              Globe Overlays
            </div>

            {/* Moon Phase info if active */}
            {activeLayers.has("moonphase") && moonPhase && (
              <div
                style={{
                  marginBottom: 6,
                  padding: "6px 8px",
                  background: "rgba(226,232,240,0.07)",
                  borderRadius: 8,
                  border: "1px solid rgba(226,232,240,0.12)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "1.1rem" }}>{moonPhase.icon}</span>
                  <div>
                    <div
                      style={{
                        color: "#E9EEF7",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                      }}
                    >
                      {moonPhase.phase}
                    </div>
                    <div style={{ color: "#A9B3C7", fontSize: "0.75rem" }}>
                      {moonPhase.illumination}% illuminated
                    </div>
                    <div style={{ color: "#6B7A9A", fontSize: "0.75rem" }}>
                      Full: {moonPhase.nextFull} · New: {moonPhase.nextNew}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              {FILTER_LAYERS.map((layer) => {
                const active = activeLayers.has(layer.id);
                const loading = loadingLayers.has(layer.id);
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => onToggle(layer.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 8px",
                      borderRadius: 7,
                      border: active
                        ? `1px solid ${layer.color}44`
                        : "1px solid transparent",
                      background: active ? `${layer.color}18` : "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      width: "100%",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!active)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "transparent";
                    }}
                  >
                    {/* Toggle dot */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: active ? layer.color : "#1B2334",
                        border: `1.5px solid ${active ? layer.color : "#2A3450"}`,
                        flexShrink: 0,
                        transition: "all 0.15s",
                      }}
                    />
                    <span
                      style={{ fontSize: "1rem", lineHeight: 1, flexShrink: 0 }}
                    >
                      {layer.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: active ? "#E9EEF7" : "#A9B3C7",
                          fontSize: "0.78rem",
                          fontWeight: active ? 700 : 500,
                          lineHeight: 1.2,
                          transition: "color 0.15s",
                        }}
                      >
                        {layer.label}
                        {loading && (
                          <span
                            style={{
                              marginLeft: 5,
                              fontSize: "0.65rem",
                              color: layer.color,
                              opacity: 0.8,
                            }}
                          >
                            loading…
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          color: "#5A6580",
                          fontSize: "0.7rem",
                          lineHeight: 1.2,
                          marginTop: 1,
                        }}
                      >
                        {layer.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        type="button"
        aria-label="Toggle globe overlays"
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 36,
          paddingLeft: 10,
          paddingRight: 10,
          borderRadius: 8,
          background: open ? "rgba(56, 189, 248, 0.18)" : "rgba(11,19,36,0.82)",
          border: open
            ? "1px solid rgba(56,189,248,0.35)"
            : "1px solid #1B2334",
          color: open ? "#38BDF8" : "#A9B3C7",
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          backdropFilter: "blur(6px)",
          transition: "all 0.15s",
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="20" y2="12" />
          <line x1="12" y1="18" x2="20" y2="18" />
          <circle cx="4" cy="6" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="12" cy="18" r="1.5" />
        </svg>
        FILTERS
        {activeCount > 0 && (
          <span
            style={{
              background: "#38BDF8",
              color: "#070E1C",
              borderRadius: "50%",
              width: 16,
              height: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.55rem",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}
