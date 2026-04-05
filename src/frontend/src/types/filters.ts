// Globe overlay filter types
export type FilterLayerId =
  | "weather"
  | "wildfires"
  | "cyclones"
  | "flights"
  | "airquality"
  | "moonphase"
  | "tsunamis"
  | "meteors";

export interface FilterLayer {
  id: FilterLayerId;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const FILTER_LAYERS: FilterLayer[] = [
  {
    id: "weather",
    label: "Weather",
    description: "Live temp & conditions at major cities",
    icon: "\u26c5",
    color: "#38BDF8",
  },
  {
    id: "wildfires",
    label: "Wildfires",
    description: "Active fires (NASA FIRMS, last 24h)",
    icon: "\uD83D\uDD25",
    color: "#FF6600",
  },
  {
    id: "cyclones",
    label: "Cyclones",
    description: "Active tropical storms worldwide",
    icon: "\uD83C\uDF00",
    color: "#A855F7",
  },
  {
    id: "flights",
    label: "Live Flights",
    description: "Real-time aircraft positions (OpenSky)",
    icon: "\u2708\uFE0F",
    color: "#22D3EE",
  },
  {
    id: "airquality",
    label: "Air Quality",
    description: "AQI at major cities (OpenAQ)",
    icon: "\uD83C\uDF2B\uFE0F",
    color: "#FACC15",
  },
  {
    id: "moonphase",
    label: "Moon Phase",
    description: "Current lunar phase",
    icon: "\uD83C\uDF19",
    color: "#E2E8F0",
  },
  {
    id: "tsunamis",
    label: "Tsunami Alerts",
    description: "Active NOAA tsunami warnings",
    icon: "\uD83C\uDF0A",
    color: "#0EA5E9",
  },
  {
    id: "meteors",
    label: "Meteor Showers",
    description: "Active/upcoming meteor showers",
    icon: "\u2604\uFE0F",
    color: "#FDE68A",
  },
];

// Pin types for overlay data
export interface WeatherPin {
  id: string;
  lat: number;
  lng: number;
  city: string;
  temp: number; // Celsius
  condition: string;
  windSpeed: number; // km/h
  title: string;
  isWeather: true;
}

export interface WildfirePin {
  id: string;
  lat: number;
  lng: number;
  brightness: number;
  confidence: number;
  title: string;
  isWildfire: true;
}

export interface CyclonePin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category: string;
  windSpeed: number; // knots
  title: string;
  isCyclone: true;
}

export interface FlightPin {
  id: string;
  lat: number;
  lng: number;
  callsign: string;
  altitude: number; // m
  velocity: number; // m/s
  country: string;
  title: string;
  isFlight: true;
}

export interface AirQualityPin {
  id: string;
  lat: number;
  lng: number;
  city: string;
  aqi: number;
  category: string;
  title: string;
  isAirQuality: true;
}

export interface TsunamiPin {
  id: string;
  lat: number;
  lng: number;
  region: string;
  severity: string;
  title: string;
  isTsunami: true;
}

export interface MeteorShowerPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  peakDate: string;
  zhr: number; // Zenith Hourly Rate
  title: string;
  isMeteor: true;
}

export interface MoonPhaseInfo {
  phase: string; // e.g. "Waxing Crescent"
  illumination: number; // 0-100%
  icon: string;
  nextFull: string;
  nextNew: string;
}

export type OverlayPin =
  | WeatherPin
  | WildfirePin
  | CyclonePin
  | FlightPin
  | AirQualityPin
  | TsunamiPin
  | MeteorShowerPin;
