import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import type { NewsItem } from "../types";
import type { EarthquakeItem, ISSItem, VolcanoItem } from "../types";

export type PinItem = NewsItem | EarthquakeItem | ISSItem | VolcanoItem;

export function isEarthquake(item: PinItem): item is EarthquakeItem {
  return (item as EarthquakeItem).isEarthquake === true;
}

export function isISS(item: PinItem): item is ISSItem {
  return (item as ISSItem).isISS === true;
}

export function isVolcano(item: PinItem): item is VolcanoItem {
  return (item as VolcanoItem).isVolcano === true;
}

export function latLngToVector3(
  lat: number,
  lng: number,
  radius = 2.05,
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function earthquakeStyle(mag: number): { color: string; size: number } {
  if (mag >= 7) return { color: "#CC0000", size: 0.12 };
  if (mag >= 5.5) return { color: "#FF3300", size: 0.09 };
  if (mag >= 4) return { color: "#FF6600", size: 0.065 };
  if (mag >= 2.5) return { color: "#FFA500", size: 0.045 };
  return { color: "#FFD700", size: 0.03 };
}

// The reference distance at which pin geometry was designed (world units)
const REFERENCE_DIST = 5;

interface NewsPinProps {
  item: PinItem;
  onClick: (item: PinItem) => void;
  onHover?: (item: PinItem | null) => void;
}

export function NewsPin({ item, onClick, onHover }: NewsPinProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  // Reactive camera distance for label sizing
  const camDistRef = useRef(REFERENCE_DIST);

  const quake = isEarthquake(item);
  const iss = isISS(item);
  const volcano = isVolcano(item);
  const pos = latLngToVector3(item.lat, item.lng);

  let color: string;
  let baseSize: number;

  if (iss) {
    color = "#00FFFF";
    baseSize = 0.04;
  } else if (volcano) {
    const statusColor =
      item.status === "Erupting"
        ? "#FF4500"
        : item.status === "Unrest"
          ? "#FF6AC1"
          : "#FF8C69";
    color = statusColor;
    baseSize = 0.03;
  } else if (quake) {
    const style = earthquakeStyle(item.magnitude);
    color = style.color;
    baseSize = style.size;
  } else {
    color = "#FF3B3B";
    baseSize = 0.025;
  }

  useFrame(() => {
    const dist = camera.position.length();
    camDistRef.current = dist;

    if (!groupRef.current) return;
    const distScale = dist / REFERENCE_DIST;
    const clamped = Math.max(0.4, Math.min(2.0, distScale));
    const hoverBoost = hovered ? 1.8 : 1;
    groupRef.current.scale.setScalar(clamped * hoverBoost);
  });

  let labelContent: string;
  if (iss) {
    labelContent = `\u{1F6F0}\uFE0F ISS — Alt: ${item.altitude}km`;
  } else if (volcano) {
    labelContent = `\uD83C\uDF0B ${item.name} — ${item.status}`;
  } else if (quake) {
    labelContent = `M${item.magnitude.toFixed(1)} \u2014 ${
      item.place.length > 40 ? `${item.place.slice(0, 40)}\u2026` : item.place
    }`;
  } else {
    labelContent =
      item.title.length > 50 ? `${item.title.slice(0, 50)}\u2026` : item.title;
  }

  // For news pins: build a richer hover card content
  const isNews = !iss && !volcano && !quake;
  const newsItem = isNews ? (item as NewsItem) : null;

  const tooltipBg = iss
    ? "rgba(0,220,255,0.92)"
    : volcano
      ? "rgba(255,69,0,0.92)"
      : quake
        ? `${color}ee`
        : "rgba(15,23,42,0.96)";

  return (
    <group position={pos.toArray()}>
      {/* Scaled group — pin geometry only */}
      <group ref={groupRef}>
        {/* Outer glow ring */}
        <mesh renderOrder={2}>
          <sphereGeometry args={[baseSize * 1.6, 10, 10]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? 0.4 : iss ? 0.35 : 0.22}
            depthWrite={false}
          />
        </mesh>

        {/* Pin sphere */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: R3F mesh */}
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onClick(item);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
            if (onHover) onHover(item);
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "default";
            if (onHover) onHover(null);
          }}
          renderOrder={3}
        >
          <sphereGeometry args={[baseSize, 10, 10]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* Extra glow pulse for ISS */}
        {iss && (
          <mesh renderOrder={1}>
            <sphereGeometry args={[baseSize * 2.5, 8, 8]} />
            <meshBasicMaterial
              color="#00FFFF"
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>

      {hovered && (
        <Html
          center
          distanceFactor={10}
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
          position={[0, baseSize * 10, 0]}
          zIndexRange={[100, 200]}
        >
          {newsItem ? (
            <NewsHoverCard item={newsItem} camDistRef={camDistRef} />
          ) : (
            <LabelContent
              text={labelContent}
              bg={tooltipBg}
              camDistRef={camDistRef}
            />
          )}
        </Html>
      )}
    </group>
  );
}

// Rich hover card for news pins
function NewsHoverCard({
  item,
  camDistRef,
}: {
  item: NewsItem;
  camDistRef: React.MutableRefObject<number>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (!cardRef.current) return;
    const dist = camDistRef.current;
    // Scale card proportionally with camera distance to stay readable
    const scale = Math.max(0.7, Math.min(1.4, dist / 5));
    cardRef.current.style.transform = `scale(${scale})`;
    cardRef.current.style.transformOrigin = "bottom center";
  });

  const truncatedTitle =
    item.title.length > 80 ? `${item.title.slice(0, 80)}…` : item.title;
  const truncatedDesc =
    item.description && item.description.length > 120
      ? `${item.description.slice(0, 120)}…`
      : item.description;

  function relativeTime(iso: string): string {
    try {
      const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      return `${Math.floor(mins / 60)}h ago`;
    } catch {
      return "";
    }
  }

  return (
    <div
      ref={cardRef}
      style={{
        background: "rgba(10,13,22,0.97)",
        border: "1px solid rgba(255,59,59,0.4)",
        borderRadius: "10px",
        padding: "12px 14px",
        maxWidth: "260px",
        minWidth: "180px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,59,59,0.1)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        transformOrigin: "bottom center",
      }}
    >
      {/* Source + time row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px",
          gap: "8px",
        }}
      >
        <span
          style={{
            background: "rgba(255,59,59,0.18)",
            color: "#FF3B3B",
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "2px 7px",
            borderRadius: "4px",
            border: "1px solid rgba(255,59,59,0.3)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {item.source}
        </span>
        <span
          style={{
            color: "#3A4560",
            fontSize: "9px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {relativeTime(item.publishedAt)}
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          color: "#E9EEF7",
          fontSize: "11px",
          fontWeight: 700,
          lineHeight: 1.4,
          marginBottom: truncatedDesc ? "6px" : 0,
          whiteSpace: "normal",
        }}
      >
        {truncatedTitle}
      </div>

      {/* Description if available */}
      {truncatedDesc && (
        <div
          style={{
            color: "#7A8BA7",
            fontSize: "9.5px",
            lineHeight: 1.5,
            whiteSpace: "normal",
          }}
        >
          {truncatedDesc}
        </div>
      )}

      {/* Click hint */}
      <div
        style={{
          marginTop: "8px",
          color: "#3A4560",
          fontSize: "8.5px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Click pin to open story
      </div>
    </div>
  );
}

// Simple label for non-news pins (earthquakes, volcanoes, ISS)
function LabelContent({
  text,
  bg,
  camDistRef,
}: {
  text: string;
  bg: string;
  camDistRef: React.MutableRefObject<number>;
}) {
  const labelRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (!labelRef.current) return;
    const dist = camDistRef.current;
    const compensatedPx = Math.round(11 * (dist / 10));
    const clamped = Math.max(8, Math.min(28, compensatedPx));
    labelRef.current.style.fontSize = `${clamped}px`;
  });

  return (
    <div
      ref={labelRef}
      style={{
        background: bg,
        color: "#fff",
        padding: "4px 9px",
        borderRadius: "5px",
        fontSize: "11px",
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        maxWidth: "220px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      {text}
    </div>
  );
}
