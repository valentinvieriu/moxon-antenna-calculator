"use client";

import type { MoxonResults, OutputUnit } from "@/lib/moxon-calculator";
import { formatDimension } from "@/lib/moxon-calculator";

interface MoxonDiagramProps {
  results: MoxonResults | null;
  displayUnit: OutputUnit;
}

export function MoxonDiagram({ results, displayUnit }: MoxonDiagramProps) {
  // SVG dimensions and layout
  const svgWidth = 320;
  const svgHeight = 280;
  const padding = 40;

  // Antenna proportions (normalized to fit SVG)
  const antennaWidth = svgWidth - padding * 2;
  const maxDepth = svgHeight - padding * 2 - 40; // Leave room for labels

  // Calculate element positions based on actual proportions
  const getProportions = () => {
    if (!results) {
      return { aRatio: 0.7, bRatio: 0.15, cRatio: 0.15, dRatio: 0.15, eRatio: 0.4 };
    }
    const { a, b, c, d, e } = results.dimensions;
    return {
      aRatio: a / (a + e),
      bRatio: b / e,
      cRatio: c / e,
      dRatio: d / e,
      eRatio: e / a, // Real-world ratio: ~0.4 (antenna is 2.5x wider than deep)
    };
  };

  const proportions = getProportions();
  // Scale width to match real antenna proportions: make it about 2.5x wider than deep
  const totalDepth = Math.min(maxDepth, antennaWidth / 2.5);
  const elementWidth = antennaWidth * 0.85;

  // Calculate positions
  const centerX = svgWidth / 2;
  const driverY = padding + 30;
  const bHeight = totalDepth * proportions.bRatio;
  const cHeight = totalDepth * proportions.cRatio;
  const dHeight = totalDepth * proportions.dRatio;
  const reflectorY = driverY + bHeight + cHeight + dHeight;

  // Element half-widths
  const halfWidth = elementWidth / 2;

  // Get formatted values
  const getValue = (key: "a" | "b" | "c" | "d" | "e") => {
    if (!results) return "—";
    const val = results.converted[displayUnit][key];
    const decimals = displayUnit === "wl" ? 4 : displayUnit === "mm" ? 1 : 2;
    return formatDimension(val, decimals);
  };

  const getUnit = () => {
    switch (displayUnit) {
      case "wl":
        return "λ";
      case "ft":
        return "ft";
      case "in":
        return "in";
      case "m":
        return "m";
      case "mm":
        return "mm";
    }
  };

  return (
    <div className="w-full bg-[var(--diagram-bg)] rounded-lg p-4">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto max-h-[320px]"
        aria-label="Moxon antenna diagram showing dimensions A, B, C, D, and E"
      >
        {/* Driver element (top) */}
        <g className="driver">
          {/* Horizontal part */}
          <line
            x1={centerX - halfWidth}
            y1={driverY}
            x2={centerX + halfWidth}
            y2={driverY}
            stroke="var(--driver)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Left tail going down */}
          <line
            x1={centerX - halfWidth}
            y1={driverY}
            x2={centerX - halfWidth}
            y2={driverY + bHeight}
            stroke="var(--driver)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Right tail going down */}
          <line
            x1={centerX + halfWidth}
            y1={driverY}
            x2={centerX + halfWidth}
            y2={driverY + bHeight}
            stroke="var(--driver)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Feed point indicator */}
          <circle
            cx={centerX}
            cy={driverY}
            r="4"
            fill="var(--driver)"
            stroke="var(--foreground)"
            strokeWidth="1"
          />
          <text
            x={centerX}
            y={driverY - 12}
            textAnchor="middle"
            className="text-[10px] fill-muted-foreground font-sans"
          >
            Feed Point
          </text>
        </g>

        {/* Reflector element (bottom) */}
        <g className="reflector">
          {/* Horizontal part */}
          <line
            x1={centerX - halfWidth}
            y1={reflectorY}
            x2={centerX + halfWidth}
            y2={reflectorY}
            stroke="var(--reflector)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Left tail going up */}
          <line
            x1={centerX - halfWidth}
            y1={reflectorY}
            x2={centerX - halfWidth}
            y2={reflectorY - dHeight}
            stroke="var(--reflector)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Right tail going up */}
          <line
            x1={centerX + halfWidth}
            y1={reflectorY}
            x2={centerX + halfWidth}
            y2={reflectorY - dHeight}
            stroke="var(--reflector)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* Dimension labels */}
        {/* A - Width */}
        <g className="dimension-a">
          <line
            x1={centerX - halfWidth}
            y1={driverY - 6}
            x2={centerX + halfWidth}
            y2={driverY - 6}
            stroke="var(--dimension-label)"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <line
            x1={centerX - halfWidth}
            y1={driverY - 10}
            x2={centerX - halfWidth}
            y2={driverY - 2}
            stroke="var(--dimension-label)"
            strokeWidth="1"
          />
          <line
            x1={centerX + halfWidth}
            y1={driverY - 10}
            x2={centerX + halfWidth}
            y2={driverY - 2}
            stroke="var(--dimension-label)"
            strokeWidth="1"
          />
          <rect
            x={centerX - 32}
            y={driverY - 24}
            width="64"
            height="16"
            rx="2"
            fill="var(--card)"
            className="opacity-90"
          />
          <text
            x={centerX}
            y={driverY - 12}
            textAnchor="middle"
            className="text-[11px] fill-[var(--dimension-label)] font-mono font-medium"
          >
            A: {getValue("a")}
          </text>
        </g>

        {/* B - Driver tail */}
        <g className="dimension-b">
          <line
            x1={centerX + halfWidth + 8}
            y1={driverY}
            x2={centerX + halfWidth + 8}
            y2={driverY + bHeight}
            stroke="var(--driver)"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <rect
            x={centerX + halfWidth + 12}
            y={driverY + bHeight / 2 - 8}
            width="52"
            height="16"
            rx="2"
            fill="var(--card)"
            className="opacity-90"
          />
          <text
            x={centerX + halfWidth + 38}
            y={driverY + bHeight / 2 + 4}
            textAnchor="middle"
            className="text-[11px] fill-[var(--driver)] font-mono font-medium"
          >
            B: {getValue("b")}
          </text>
        </g>

        {/* C - Gap */}
        <g className="dimension-c">
          <line
            x1={centerX + halfWidth + 8}
            y1={driverY + bHeight}
            x2={centerX + halfWidth + 8}
            y2={reflectorY - dHeight}
            stroke="var(--foreground)"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.5"
          />
          <rect
            x={centerX + halfWidth + 12}
            y={driverY + bHeight + cHeight / 2 - 8}
            width="52"
            height="16"
            rx="2"
            fill="var(--card)"
            className="opacity-90"
          />
          <text
            x={centerX + halfWidth + 38}
            y={driverY + bHeight + cHeight / 2 + 4}
            textAnchor="middle"
            className="text-[11px] fill-foreground font-mono font-medium opacity-70"
          >
            C: {getValue("c")}
          </text>
        </g>

        {/* D - Reflector tail */}
        <g className="dimension-d">
          <line
            x1={centerX + halfWidth + 8}
            y1={reflectorY - dHeight}
            x2={centerX + halfWidth + 8}
            y2={reflectorY}
            stroke="var(--reflector)"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <rect
            x={centerX + halfWidth + 12}
            y={reflectorY - dHeight / 2 - 8}
            width="52"
            height="16"
            rx="2"
            fill="var(--card)"
            className="opacity-90"
          />
          <text
            x={centerX + halfWidth + 38}
            y={reflectorY - dHeight / 2 + 4}
            textAnchor="middle"
            className="text-[11px] fill-[var(--reflector)] font-mono font-medium"
          >
            D: {getValue("d")}
          </text>
        </g>

        {/* E - Total depth */}
        <g className="dimension-e">
          <line
            x1={centerX - halfWidth - 12}
            y1={driverY}
            x2={centerX - halfWidth - 12}
            y2={reflectorY}
            stroke="var(--primary)"
            strokeWidth="1"
            strokeDasharray="3,2"
          />
          <line
            x1={centerX - halfWidth - 16}
            y1={driverY}
            x2={centerX - halfWidth - 8}
            y2={driverY}
            stroke="var(--primary)"
            strokeWidth="1"
          />
          <line
            x1={centerX - halfWidth - 16}
            y1={reflectorY}
            x2={centerX - halfWidth - 8}
            y2={reflectorY}
            stroke="var(--primary)"
            strokeWidth="1"
          />
          <rect
            x={centerX - halfWidth - 60}
            y={(driverY + reflectorY) / 2 - 8}
            width="46"
            height="16"
            rx="2"
            fill="var(--card)"
            className="opacity-90"
          />
          <text
            x={centerX - halfWidth - 37}
            y={(driverY + reflectorY) / 2 + 4}
            textAnchor="middle"
            className="text-[11px] fill-primary font-mono font-medium"
          >
            E: {getValue("e")}
          </text>
        </g>

        {/* Legend */}
        <g className="legend" transform={`translate(${padding}, ${svgHeight - 28})`}>
          <rect x="0" y="0" width="8" height="8" rx="1" fill="var(--driver)" />
          <text x="12" y="8" className="text-[9px] fill-muted-foreground font-sans">
            Driver
          </text>
          <rect x="60" y="0" width="8" height="8" rx="1" fill="var(--reflector)" />
          <text x="72" y="8" className="text-[9px] fill-muted-foreground font-sans">
            Reflector
          </text>
          <text
            x={elementWidth}
            y="8"
            textAnchor="end"
            className="text-[9px] fill-muted-foreground font-mono"
          >
            Unit: {getUnit()}
          </text>
        </g>
      </svg>
    </div>
  );
}
