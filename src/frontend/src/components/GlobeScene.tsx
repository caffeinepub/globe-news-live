import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import type { NewsItem } from "../backend.d";
import type { EarthquakeItem, StreamItem } from "../types";
import { NewsPin } from "./NewsPin";

type PinItem = NewsItem | StreamItem | EarthquakeItem;

const EARTH_TEXTURE =
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg";
const EARTH_BUMP =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";
const EARTH_CLOUDS =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-clouds.png";

// ── Error Boundary ────────────────────────────────────────────────────────
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

// ── Loading placeholder ──────────────────────────────────────────────────────
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

// ── Earth Core with textures ────────────────────────────────────────────────
function EarthCore() {
  const textures = useTexture([EARTH_TEXTURE, EARTH_BUMP]);
  const dayMap = textures[0] as THREE.Texture;
  const bumpMap = textures[1] as THREE.Texture;

  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshPhongMaterial
        map={dayMap}
        bumpMap={bumpMap}
        bumpScale={0.05}
        specular={new THREE.Color(0x333333)}
        shininess={12}
      />
    </mesh>
  );
}

// ── Fallback Earth ────────────────────────────────────────────────────────
function EarthFallback() {
  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshPhongMaterial color="#1a3a5c" />
    </mesh>
  );
}

// ── Cloud layer ────────────────────────────────────────────────────────────
function CloudLayer() {
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [cloudsMap] = useTexture([EARTH_CLOUDS]);

  useFrame(() => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.00008;
  });

  return (
    <mesh ref={cloudsRef} renderOrder={2}>
      <sphereGeometry args={[2.03, 48, 48]} />
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

// ── Complete Earth mesh ───────────────────────────────────────────────────
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

interface GlobeContentProps {
  newsItems: NewsItem[];
  streams: StreamItem[];
  earthquakes: EarthquakeItem[];
  onPinClick: (item: PinItem) => void;
}

function GlobeContent({
  newsItems,
  streams,
  earthquakes,
  onPinClick,
}: GlobeContentProps) {
  const { gl } = useThree();
  const controlsRef = useRef<any>(null);

  const handleStart = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
  }, []);

  const handleEnd = useCallback(() => {
    const timer = setTimeout(() => {
      if (controlsRef.current) {
        controlsRef.current.autoRotate = true;
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Filter out pins at 0,0 (unknown location)
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

      {validNews.slice(0, 100).map((item) => (
        <NewsPin key={item.id} item={item} onClick={onPinClick} />
      ))}

      {streams.map((s) => (
        <NewsPin key={s.id} item={s} onClick={onPinClick} />
      ))}

      {earthquakes.map((eq) => (
        <NewsPin key={eq.id} item={eq} onClick={onPinClick} />
      ))}

      <OrbitControls
        ref={controlsRef}
        enableZoom
        minDistance={2.5}
        maxDistance={9}
        autoRotate
        autoRotateSpeed={0.3}
        enablePan={false}
        onStart={handleStart}
        onEnd={handleEnd}
        makeDefault
        domElement={gl.domElement}
      />
    </>
  );
}

interface GlobeSceneProps {
  newsItems: NewsItem[];
  streams: StreamItem[];
  earthquakes: EarthquakeItem[];
  onPinClick: (item: PinItem) => void;
}

export function GlobeScene({
  newsItems,
  streams,
  earthquakes,
  onPinClick,
}: GlobeSceneProps) {
  return (
    <GlobeErrorBoundary>
      <div
        id="globe-canvas"
        className="w-full h-full"
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
            streams={streams}
            earthquakes={earthquakes}
            onPinClick={onPinClick}
          />
        </Canvas>
      </div>
    </GlobeErrorBoundary>
  );
}
