import { useCallback, useEffect, useState } from "react";
import type {
  AirQualityPin,
  CyclonePin,
  FilterLayerId,
  FlightPin,
  MeteorShowerPin,
  MoonPhaseInfo,
  TsunamiPin,
  WeatherPin,
  WildfirePin,
} from "../types/filters";

// ── Weather (OpenMeteo, no key) ────────────────────────────────────────────────
const WEATHER_CITIES = [
  { city: "New York", lat: 40.71, lng: -74.0 },
  { city: "London", lat: 51.51, lng: -0.13 },
  { city: "Tokyo", lat: 35.69, lng: 139.69 },
  { city: "Sydney", lat: -33.87, lng: 151.21 },
  { city: "Cairo", lat: 30.06, lng: 31.24 },
  { city: "Mumbai", lat: 19.08, lng: 72.88 },
  { city: "São Paulo", lat: -23.55, lng: -46.63 },
  { city: "Moscow", lat: 55.75, lng: 37.62 },
  { city: "Lagos", lat: 6.52, lng: 3.38 },
  { city: "Beijing", lat: 39.9, lng: 116.4 },
  { city: "Dubai", lat: 25.2, lng: 55.27 },
  { city: "Toronto", lat: 43.65, lng: -79.38 },
  { city: "Berlin", lat: 52.52, lng: 13.41 },
  { city: "Paris", lat: 48.85, lng: 2.35 },
  { city: "Mexico City", lat: 19.43, lng: -99.13 },
  { city: "Jakarta", lat: -6.21, lng: 106.85 },
  { city: "Nairobi", lat: -1.29, lng: 36.82 },
  { city: "Buenos Aires", lat: -34.6, lng: -58.38 },
  { city: "Seoul", lat: 37.57, lng: 126.98 },
  { city: "Istanbul", lat: 41.01, lng: 28.95 },
];

