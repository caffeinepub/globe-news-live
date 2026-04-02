import { Html } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
import type { NewsItem } from "../backend.d";
import type { EarthquakeItem, StreamItem } from "../types";

type PinItem = NewsItem | StreamItem | EarthquakeItem;

function isStream(item: PinItem): item is StreamItem {
  return (item as StreamItem).isStream === true;
}

export function isEarthquake(item: PinItem): item is EarthquakeItem {
  return (item as EarthquakeItem).isEarthquake === true;
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

/**
 * Returns color and size for earthquake pins based on magnitude:
 *  < 2.5  → small yellow dot
 *  2.5–4  → medium yellow-orange dot
 *  4–5.5  → medium-large orange dot
 *  5.5–7  → large red-orange dot
 *  >= 7   → very large deep red dot
 */
function earthquakeStyle(mag: number): { color: string; size: number } {
  if (mag >= 7) {
    return { color: "#CC0000", size: 0.12 };
  }
  if (mag >= 5.5) {
    return { color: "#FF3300", size: 0.09 };
  }
  if (mag >= 4) {
    return { color: "#FF6600", size: 0.065 };
  }
  if (mag >= 2.5) {
    return { color: "#FFA500", size: 0.045 };
  }
  return { color: "#FFD700", size: 0.03 };
}

interface NewsPinProps {
  item: PinItem;
  onClick: (item: PinItem) => void;
}

export function NewsPin({ item, onClick }: NewsPinProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const stream = isStream(item);
  const quake = isEarthquake(item);
  const pos = latLngToVector3(item.lat, item.lng);

  // Determine color and base size
  let color: string;
  let baseSize: number;

  if (quake) {
    const style = earthquakeStyle(item.magnitude);
    color = style.color;
    baseSize = style.size;
  } else if (stream) {
    color = "#2F7BFF";
    baseSize = 0.03;
  } else {
    color = "#FF3B3B";
    baseSize = 0.025;
  }

  const scale = hovered ? 2.0 : 1;

  // Hover label content
  let labelContent: string;
  if (quake) {
    labelContent = `M${item.magnitude.toFixed(1)} — ${
      item.place.length > 40 ? `${item.place.slice(0, 40)}…` : item.place
    }`;
  } else if (stream) {
    labelContent =
      item.title.length > 50 ? `${item.title.slice(0, 50)}…` : item.title;
  } else {
    labelContent =
      item.title.length > 50 ? `${item.title.slice(0, 50)}…` : item.title;
  }

  const tooltipBg = stream
    ? "rgba(47,123,255,0.92)"
    : quake
      ? `${color}ee`
      : "rgba(255,59,59,0.92)";

  return (
    <group position={pos.toArray()}>
      {/* Outer glow ring */}
      <mesh scale={[scale * 1.7, scale * 1.7, scale * 1.7]} renderOrder={2}>
        <sphereGeometry args={[baseSize * 1.6, 10, 10]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.4 : 0.22}
          depthWrite={false}
        />
      </mesh>

      {/* Pin sphere */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: R3F mesh */}
      <mesh
        ref={meshRef}
        scale={[scale, scale, scale]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(item);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        renderOrder={3}
      >
        <sphereGeometry args={[baseSize, 10, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Hover label */}
      {hovered && (
        <Html
          center
          distanceFactor={5}
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
          position={[0, 0.15, 0]}
          zIndexRange={[100, 200]}
        >
          <div
            style={{
              background: tooltipBg,
              color: "#fff",
              padding: "4px 9px",
              borderRadius: "5px",
              fontSize: "0.65rem",
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
            {labelContent}
          </div>
        </Html>
      )}
    </group>
  );
}
