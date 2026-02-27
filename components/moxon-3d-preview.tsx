"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Text } from "@react-three/drei";
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

      {/* Dimension labels */}
      <Text
        position={[0, -0.4 * scale, (dims.e / 2) * scale]}
        fontSize={0.15}
        color="#94a3b8"
        anchorX="center"
        anchorY="top"
        font="/fonts/GeistMono-Regular.ttf"
      >
        {`A = ${dims.a.toFixed(1)} mm`}
      </Text>
      <Text
        position={[(dims.a / 2) * scale + 0.3, -0.3 * scale, 0]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="left"
        anchorY="middle"
        font="/fonts/GeistMono-Regular.ttf"
      >
        {`E = ${dims.e.toFixed(1)} mm`}
      </Text>

      {/* Direction arrow label */}
      <Text
        position={[0, 0.2, (dims.e / 2 + 10) * scale]}
        fontSize={0.11}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Geist-Regular.ttf"
      >
        {"Direction of radiation \u2192"}
      </Text>
    </group>
  );
}

function EmptyState() {
  return (
    <Text
      position={[0, 0, 0]}
      fontSize={0.2}
      color="#64748b"
      anchorX="center"
      anchorY="middle"
      font="/fonts/Geist-Regular.ttf"
    >
      Enter valid parameters to preview
    </Text>
  );
}

export default function Moxon3DPreview({
  results,
  wireDiameterMm,
}: Moxon3DPreviewProps) {
  return (
    <div className="w-full h-[320px] rounded-xl overflow-hidden bg-diagram-bg border border-border">
      <Canvas
        camera={{
          position: [0, 8, 5],
          fov: 35,
          near: 0.01,
          far: 1000,
        }}
        gl={{ antialias: true }}
      >
        <Environment preset="studio" />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />

        {results ? (
          <FrameMesh results={results} wireDiameterMm={wireDiameterMm} />
        ) : (
          <EmptyState />
        )}

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
    </div>
  );
}
