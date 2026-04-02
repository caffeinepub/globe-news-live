import { useEffect, useState } from "react";

export type KpLevel = "quiet" | "unsettled" | "storm" | "severe";

export interface SpaceWeather {
  solarWindSpeed: number; // km/s
  kpIndex: number;
  kpLevel: KpLevel;
  lastUpdated: Date | null;
}

function toKpLevel(kp: number): KpLevel {
  if (kp < 4) return "quiet";
  if (kp < 5) return "unsettled";
  if (kp < 7) return "storm";
  return "severe";
}

export function useSpaceWeather() {
  const [data, setData] = useState<SpaceWeather | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [windRes, kpRes] = await Promise.all([
          fetch(
            "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json",
            { signal: AbortSignal.timeout(8000) },
          ),
          fetch(
            "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json",
            { signal: AbortSignal.timeout(8000) },
          ),
        ]);

        if (!windRes.ok || !kpRes.ok) return;

        const windData: Array<Array<string>> = await windRes.json();
        const kpData: Array<{ estimated_kp?: number; kp_index?: number }> =
          await kpRes.json();

        // windData[0] = headers ["time_tag","density","speed","temperature"]
        // Last entry has most recent reading
        const latestWind = windData[windData.length - 1];
        const speed = Number.parseFloat(latestWind[2]);

        const latestKp = kpData[kpData.length - 1];
        const kp = latestKp?.estimated_kp ?? latestKp?.kp_index ?? 0;

        if (speed > 0) {
          setData({
            solarWindSpeed: Math.round(speed),
            kpIndex: Math.round(kp * 10) / 10,
            kpLevel: toKpLevel(kp),
            lastUpdated: new Date(),
          });
        }
      } catch {
        /* NOAA unavailable — widget stays hidden */
      }
    };

    load();
    const t = setInterval(load, 15 * 60 * 1000); // every 15 min
    return () => clearInterval(t);
  }, []);

  return data;
}
