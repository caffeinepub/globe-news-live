import type { SpaceWeather } from "../hooks/useSpaceWeather";

interface SpaceWeatherProps {
  data: SpaceWeather | null;
}

function windColor(speed: number): string {
  if (speed < 400) return "#00C853";
  if (speed < 600) return "#FFB300";
  return "#FF3B3B";
}

function kpColor(level: SpaceWeather["kpLevel"]): string {
  if (level === "quiet") return "#00C853";
  if (level === "unsettled") return "#FFB300";
  if (level === "storm") return "#FF8C00";
  return "#FF3B3B";
}

function kpLabel(level: SpaceWeather["kpLevel"]): string {
  if (level === "quiet") return "Quiet";
  if (level === "unsettled") return "Unsettled";
  if (level === "storm") return "Storm";
  return "Severe";
}

export function SpaceWeatherWidget({ data }: SpaceWeatherProps) {
  if (!data) return null;

  return (
    <div
      style={{
        background: "#0A0D14",
        borderLeft: "1px solid #1B2334",
        borderBottom: "1px solid #1B2334",
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        flexShrink: 0,
      }}
      data-ocid="space-weather.section"
    >
      {/* Sun icon */}
      <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFB300"
          strokeWidth="2"
          aria-label="Space weather"
          role="img"
        >
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="4.22" y1="4.22" x2="7.05" y2="7.05" />
          <line x1="16.95" y1="16.95" x2="19.78" y2="19.78" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <line x1="4.22" y1="19.78" x2="7.05" y2="16.95" />
          <line x1="16.95" y1="7.05" x2="19.78" y2="4.22" />
        </svg>
        <span
          style={{
            fontSize: "0.55rem",
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "#A9B3C7",
            textTransform: "uppercase",
          }}
        >
          SPACE WEATHER
        </span>
      </div>

      {/* Solar wind */}
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: windColor(data.solarWindSpeed) }}
        />
        <span style={{ fontSize: "0.62rem", color: "#A9B3C7" }}>
          Wind{" "}
          <span
            style={{
              color: windColor(data.solarWindSpeed),
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {data.solarWindSpeed}
          </span>{" "}
          <span style={{ color: "#3A4560", fontSize: "0.55rem" }}>km/s</span>
        </span>
      </div>

      {/* Kp index */}
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: kpColor(data.kpLevel) }}
        />
        <span style={{ fontSize: "0.62rem", color: "#A9B3C7" }}>
          Kp{" "}
          <span
            style={{
              color: kpColor(data.kpLevel),
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {data.kpIndex.toFixed(1)}
          </span>{" "}
          <span style={{ color: kpColor(data.kpLevel), fontSize: "0.55rem" }}>
            {kpLabel(data.kpLevel)}
          </span>
        </span>
      </div>
    </div>
  );
}
