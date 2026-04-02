import { useCallback, useEffect, useState } from "react";
import type { EarthquakeItem } from "../types";

const USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_MAGNITUDE = 3.0; // hide anything weaker than M3.0

export function useEarthquakes() {
  const [earthquakes, setEarthquakes] = useState<EarthquakeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<number>(0);

  const fetchEarthquakes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(USGS_URL);
      const json = await res.json();
      const items: EarthquakeItem[] = (
        (json.features ?? []) as Array<{
          id: string;
          geometry: { coordinates: number[] };
          properties: {
            mag: number | null;
            place: string | null;
            time: number;
            url: string | null;
          };
        }>
      )
        .filter(
          (f) =>
            f.geometry?.coordinates?.length >= 2 &&
            f.properties?.mag != null &&
            (f.properties.mag as number) >= MIN_MAGNITUDE,
        )
        .map((f) => ({
          id: f.id,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          magnitude: f.properties.mag as number,
          place: f.properties.place ?? "Unknown location",
          time: f.properties.time,
          depth: f.geometry.coordinates[2] ?? 0,
          title: `M${(f.properties.mag as number).toFixed(1)} — ${
            f.properties.place ?? "Unknown"
          }`,
          url: f.properties.url ?? "",
          isEarthquake: true as const,
        }));
      setEarthquakes(items);
      setLastFetched(Date.now());
    } catch (e) {
      console.error("Failed to fetch earthquakes", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarthquakes();
    const interval = setInterval(fetchEarthquakes, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchEarthquakes]);

  return { earthquakes, isLoading, lastFetched };
}
