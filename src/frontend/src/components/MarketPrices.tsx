import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { MarketAsset } from "../hooks/useMarketPrices";
import { useMarketPrices } from "../hooks/useMarketPrices";

function formatPrice(asset: MarketAsset): string {
  if (asset.id === "bitcoin") {
    return `$${Math.round(asset.price).toLocaleString("en-US")}`;
  }
  if (asset.id === "sp500" || asset.id === "nasdaq" || asset.id === "dow") {
    return asset.price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return `$${asset.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ChangeBadge({ pct }: { pct: number }) {
  const isPos = pct >= 0;
  const bg = isPos ? "rgba(0,200,80,0.15)" : "rgba(255,59,59,0.15)";
  const color = isPos ? "#00C853" : "#FF3B3B";
  const arrow = isPos ? "▲" : "▼";
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold tabular-nums"
      style={{ background: bg, color, fontSize: "0.65rem", lineHeight: 1 }}
    >
      {arrow} {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

function MiniChart({
  asset,
  onClose,
}: { asset: MarketAsset; onClose: () => void }) {
  const isPos = asset.changePercent >= 0;
  const color = isPos ? "#00C853" : "#FF3B3B";
  const data = asset.history.map((v, i) => ({ i, v }));

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      style={{ overflow: "hidden" }}
    >
      <div
        className="px-3 pb-3 pt-1"
        style={{ borderTop: "1px solid #1B2334" }}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            style={{
              color: "#A9B3C7",
              fontSize: "0.6rem",
              letterSpacing: "0.05em",
            }}
          >
            {asset.name} — 30 day
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ color: "#3A4560", fontSize: "0.7rem", lineHeight: 1 }}
            className="hover:opacity-70 transition-opacity"
            aria-label="Close chart"
          >
            ✕
          </button>
        </div>
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart
              data={data}
              margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
            >
              <defs>
                <linearGradient
                  id={`grad-${asset.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip
                contentStyle={{
                  background: "#0F172A",
                  border: "1px solid #1B2334",
                  borderRadius: 4,
                  fontSize: "0.65rem",
                  color: "#E9EEF7",
                  padding: "2px 6px",
                }}
                formatter={(val: number) => [
                  asset.id === "bitcoin"
                    ? `$${Math.round(val).toLocaleString()}`
                    : `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  "",
                ]}
                labelFormatter={() => ""}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#grad-${asset.id})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ height: 60, color: "#3A4560", fontSize: "0.65rem" }}
          >
            Chart data unavailable
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function MarketPrices() {
  const { assets, isLoading, lastUpdated } = useMarketPrices();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const toggleChart = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div
      className="shrink-0"
      style={{
        background: "#0F172A",
        borderLeft: "1px solid #1B2334",
        borderBottom: "1px solid #1B2334",
      }}
      data-ocid="markets.section"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid #1B2334" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse-dot"
            style={{ background: "#00C853" }}
          />
          <h2
            className="text-xs font-black tracking-[0.15em] uppercase font-display"
            style={{ color: "#E9EEF7" }}
          >
            MARKETS
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span
            style={{
              color: "#3A4560",
              fontSize: "0.58rem",
              letterSpacing: "0.05em",
            }}
          >
            tap row for chart
          </span>
          <span
            style={{
              color: "#3A4560",
              fontSize: "0.6rem",
              letterSpacing: "0.05em",
            }}
          >
            30m refresh
          </span>
        </div>
      </div>

      {/* Asset rows */}
      <div className="px-4 py-1">
        {isLoading && assets.length === 0 ? (
          <div className="space-y-2 py-2" data-ocid="markets.loading_state">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <div
                    className="h-2.5 rounded"
                    style={{ background: "#1B2334", width: 64 }}
                  />
                  <div
                    className="h-2 rounded"
                    style={{ background: "#1B2334", width: 32 }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 rounded"
                    style={{ background: "#1B2334", width: 72 }}
                  />
                  <div
                    className="h-4 rounded"
                    style={{ background: "#1B2334", width: 52 }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            data-ocid="markets.list"
          >
            {assets.map((asset, idx) => (
              <div key={asset.id}>
                <motion.button
                  type="button"
                  className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
                  style={{
                    borderTop:
                      idx > 0 ? "1px solid rgba(27,35,52,0.5)" : "none",
                    cursor: "pointer",
                    background: "transparent",
                    border: idx > 0 ? "1px solid transparent" : "none",
                    borderTopColor:
                      idx > 0 ? "rgba(27,35,52,0.5)" : "transparent",
                    borderBottom: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    padding: "8px 0",
                  }}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.3 }}
                  onClick={() => toggleChart(asset.id)}
                  data-ocid={`markets.item.${idx + 1}`}
                  title={`Click to ${expandedId === asset.id ? "hide" : "show"} ${asset.name} chart`}
                >
                  {/* Left: name + symbol */}
                  <div className="flex flex-col">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "#E9EEF7", lineHeight: 1.3 }}
                    >
                      {asset.name}
                    </span>
                    <span
                      style={{
                        color: "#A9B3C7",
                        fontSize: "0.62rem",
                        lineHeight: 1.2,
                      }}
                    >
                      {asset.symbol}
                    </span>
                  </div>

                  {/* Right: price + change + chart toggle indicator */}
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{ color: "#E9EEF7" }}
                    >
                      {formatPrice(asset)}
                    </span>
                    <ChangeBadge pct={asset.changePercent} />
                    <span
                      style={{
                        color: "#3A4560",
                        fontSize: "0.6rem",
                        transform:
                          expandedId === asset.id
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        transition: "transform 0.2s",
                        display: "inline-block",
                      }}
                    >
                      ▾
                    </span>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {expandedId === asset.id && (
                    <MiniChart
                      asset={asset}
                      onClose={() => setExpandedId(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}

            {assets.length === 0 && (
              <div
                className="py-2 text-xs text-center"
                style={{ color: "#3A4560" }}
                data-ocid="markets.empty_state"
              >
                Prices unavailable
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Last updated footer */}
      {lastUpdatedStr && (
        <div
          className="px-4 pb-2"
          style={{
            color: "#3A4560",
            fontSize: "0.58rem",
            letterSpacing: "0.04em",
          }}
        >
          Last updated: {lastUpdatedStr}
        </div>
      )}
    </div>
  );
}
