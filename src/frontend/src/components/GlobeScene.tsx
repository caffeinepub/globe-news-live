import { Html, OrbitControls, Stars, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import type { NewsItem } from "../backend.d";
import type { EarthquakeItem } from "../types";
import { NewsPin } from "./NewsPin";

type PinItem = NewsItem | EarthquakeItem;

// Progressive texture LODs — swapped based on camera distance
// Far: 2K (fast load), Mid: 4K, Close: 8K-equivalent (sharpest)
const EARTH_TEXTURE_FAR =
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg";
const EARTH_TEXTURE_MID =
  "https://unpkg.com/three-globe/example/img/earth-day.jpg";
const EARTH_TEXTURE_CLOSE =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg";
const EARTH_BUMP =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";
const EARTH_CLOUDS =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-clouds.png";

const MIN_DISTANCE = 1.6; // allow zooming close enough to see country-level detail
const MAX_DISTANCE = 9;
const ZOOM_STEP = 0.6;
const ZOOM_LERP = 0.12;

// ── Error Boundary ─────────────────────────────────────────────────────────────
interface EBState {
  hasError: boolean;
  message: string;
}
class GlobeErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err: unknown): EBState {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
    };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="w-full flex flex-col items-center justify-center rounded-xl"
          style={{ height: "100%", background: "#070A0F", color: "#A9B3C7" }}
          data-ocid="globe.error_state"
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: "#1B2334", marginBottom: 12 }}
            role="img"
            aria-label="Globe unavailable"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            Globe unavailable
          </p>
          <p style={{ fontSize: "0.75rem", color: "#1B2334", marginTop: 4 }}>
            {this.state.message || "WebGL rendering failed"}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Loading placeholder ────────────────────────────────────────────────────────
function LoadingGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.004;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 24, 24]} />
      <meshBasicMaterial color="#1B3055" wireframe />
    </mesh>
  );
}

// Distance thresholds for texture LOD switching
const LOD_FAR_DIST = 5.5; // > 5.5 units away → 2K texture
const LOD_MID_DIST = 3.2; // 3.2–5.5 → 4K texture
// < 3.2 → 8K-equivalent texture (sharpest)

// ── Earth Core — progressively swaps to higher-res texture as user zooms in ──
function EarthCore() {
  // Load all three LOD textures + bump map in parallel
  const textures = useTexture([
    EARTH_TEXTURE_FAR,
    EARTH_TEXTURE_MID,
    EARTH_TEXTURE_CLOSE,
    EARTH_BUMP,
  ]);
  const texFar = textures[0] as THREE.Texture;
  const texMid = textures[1] as THREE.Texture;
  const texClose = textures[2] as THREE.Texture;
  const bumpMap = textures[3] as THREE.Texture;

  // Enable anisotropic filtering on all textures for crisper detail when
  // viewed at oblique angles (significant improvement when zoomed in)
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  const maxAniso = gl.capabilities.getMaxAnisotropy();
  const currentLodRef = useRef<"far" | "mid" | "close">("far");

  // Apply anisotropy once on mount
  useEffect(() => {
    for (const t of [texFar, texMid, texClose]) {
      t.anisotropy = maxAniso;
      t.needsUpdate = true;
    }
  }, [texFar, texMid, texClose, maxAniso]);

  useFrame(() => {
    if (!meshRef.current) return;
    const dist = camera.position.length();
    const mat = meshRef.current.material as THREE.MeshPhongMaterial;

    // Determine which LOD tier we are in
    let newLod: "far" | "mid" | "close";
    if (dist > LOD_FAR_DIST) {
      newLod = "far";
    } else if (dist > LOD_MID_DIST) {
      newLod = "mid";
    } else {
      newLod = "close";
    }

    // Only swap texture when crossing a LOD boundary
    if (newLod !== currentLodRef.current) {
      currentLodRef.current = newLod;
      mat.map =
        newLod === "far" ? texFar : newLod === "mid" ? texMid : texClose;
      mat.needsUpdate = true;
    }

    // Bump scale ramps from 0.05 at far to 0.22 at close for tactile terrain relief
    const t = Math.max(
      0,
      Math.min(1, (MAX_DISTANCE - dist) / (MAX_DISTANCE - MIN_DISTANCE)),
    );
    mat.bumpScale = 0.05 + t * 0.17;
  });

  return (
    <mesh ref={meshRef} renderOrder={1}>
      {/* 256 segments when close for smooth curvature at high zoom */}
      <sphereGeometry args={[2, 256, 256]} />
      <meshPhongMaterial
        map={texFar}
        bumpMap={bumpMap}
        bumpScale={0.05}
        specular={new THREE.Color(0x222244)}
        shininess={18}
      />
    </mesh>
  );
}

// ── Fallback Earth ─────────────────────────────────────────────────────────────
function EarthFallback() {
  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshPhongMaterial color="#1a3a5c" />
    </mesh>
  );
}

// ── Cloud layer ────────────────────────────────────────────────────────────────
function CloudLayer() {
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [cloudsMap] = useTexture([EARTH_CLOUDS]);
  useFrame(() => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.00008;
  });
  return (
    <mesh ref={cloudsRef} renderOrder={2}>
      <sphereGeometry args={[2.03, 64, 64]} />
      <meshPhongMaterial
        map={cloudsMap}
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </mesh>
  );
}

class CloudErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

class EarthErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <EarthFallback />;
    return this.props.children;
  }
}

