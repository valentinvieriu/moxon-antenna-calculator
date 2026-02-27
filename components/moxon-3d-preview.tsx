"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { MoxonResults } from "@/lib/moxon-calculator";
import {
  buildFrameGeometry,
  DEFAULT_PRINT_CONFIG,
  type PrintConfig,
} from "@/lib/moxon-stl-generator";

interface Moxon3DPreviewProps {
  results: MoxonResults | null;
  wireDiameterMm: number;
}

const COLORS: Record<string, string> = {
  driver: "#4ecdc4",
  reflector: "#e6a740",
  boom: "#6b7280",
  corner: "#9ca3af",
  bridge: "#7c8a99",
  endcap: "#b0b8c4",
};

function FrameMesh({
  results,
  wireDiameterMm,
}: {
  results: MoxonResults;
  wireDiameterMm: number;
}) {
  const dims = results.converted.mm;
  const cfg: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    wireDiameterMm,
  };

  const geometry = useMemo(
    () => buildFrameGeometry(dims, cfg),
    [dims.a, dims.b, dims.c, dims.d, dims.e, wireDiameterMm]
  );

  // Scale so the antenna fits nicely in view (~5 units across)
  const maxDim = Math.max(dims.a, dims.e + cfg.mountingTailLength);
  const scale = 5 / maxDim;

  return (
    <group scale={[scale, scale, scale]}>
      {geometry.boxes.map((box, i) => (
        <mesh key={`${box.type}-${i}`} position={box.pos}>
          <boxGeometry args={box.size} />
          <meshStandardMaterial
            color={COLORS[box.type] ?? "#888"}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      ))}

    </group>
  );
}

export default function Moxon3DPreview({
  results,
  wireDiameterMm,
}: Moxon3DPreviewProps) {
  return (
    <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-diagram-bg border border-border">
      <Canvas
        camera={{
          position: [0, 8, 5],
          fov: 35,
          near: 0.01,
          far: 1000,
        }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />

        {results && <FrameMesh results={results} wireDiameterMm={wireDiameterMm} />}

        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          minDistance={1}
          maxDistance={20}
          enablePan
          touches={{
            ONE: 0, // ROTATE
            TWO: 2, // DOLLY
          }}
        />

        <gridHelper args={[10, 20, "#334155", "#1e293b"]} />
      </Canvas>
      {!results && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          Enter valid parameters to preview
        </div>
      )}
    </div>
  );
}