const WMO_CONDITION: Record<number, string> = {
  0: "Clear",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Icy Fog",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  80: "Showers",
  81: "Heavy Showers",
  82: "Violent Showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

export async function fetchWeatherPins(): Promise<WeatherPin[]> {
  const lats = WEATHER_CITIES.map((c) => c.lat).join(",");
  const lngs = WEATHER_CITIES.map((c) => c.lng).join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh&timezone=auto`;

  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`OpenMeteo HTTP ${res.status}`);
  const data = await res.json();

  const results: WeatherPin[] = [];
  const list = Array.isArray(data) ? data : [data];
  for (let i = 0; i < list.length && i < WEATHER_CITIES.length; i++) {
    const d = list[i];
    const city = WEATHER_CITIES[i];
    const temp = Math.round(d?.current?.temperature_2m ?? 0);
    const wind = Math.round(d?.current?.wind_speed_10m ?? 0);
    const code = d?.current?.weather_code ?? 0;
    const condition = WMO_CONDITION[code] ?? "Unknown";
    results.push({
      id: `weather-${city.city}`,
      lat: city.lat,
      lng: city.lng,
      city: city.city,
      temp,
      condition,
      windSpeed: wind,
      title: `${city.city}: ${temp}\u00b0C, ${condition}, Wind ${wind} km/h`,
      isWeather: true,
    });
  }
  return results;
}

// ── Wildfires (NASA FIRMS CSV via proxy) ───────────────────────────────────────────
export async function fetchWildfirePins(): Promise<WildfirePin[]> {
  const url =
    "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv";
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`FIRMS proxy HTTP ${res.status}`);
  const json = await res.json();
  const csv: string = json?.contents ?? "";
  const lines = csv.trim().split("\n").slice(1);
  const pins: WildfirePin[] = [];
  for (const line of lines.slice(0, 300)) {
    const cols = line.split(",");
    const lat = Number.parseFloat(cols[0]);
    const lng = Number.parseFloat(cols[1]);
    const brightness = Number.parseFloat(cols[2]);
    const confidence = Number.parseFloat(cols[9] ?? "0");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (confidence < 50) continue;
    pins.push({
      id: `fire-${lat.toFixed(2)}-${lng.toFixed(2)}`,
      lat,
      lng,
      brightness,
      confidence,
      title: `Active Wildfire \u2014 Brightness: ${Math.round(brightness)}K, Confidence: ${Math.round(confidence)}%`,
      isWildfire: true,
    });
  }
  return deduplicatePins(pins, 0.5);
}

function deduplicatePins<T extends { lat: number; lng: number }>(
  pins: T[],
  minDist: number,
): T[] {
  const result: T[] = [];
  for (const pin of pins) {
    const tooClose = result.some(
      (r) =>
        Math.abs(r.lat - pin.lat) < minDist &&
        Math.abs(r.lng - pin.lng) < minDist,
    );
    if (!tooClose) result.push(pin);
  }
  return result;
}

// ── Cyclones (JTWC RSS) ──────────────────────────────────────────────────────────
export async function fetchCyclonePins(): Promise<CyclonePin[]> {
  try {
    const url = "https://www.metoc.navy.mil/jtwc/rss/jtwc.rss";
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`JTWC HTTP ${res.status}`);
    const json = await res.json();
    const xml: string = json?.contents ?? "";
    const pins: CyclonePin[] = [];
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    for (const item of items) {
      const titleMatch =
        item.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/) ??
        item.match(/<title>([^<]+)<\/title>/);
      const latMatch =
        item.match(/lat\s*=\s*"?([\-\d.]+)"?/) ??
        item.match(/<geo:lat>([\-\d.]+)<\/geo:lat>/);
      const lngMatch =
        item.match(/lon\s*=\s*"?([\-\d.]+)"?/) ??
        item.match(/<geo:long>([\-\d.]+)<\/geo:long>/);
      if (!titleMatch || !latMatch || !lngMatch) continue;
      const lat = Number.parseFloat(latMatch[1]);
      const lng = Number.parseFloat(lngMatch[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const name = titleMatch[1].trim();
      pins.push({
        id: `cyclone-${name.replace(/\s+/g, "-").toLowerCase()}`,
        lat,
        lng,
        name,
        category: "Tropical Storm",
        windSpeed: 0,
        title: `Tropical Storm: ${name}`,
        isCyclone: true,
      });
    }
    return pins;
  } catch {
    return [];
  }
}

// ── Live Flights (OpenSky Network) ──────────────────────────────────────────────
export async function fetchFlightPins(): Promise<FlightPin[]> {
  const url =
    "https://opensky-network.org/api/states/all?lamin=-60&lomin=-180&lamax=75&lomax=180";
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);
  const data = await res.json();
  const states: unknown[][] = data?.states ?? [];
  const pins: FlightPin[] = [];
  for (const s of states) {
    if (!Array.isArray(s)) continue;
    const lng = typeof s[5] === "number" ? s[5] : null;
    const lat = typeof s[6] === "number" ? s[6] : null;
    if (lat === null || lng === null) continue;
    const callsign = (typeof s[1] === "string" ? s[1] : "").trim() || "Unknown";
    const altitude = typeof s[7] === "number" ? s[7] : 0;
    const velocity = typeof s[9] === "number" ? s[9] : 0;
    const country = typeof s[2] === "string" ? s[2] : "";
    pins.push({
      id: `flight-${s[0]}`,
      lat,
      lng,
      callsign,
      altitude: Math.round(altitude),
      velocity: Math.round(velocity),
      country,
      title: `\u2708 ${callsign} \u2014 Alt: ${Math.round(altitude)}m, Speed: ${Math.round(velocity * 3.6)} km/h \u2014 ${country}`,
      isFlight: true,
    });
  }
  return sampleArray(pins, 200);
}

function sampleArray<T>(arr: T[], maxCount: number): T[] {
  if (arr.length <= maxCount) return arr;
  const step = arr.length / maxCount;
  return Array.from({ length: maxCount }, (_, i) => arr[Math.floor(i * step)]);
}

// ── Air Quality (Open-Meteo AQ API, no key) ──────────────────────────────────────
const AQI_CITIES = [
  { city: "New York", lat: 40.71, lng: -74.0 },
  { city: "Beijing", lat: 39.9, lng: 116.4 },
  { city: "Delhi", lat: 28.61, lng: 77.21 },
  { city: "London", lat: 51.51, lng: -0.13 },
  { city: "Los Angeles", lat: 34.05, lng: -118.24 },
  { city: "Mexico City", lat: 19.43, lng: -99.13 },
  { city: "São Paulo", lat: -23.55, lng: -46.63 },
  { city: "Cairo", lat: 30.06, lng: 31.24 },
  { city: "Tokyo", lat: 35.69, lng: 139.69 },
  { city: "Jakarta", lat: -6.21, lng: 106.85 },
  { city: "Seoul", lat: 37.57, lng: 126.98 },
  { city: "Bangkok", lat: 13.75, lng: 100.52 },
  { city: "Mumbai", lat: 19.08, lng: 72.88 },
  { city: "Karachi", lat: 24.86, lng: 67.01 },
  { city: "Lagos", lat: 6.52, lng: 3.38 },
];

function aqiCategory(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export async function fetchAirQualityPins(): Promise<AirQualityPin[]> {
  const lats = AQI_CITIES.map((c) => c.lat).join(",");
  const lngs = AQI_CITIES.map((c) => c.lng).join(",");
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lngs}&current=us_aqi`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Open-Meteo AQ HTTP ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : [data];
  const pins: AirQualityPin[] = [];
  for (let i = 0; i < list.length && i < AQI_CITIES.length; i++) {
    const d = list[i];
    const city = AQI_CITIES[i];
    const aqi = Math.round(d?.current?.us_aqi ?? 0);
    if (aqi <= 0) continue;
    const category = aqiCategory(aqi);
    pins.push({
      id: `aqi-${city.city}`,
      lat: city.lat,
      lng: city.lng,
      city: city.city,
      aqi,
      category,
      title: `${city.city} Air Quality: AQI ${aqi} \u2014 ${category}`,
      isAirQuality: true,
    });
  }
  return pins;
}

// ── Tsunami Alerts (NOAA/PTWC RSS via proxy) ────────────────────────────────────
export async function fetchTsunamiPins(): Promise<TsunamiPin[]> {
  try {
    const url = "https://www.tsunami.gov/events/rss/ptwc_pacific.rss";
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const json = await res.json();
    const xml: string = json?.contents ?? "";
    const pins: TsunamiPin[] = [];
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    for (const item of items) {
      const titleMatch =
        item.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/) ??
        item.match(/<title>([^<]+)<\/title>/);
      if (!titleMatch) continue;
      const title = titleMatch[1].trim();
      if (
        title.toLowerCase().includes("no tsunami") ||
        title.toLowerCase().includes("cancel")
      )
        continue;
      const latMatch = item.match(/([\-\d.]+)\s*[\u00b0\s]?[NS]/);
      const lngMatch = item.match(/([\-\d.]+)\s*[\u00b0\s]?[EW]/);
      const lat = latMatch ? Number.parseFloat(latMatch[1]) : 0;
      const lng = lngMatch ? Number.parseFloat(lngMatch[1]) : 0;
      pins.push({
        id: `tsunami-${Date.now()}-${pins.length}`,
        lat: lat || 20,
        lng: lng || -155,
        region: title,
        severity: "Warning",
        title: `\ud83c\udf0a Tsunami Alert: ${title}`,
        isTsunami: true,
      });
    }
    return pins;
  } catch {
    return [];
  }
}

