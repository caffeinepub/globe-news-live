import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { MarketAsset } from "../hooks/useMarketPrices";
import { useMarketPrices } from "../hooks/useMarketPrices";

function formatPrice(asset: MarketAsset): string {
  const { id, price } = asset;
  if (id === "bitcoin" || id === "ethereum") {
    return `$${Math.round(price).toLocaleString("en-US")}`;
  }
  if (id === "sp500" || id === "nasdaq" || id === "dow") {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  if (id === "oil") {
    return `$${price.toFixed(2)}`;
  }
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ChangeBadge({ pct }: { pct: number }) {
  const isPos = pct >= 0;
  const color = isPos ? "#00C853" : "#FF3B3B";
  const arrow = isPos ? "▲" : "▼";
  return (
    <span
      className="tabular-nums"
      style={{ color, fontSize: "0.6rem", fontWeight: 700, lineHeight: 1 }}
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
      transition={{ duration: 0.2 }}
      style={{ overflow: "hidden", gridColumn: "1 / -1" }}
    >
      <div
        className="px-3 pb-2 pt-1"
        style={{ borderTop: "1px solid #1B2334" }}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            style={{
              color: "#A9B3C7",
              fontSize: "0.58rem",
              letterSpacing: "0.05em",
            }}
          >
            {asset.name} — 30 day
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ color: "#3A4560", fontSize: "0.65rem", lineHeight: 1 }}
            className="hover:opacity-70 transition-opacity"
            aria-label="Close chart"
          >
            ✕
          </button>
        </div>
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height={52}>
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
                  fontSize: "0.6rem",
                  color: "#E9EEF7",
                  padding: "2px 6px",
                }}
                formatter={(val: number) => [
                  `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
            style={{ height: 52, color: "#3A4560", fontSize: "0.6rem" }}
          >
            Chart data unavailable
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AssetCell({
  asset,
  isExpanded,
  onToggle,
}: {
  asset: MarketAsset;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      className="text-left transition-colors rounded"
      style={{
        background: isExpanded ? "rgba(255,255,255,0.04)" : "transparent",
        padding: "5px 7px",
        cursor: "pointer",
        border: "1px solid transparent",
        width: "100%",
      }}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      onClick={onToggle}
      title={`${asset.name} — tap for chart`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="min-w-0">
          <div
            className="font-bold truncate"
            style={{ color: "#E9EEF7", fontSize: "0.7rem", lineHeight: 1.2 }}
          >
            {asset.name}
          </div>
          <div
            style={{ color: "#3A4560", fontSize: "0.58rem", lineHeight: 1.2 }}
          >
            {asset.symbol}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className="font-bold tabular-nums"
            style={{ color: "#E9EEF7", fontSize: "0.7rem", lineHeight: 1.2 }}
          >
            {formatPrice(asset)}
          </div>
          <ChangeBadge pct={asset.changePercent} />
        </div>
      </div>
    </motion.button>
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

  const expandedAsset = assets.find((a) => a.id === expandedId) ?? null;

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
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: "1px solid #1B2334" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
            style={{ background: "#00C853" }}
          />
          <h2
            className="text-xs font-black tracking-[0.15em] uppercase font-display"
            style={{ color: "#E9EEF7", fontSize: "0.65rem" }}
          >
            MARKETS
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdatedStr && (
            <span style={{ color: "#3A4560", fontSize: "0.55rem" }}>
              {lastUpdatedStr}
            </span>
          )}
          <span style={{ color: "#3A4560", fontSize: "0.55rem" }}>30m</span>
        </div>
      </div>

      {/* Asset grid — 2 columns */}
      <div className="px-2 py-1.5">
        {isLoading && assets.length === 0 ? (
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: "1fr 1fr" }}
            data-ocid="markets.loading_state"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded p-1.5"
                style={{ background: "#1B2334" }}
              >
                <div
                  className="h-2 rounded mb-1"
                  style={{ background: "#243050", width: "60%" }}
                />
                <div
                  className="h-2 rounded"
                  style={{ background: "#243050", width: "80%" }}
                />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            data-ocid="markets.list"
          >
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              {assets.map((asset, idx) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.25 }}
                  data-ocid={`markets.item.${idx + 1}`}
                >
                  <AssetCell
                    asset={asset}
                    isExpanded={expandedId === asset.id}
                    onToggle={() => toggleChart(asset.id)}
                  />
                </motion.div>
              ))}
            </div>

            {/* Expanded chart — spans full width below the grid */}
            <AnimatePresence>
              {expandedAsset && (
                <MiniChart
                  asset={expandedAsset}
                  onClose={() => setExpandedId(null)}
                />
              )}
            </AnimatePresence>

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
    </div>
  );
}
