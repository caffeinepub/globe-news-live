import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import type { NewsItem } from "../backend.d";
import type { EarthquakeItem } from "../types";

type PinItem = NewsItem | EarthquakeItem;

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
}

export function NewsPin({ item, onClick }: NewsPinProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  // Reactive camera distance for label sizing
  const camDistRef = useRef(REFERENCE_DIST);

  const quake = isEarthquake(item);
  const pos = latLngToVector3(item.lat, item.lng);

  let color: string;
  let baseSize: number;

  if (quake) {
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
    // Scale pin geometry so it stays the same WORLD size relative to the globe
    // but doesn't get distorted by camera distance. We want the sphere to always
    // appear roughly the same screen size regardless of zoom.
    const distScale = dist / REFERENCE_DIST;
    const clamped = Math.max(0.4, Math.min(2.0, distScale));
    const hoverBoost = hovered ? 1.8 : 1;
    groupRef.current.scale.setScalar(clamped * hoverBoost);
  });

  let labelContent: string;
  if (quake) {
    labelContent = `M${item.magnitude.toFixed(1)} \u2014 ${
      item.place.length > 40 ? `${item.place.slice(0, 40)}\u2026` : item.place
    }`;
  } else {
    labelContent =
      item.title.length > 50 ? `${item.title.slice(0, 50)}\u2026` : item.title;
  }

  const tooltipBg = quake ? `${color}ee` : "rgba(255,59,59,0.92)";

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
            opacity={hovered ? 0.4 : 0.22}
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
      </group>

      {/*
        Hover label:
        - distanceFactor={10} makes R3F scale the HTML down as camera is far,
          which we deliberately UNDO with an inline font-size that scales up
          proportionally, resulting in constant apparent text size on screen.
        - We compute compensation so: apparentSize = htmlSize / (dist / 10)
          => we set fontSize = BASE_PX * (dist / 10) so they cancel out.
      */}
      {hovered && (
        <Html
          center
          distanceFactor={10}
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
          position={[0, baseSize * 10, 0]}
          zIndexRange={[100, 200]}
        >
          <LabelContent
            text={labelContent}
            bg={tooltipBg}
            camDistRef={camDistRef}
          />
        </Html>
      )}
    </group>
  );
}

// Separate component so it can read camDistRef reactively via its own frame loop
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

  // Adjust font size every frame so apparent size stays constant at ~11px
  // distanceFactor=10 means Three scales the Html element by factor (10 / dist),
  // so to compensate we multiply our desired px by (dist / 10).
  useFrame(() => {
    if (!labelRef.current) return;
    const dist = camDistRef.current;
    // Target apparent size: 11px at any zoom level
    const compensatedPx = Math.round(11 * (dist / 10));
    // Clamp so it doesn't get too tiny or huge during transitions
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