// ── Meteor Showers (static annual calendar) ────────────────────────────────────
const METEOR_SHOWERS: Array<{
  name: string;
  peakDate: string;
  lat: number;
  lng: number;
  zhr: number;
  peakMonth: number;
  peakDay: number;
}> = [
  {
    name: "Quadrantids",
    peakDate: "Jan 3-4",
    lat: 49.7,
    lng: 0,
    zhr: 120,
    peakMonth: 1,
    peakDay: 4,
  },
  {
    name: "Lyrids",
    peakDate: "Apr 22-23",
    lat: 33.3,
    lng: 0,
    zhr: 20,
    peakMonth: 4,
    peakDay: 22,
  },
  {
    name: "Eta Aquariids",
    peakDate: "May 6-7",
    lat: -1.4,
    lng: 0,
    zhr: 60,
    peakMonth: 5,
    peakDay: 6,
  },
  {
    name: "Delta Aquariids",
    peakDate: "Jul 28-29",
    lat: -16.4,
    lng: 0,
    zhr: 25,
    peakMonth: 7,
    peakDay: 28,
  },
  {
    name: "Perseids",
    peakDate: "Aug 11-13",
    lat: 58,
    lng: 48,
    zhr: 100,
    peakMonth: 8,
    peakDay: 12,
  },
  {
    name: "Draconids",
    peakDate: "Oct 8-9",
    lat: 54,
    lng: 130,
    zhr: 15,
    peakMonth: 10,
    peakDay: 8,
  },
  {
    name: "Orionids",
    peakDate: "Oct 21-22",
    lat: 15.5,
    lng: 95.2,
    zhr: 25,
    peakMonth: 10,
    peakDay: 21,
  },
  {
    name: "Leonids",
    peakDate: "Nov 17-18",
    lat: 21.6,
    lng: 152.1,
    zhr: 20,
    peakMonth: 11,
    peakDay: 17,
  },
  {
    name: "Geminids",
    peakDate: "Dec 13-14",
    lat: 32.5,
    lng: 112,
    zhr: 150,
    peakMonth: 12,
    peakDay: 13,
  },
  {
    name: "Ursids",
    peakDate: "Dec 22-23",
    lat: 74,
    lng: 100,
    zhr: 15,
    peakMonth: 12,
    peakDay: 22,
  },
];

