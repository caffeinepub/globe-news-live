import { useEffect, useState } from "react";

export interface ISSPosition {
  lat: number;
  lng: number;
  altitude: number; // km
  velocity: number; // km/h
}

export function useISS() {
  const [position, setPosition] = useState<ISSPosition | null>(null);

  useEffect(() => {
    const fetchISS = async () => {
      try {
        const res = await fetch(
          "https://api.wheretheiss.at/v1/satellites/25544",
          { signal: AbortSignal.timeout(6000) },
        );
        if (!res.ok) return;
        const d = await res.json();
        setPosition({
          lat: d.latitude,
          lng: d.longitude,
          altitude: Math.round(d.altitude),
          velocity: Math.round(d.velocity),
        });
      } catch {
        /* ignore — ISS pin disappears if unreachable */
      }
    };

    fetchISS();
    const t = setInterval(fetchISS, 10000); // live update every 10 seconds
    return () => clearInterval(t);
  }, []);

  return position;
}