// ── Complete Earth mesh ────────────────────────────────────────────────────────
function EarthMesh() {
  return (
    <>
      <EarthErrorBoundary>
        <Suspense fallback={<LoadingGlobe />}>
          <EarthCore />
        </Suspense>
      </EarthErrorBoundary>

      <CloudErrorBoundary>
        <Suspense fallback={null}>
          <CloudLayer />
        </Suspense>
      </CloudErrorBoundary>

      {/* Atmosphere glow */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[2.18, 48, 48]} />
        <meshBasicMaterial
          color={new THREE.Color(0x4da8ff)}
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh renderOrder={0}>
        <sphereGeometry args={[2.08, 48, 48]} />
        <meshBasicMaterial
          color={new THREE.Color(0x88ccff)}
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

// ── Inner canvas scene ─────────────────────────────────────────────────────────
interface GlobeContentProps {
  newsItems: NewsItem[];
  earthquakes: EarthquakeItem[];
  onPinClick: (item: PinItem) => void;
  zoomInRef: React.MutableRefObject<() => void>;
  zoomOutRef: React.MutableRefObject<() => void>;
}

function GlobeContent({
  newsItems,
  earthquakes,
  onPinClick,
  zoomInRef,
  zoomOutRef,
}: GlobeContentProps) {
  const { gl, camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetDistRef = useRef<number>(camera.position.length());

  // Smooth zoom animation
  useFrame(() => {
    const currentDist = camera.position.length();
    const target = targetDistRef.current;
    if (Math.abs(currentDist - target) > 0.001) {
      const newDist = currentDist + (target - currentDist) * ZOOM_LERP;
      camera.position.setLength(newDist);
      if (controlsRef.current) controlsRef.current.update();
    }
  });

  useEffect(() => {
    zoomInRef.current = () => {
      const cur = camera.position.length();
      targetDistRef.current = Math.max(MIN_DISTANCE, cur - ZOOM_STEP);
    };
    zoomOutRef.current = () => {
      const cur = camera.position.length();
      targetDistRef.current = Math.min(MAX_DISTANCE, cur + ZOOM_STEP);
    };
  });

  const handleStart = useCallback(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = false;
  }, []);

  const handleEnd = useCallback(() => {
    targetDistRef.current = camera.position.length();
    const timer = setTimeout(() => {
      if (controlsRef.current) controlsRef.current.autoRotate = true;
    }, 3500);
    return () => clearTimeout(timer);
  }, [camera]);

  const handleDoubleClick = useCallback(() => {
    targetDistRef.current = Math.max(
      MIN_DISTANCE,
      targetDistRef.current - ZOOM_STEP * 1.5,
    );
  }, []);

  const validNews = newsItems.filter(
    (a) => !(Math.abs(a.lat) < 0.01 && Math.abs(a.lng) < 0.01),
  );

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 3, 5]} intensity={1.1} color="#ffffff" />
      <directionalLight
        position={[-5, -2, -3]}
        intensity={0.12}
        color="#2244ff"
      />

      <Stars radius={300} depth={60} count={2000} factor={5} fade speed={0.4} />

      <EarthMesh />

      {validNews.slice(0, 300).map((item) => (
        <NewsPin key={item.id} item={item} onClick={onPinClick} />
      ))}

      {earthquakes.map((eq) => (
        <NewsPin key={eq.id} item={eq} onClick={onPinClick} />
      ))}

      {/* Invisible sphere to catch double-click */}
      <mesh visible={false} onDoubleClick={handleDoubleClick} renderOrder={-1}>
        <sphereGeometry args={[10, 8, 8]} />
        <meshBasicMaterial side={THREE.BackSide} />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        enableZoom
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        autoRotate
        autoRotateSpeed={0.3}
        enablePan={false}
        onStart={handleStart}
        onEnd={handleEnd}
        makeDefault
        domElement={gl.domElement}
        // Smoother scroll zoom
        zoomSpeed={0.6}
      />
    </>
  );
}

interface GlobeSceneProps {
  newsItems: NewsItem[];
  earthquakes: EarthquakeItem[];
  onPinClick: (item: PinItem) => void;
}

export function GlobeScene({
  newsItems,
  earthquakes,
  onPinClick,
}: GlobeSceneProps) {
  const zoomInRef = useRef<() => void>(() => {});
  const zoomOutRef = useRef<() => void>(() => {});

  return (
    <GlobeErrorBoundary>
      <div
        id="globe-canvas"
        className="w-full h-full relative"
        data-ocid="globe.canvas_target"
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: "#070A0F", width: "100%", height: "100%" }}
          dpr={[1, 2]}
        >
          <GlobeContent
            newsItems={newsItems}
            earthquakes={earthquakes}
            onPinClick={onPinClick}
            zoomInRef={zoomInRef}
            zoomOutRef={zoomOutRef}
          />
        </Canvas>

        {/* Zoom buttons */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            zIndex: 10,
          }}
        >
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomInRef.current()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(11,19,36,0.82)",
              border: "1px solid #1B2334",
              color: "#A9B3C7",
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(6px)",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,59,59,0.18)";
              (e.currentTarget as HTMLButtonElement).style.color = "#FF3B3B";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(11,19,36,0.82)";
              (e.currentTarget as HTMLButtonElement).style.color = "#A9B3C7";
            }}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomOutRef.current()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(11,19,36,0.82)",
              border: "1px solid #1B2334",
              color: "#A9B3C7",
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(6px)",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,59,59,0.18)";
              (e.currentTarget as HTMLButtonElement).style.color = "#FF3B3B";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(11,19,36,0.82)";
              (e.currentTarget as HTMLButtonElement).style.color = "#A9B3C7";
            }}
          >
            \u2212
          </button>
        </div>
      </div>
    </GlobeErrorBoundary>
  );
}