export function getMeteorShowerPins(): MeteorShowerPin[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return METEOR_SHOWERS.map((s) => {
    const daysUntilPeak = s.peakMonth === month ? s.peakDay - day : 0;
    const isActive = Math.abs(daysUntilPeak) <= 3;
    return {
      id: `meteor-${s.name}`,
      lat: s.lat,
      lng: s.lng,
      name: s.name,
      peakDate: s.peakDate,
      zhr: s.zhr,
      title: `\u2604 ${s.name} Meteor Shower \u2014 Peak: ${s.peakDate} \u2014 Up to ${s.zhr} meteors/hr${isActive ? " \ud83d\udd34 ACTIVE NOW" : ""}`,
      isMeteor: true,
    };
  });
}

// ── Moon Phase (pure math, no API) ─────────────────────────────────────────────
export function getMoonPhase(): MoonPhaseInfo {
  const now = new Date();
  const knownNewMoon = new Date(2000, 0, 6);
  const synodicMonth = 29.53058867;
  const daysSince =
    (now.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const phase = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = Math.round(
    ((1 - Math.cos((phase / synodicMonth) * 2 * Math.PI)) / 2) * 100,
  );
  let phaseName: string;
  let icon: string;
  if (phase < 1.85) {
    phaseName = "New Moon";
    icon = "\ud83c\udf11";
  } else if (phase < 7.38) {
    phaseName = "Waxing Crescent";
    icon = "\ud83c\udf12";
  } else if (phase < 9.22) {
    phaseName = "First Quarter";
    icon = "\ud83c\udf13";
  } else if (phase < 14.77) {
    phaseName = "Waxing Gibbous";
    icon = "\ud83c\udf14";
  } else if (phase < 16.61) {
    phaseName = "Full Moon";
    icon = "\ud83c\udf15";
  } else if (phase < 22.15) {
    phaseName = "Waning Gibbous";
    icon = "\ud83c\udf16";
  } else if (phase < 23.99) {
    phaseName = "Last Quarter";
    icon = "\ud83c\udf17";
  } else {
    phaseName = "Waning Crescent";
    icon = "\ud83c\udf18";
  }
  const daysToFull =
    phase < 14.77 ? 14.77 - phase : synodicMonth - phase + 14.77;
  const daysToNew = phase > 1 ? synodicMonth - phase : synodicMonth / 2 - phase;
  const nextFull = new Date(now.getTime() + daysToFull * 24 * 60 * 60 * 1000);
  const nextNew = new Date(now.getTime() + daysToNew * 24 * 60 * 60 * 1000);
  return {
    phase: phaseName,
    illumination,
    icon,
    nextFull: nextFull.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    nextNew: nextNew.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  };
}

// ── Master hook ────────────────────────────────────────────────────────────────
export interface FilterLayerData {
  weatherPins: WeatherPin[];
  wildfirePins: WildfirePin[];
  cyclonePins: CyclonePin[];
  flightPins: FlightPin[];
  airQualityPins: AirQualityPin[];
  tsunamiPins: TsunamiPin[];
  meteorPins: MeteorShowerPin[];
  moonPhase: MoonPhaseInfo | null;
  loadingLayers: Set<FilterLayerId>;
}

export function useGlobeFilters(
  activeLayers: Set<FilterLayerId>,
): FilterLayerData {
  const [weatherPins, setWeatherPins] = useState<WeatherPin[]>([]);
  const [wildfirePins, setWildfirePins] = useState<WildfirePin[]>([]);
  const [cyclonePins, setCyclonePins] = useState<CyclonePin[]>([]);
  const [flightPins, setFlightPins] = useState<FlightPin[]>([]);
  const [airQualityPins, setAirQualityPins] = useState<AirQualityPin[]>([]);
  const [tsunamiPins, setTsunamiPins] = useState<TsunamiPin[]>([]);
  const [meteorPins, setMeteorPins] = useState<MeteorShowerPin[]>([]);
  const [moonPhase, setMoonPhase] = useState<MoonPhaseInfo | null>(null);
  const [loadingLayers, setLoadingLayers] = useState<Set<FilterLayerId>>(
    new Set(),
  );

  const setLoading = useCallback((id: FilterLayerId, loading: boolean) => {
    setLoadingLayers((prev) => {
      const next = new Set(prev);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const hasWeather = activeLayers.has("weather");
  const hasWildfires = activeLayers.has("wildfires");
  const hasCyclones = activeLayers.has("cyclones");
  const hasFlights = activeLayers.has("flights");
  const hasAirQuality = activeLayers.has("airquality");
  const hasMoonPhase = activeLayers.has("moonphase");
  const hasTsunamis = activeLayers.has("tsunamis");
  const hasMeteors = activeLayers.has("meteors");

  // Weather
  useEffect(() => {
    if (!hasWeather) {
      setWeatherPins([]);
      return;
    }
    let cancelled = false;
    setLoading("weather", true);
    fetchWeatherPins()
      .then((pins) => {
        if (!cancelled) setWeatherPins(pins);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading("weather", false);
      });
    const t = setInterval(
      () => {
        fetchWeatherPins()
          .then((pins) => {
            if (!cancelled) setWeatherPins(pins);
          })
          .catch(() => {});
      },
      15 * 60 * 1000,
    );
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [hasWeather, setLoading]);

  // Wildfires
  useEffect(() => {
    if (!hasWildfires) {
      setWildfirePins([]);
      return;
    }
    let cancelled = false;
    setLoading("wildfires", true);
    fetchWildfirePins()
      .then((pins) => {
        if (!cancelled) setWildfirePins(pins);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading("wildfires", false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasWildfires, setLoading]);

  // Cyclones
  useEffect(() => {
    if (!hasCyclones) {
      setCyclonePins([]);
      return;
    }
    let cancelled = false;
    setLoading("cyclones", true);
    fetchCyclonePins()
      .then((pins) => {
        if (!cancelled) setCyclonePins(pins);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading("cyclones", false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasCyclones, setLoading]);

  // Flights
  useEffect(() => {
    if (!hasFlights) {
      setFlightPins([]);
      return;
    }
    let cancelled = false;
    setLoading("flights", true);
    fetchFlightPins()
      .then((pins) => {
        if (!cancelled) setFlightPins(pins);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading("flights", false);
      });
    const t = setInterval(() => {
      fetchFlightPins()
        .then((pins) => {
          if (!cancelled) setFlightPins(pins);
        })
        .catch(() => {});
    }, 30 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [hasFlights, setLoading]);

  // Air Quality
  useEffect(() => {
    if (!hasAirQuality) {
      setAirQualityPins([]);
      return;
    }
    let cancelled = false;
    setLoading("airquality", true);
    fetchAirQualityPins()
      .then((pins) => {
        if (!cancelled) setAirQualityPins(pins);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading("airquality", false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasAirQuality, setLoading]);

  // Moon Phase (client-side, instant)
  useEffect(() => {
    if (!hasMoonPhase) {
      setMoonPhase(null);
      return;
    }
    setMoonPhase(getMoonPhase());
  }, [hasMoonPhase]);

  // Tsunamis
  useEffect(() => {
    if (!hasTsunamis) {
      setTsunamiPins([]);
      return;
    }
    let cancelled = false;
    setLoading("tsunamis", true);
    fetchTsunamiPins()
      .then((pins) => {
        if (!cancelled) setTsunamiPins(pins);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading("tsunamis", false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasTsunamis, setLoading]);

  // Meteor Showers
  useEffect(() => {
    if (!hasMeteors) {
      setMeteorPins([]);
      return;
    }
    setMeteorPins(getMeteorShowerPins());
  }, [hasMeteors]);

  return {
    weatherPins,
    wildfirePins,
    cyclonePins,
    flightPins,
    airQualityPins,
    tsunamiPins,
    meteorPins,
    moonPhase,
    loadingLayers,
  };
}
