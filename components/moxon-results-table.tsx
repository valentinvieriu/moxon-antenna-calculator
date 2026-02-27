"use client";

import type { MoxonResults, OutputUnit } from "@/lib/moxon-calculator";
import { formatDimension, unitLabels } from "@/lib/moxon-calculator";
import { generateMoxonStl, downloadStl, DEFAULT_PRINT_CONFIG } from "@/lib/moxon-stl-generator";
import { Button } from "@/components/ui/button";
import { Scissors, Download } from "lucide-react";

interface MoxonResultsTableProps {
  results: MoxonResults;
  displayUnit: OutputUnit;
  frequencyMHz: number;
  wireDiameterMm: number;
}

export function MoxonResultsTable({ results, displayUnit, frequencyMHz, wireDiameterMm }: MoxonResultsTableProps) {
  const handleDownloadStl = () => {
    const cfg = { ...DEFAULT_PRINT_CONFIG, wireDiameterMm };
    const blob = generateMoxonStl(results.converted.mm, cfg);
    downloadStl(blob, frequencyMHz);
  };

  const data = results.converted[displayUnit];
  const decimals = displayUnit === "wl" ? 4 : displayUnit === "mm" ? 1 : 2;

  const dimensions = [
    {
      label: "A",
      description: "Overall width",
      value: data.a,
      color: "text-foreground",
    },
    {
      label: "B",
      description: "Driver tail length",
      value: data.b,
      color: "text-driver",
    },
    {
      label: "C",
      description: "Gap between tips",
      value: data.c,
      color: "text-muted-foreground",
    },
    {
      label: "D",
      description: "Reflector tail length",
      value: data.d,
      color: "text-reflector",
    },
    {
      label: "E",
      description: "Total depth (B+C+D)",
      value: data.e,
      color: "text-primary",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Geometry Dimensions */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Dimensions in {unitLabels[displayUnit]}
        </h3>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dim</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dim, index) => (
                <tr
                  key={dim.label}
                  className={index !== dimensions.length - 1 ? "border-b border-border" : ""}
                >
                  <td className={`px-4 py-3 font-mono font-semibold ${dim.color}`}>
                    {dim.label}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{dim.description}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                    {formatDimension(dim.value, decimals)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cut Lengths */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Wire Cut Lengths
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Driven Element</span>
            <span className="text-lg font-mono font-semibold tabular-nums text-driver">
              {formatDimension(data.drivenCutLength, decimals)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {"A + 2\u00D7B"}
            </span>
          </div>
          <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Reflector</span>
            <span className="text-lg font-mono font-semibold tabular-nums text-reflector">
              {formatDimension(data.reflectorCutLength, decimals)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {"A + 2\u00D7D"}
            </span>
          </div>
        </div>
        {results.velocityFactor < 1 && (
          <p className="text-xs text-accent">
            Lengths include {((1 - results.velocityFactor) * 100).toFixed(1)}% total correction for
            {" "}{results.wireMaterial === "stainless" ? "stainless steel" : "copper"}
            {results.isSleeved ? " sleeved wire" : " bare wire"}.
          </p>
        )}
      </div>

      {/* Download STL */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          3D-Printable Frame
        </h3>
        <Button
          onClick={handleDownloadStl}
          className="w-full gap-2"
          variant="outline"
        >
          <Download className="w-4 h-4" />
          Download STL
        </Button>
        <p className="text-xs text-muted-foreground">
          Channel: {wireDiameterMm.toFixed(1)} mm wire + {DEFAULT_PRINT_CONFIG.tolerance} mm tolerance,
          {" "}{DEFAULT_PRINT_CONFIG.wallThickness} mm walls, {DEFAULT_PRINT_CONFIG.floorThickness} mm floor.
          Chamfered corners, end caps, side bridges, {DEFAULT_PRINT_CONFIG.mountingTailLength} mm tail
          with {DEFAULT_PRINT_CONFIG.mountingHoleDiameter} mm zip-tie hole. Ready for slicers (mm units).
        </p>
      </div>
    </div>
  );
}
