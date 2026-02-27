"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { MoxonDiagram } from "@/components/moxon-diagram";
import { MoxonInputForm } from "@/components/moxon-input-form";
import { MoxonResultsTable } from "@/components/moxon-results-table";
import { UnitSelector } from "@/components/unit-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateMoxon } from "@/lib/moxon-calculator";
import type { DiameterUnit, OutputUnit, WireMaterial } from "@/lib/moxon-calculator";
import { AlertCircle, Radio, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const Moxon3DPreview = dynamic(() => import("@/components/moxon-3d-preview"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] rounded-xl bg-diagram-bg border border-border flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading 3D preview...</p>
    </div>
  ),
});

export default function MoxonCalculator() {
  // Input state — defaults for EU868 Meshtastic with H07V-U 1.5mm2 wire (bare conductor = 1.38mm)
  const [frequency, setFrequency] = useState("869.525");
  const [wireDiameter, setWireDiameter] = useState("1.38");
  const [diameterUnit, setDiameterUnit] = useState<DiameterUnit>("mm");
  const [displayUnit, setDisplayUnit] = useState<OutputUnit>("mm");
  const [isSleeved, setIsSleeved] = useState(false);
  const [wireMaterial, setWireMaterial] = useState<WireMaterial>("copper");

  // Calculate results
  const results = useMemo(() => {
    const freq = parseFloat(frequency);
    const diam = parseFloat(wireDiameter);

    if (isNaN(freq) || isNaN(diam) || freq <= 0 || diam <= 0) {
      return null;
    }

    return calculateMoxon(freq, diam, diameterUnit, isSleeved, wireMaterial);
  }, [frequency, wireDiameter, diameterUnit, isSleeved, wireMaterial]);

  const isValid = results !== null;

  // Compute wire diameter in mm for the STL generator
  const wireDiameterMm = useMemo(() => {
    const diam = parseFloat(wireDiameter);
    if (isNaN(diam) || diam <= 0) return 1.38;
    switch (diameterUnit) {
      case "mm": return diam;
      case "in": return diam * 25.4;
      case "awg": return 0.005 * Math.pow(92, (36 - diam) / 39) * 25.4;
      case "wl": {
        const freq = parseFloat(frequency);
        if (isNaN(freq) || freq <= 0) return 1.38;
        return diam * (299792.5 / freq);
      }
      default: return diam;
    }
  }, [wireDiameter, diameterUnit, frequency]);

  const loadMeshtasticDefaults = () => {
    setFrequency("869.525");
    setWireDiameter("1.38");
    setDiameterUnit("mm");
    setIsSleeved(false);
    setWireMaterial("copper");
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-4 max-w-lg mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-primary/10">
                <Radio className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground font-sans">Moxon Calculator</h1>
                <p className="text-xs text-muted-foreground">Antenna Dimension Tool</p>
              </div>
            </div>
            <Button
              onClick={loadMeshtasticDefaults}
              variant="ghost"
              size="sm"
              title="Load Meshtastic EU868 defaults"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-6">
        {/* Input Section */}
        <section aria-labelledby="input-heading">
          <h2 id="input-heading" className="sr-only">
            Antenna Parameters
          </h2>
          <div className="bg-card rounded-xl border border-border p-4">
            <MoxonInputForm
              frequency={frequency}
              setFrequency={setFrequency}
              wireDiameter={wireDiameter}
              setWireDiameter={setWireDiameter}
              diameterUnit={diameterUnit}
              setDiameterUnit={setDiameterUnit}
              isSleeved={isSleeved}
              setIsSleeved={setIsSleeved}
              wireMaterial={wireMaterial}
              setWireMaterial={setWireMaterial}
            />
          </div>
        </section>

        {/* Warning Message */}
        {results?.dimensions.warning && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{results.dimensions.warning}</p>
          </div>
        )}

        {/* Diagram / 3D Preview Section */}
        <section aria-labelledby="diagram-heading">
          <Tabs defaultValue="2d" className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 id="diagram-heading" className="text-sm font-medium text-muted-foreground">
                Antenna Structure
              </h2>
              <TabsList className="h-8">
                <TabsTrigger value="2d" className="text-xs px-3 h-7">2D Diagram</TabsTrigger>
                <TabsTrigger value="3d" className="text-xs px-3 h-7">3D Preview</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="2d" className="mt-0">
              <MoxonDiagram results={results} displayUnit={displayUnit} />
            </TabsContent>
            <TabsContent value="3d" className="mt-0">
              <Moxon3DPreview results={results} wireDiameterMm={wireDiameterMm} />
            </TabsContent>
          </Tabs>
        </section>

        {/* Unit Selector */}
        <UnitSelector value={displayUnit} onChange={setDisplayUnit} />

        {/* Results Table */}
        {isValid && results && (
          <section aria-labelledby="results-heading">
            <h2 id="results-heading" className="sr-only">
              Calculated Dimensions
            </h2>
            <MoxonResultsTable
              results={results}
              displayUnit={displayUnit}
              frequencyMHz={parseFloat(frequency)}
              wireDiameterMm={wireDiameterMm}
            />
          </section>
        )}

        {/* Empty State */}
        {!isValid && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Enter valid frequency and wire diameter to calculate dimensions</p>
          </div>
        )}

        {/* Info Section */}
        <section className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-2">About Moxon Antennas</h3>
          <div className="text-xs text-muted-foreground flex flex-col gap-2">
            <p>
              The Moxon rectangle is a 2-element directional antenna with a driven element and a
              reflector. It offers good gain and front-to-back ratio in a compact design.
            </p>
            <ul className="list-disc list-inside flex flex-col gap-1">
              <li>
                <span className="text-foreground font-medium">A</span> — Overall width (corner to corner)
              </li>
              <li>
                <span className="text-driver font-medium">B</span> — Driver tail (bent toward reflector)
              </li>
              <li>
                <span className="text-muted-foreground font-medium">C</span> — Gap between element tips
              </li>
              <li>
                <span className="text-reflector font-medium">D</span> — Reflector tail (bent toward driver)
              </li>
              <li>
                <span className="text-primary font-medium">E</span> — Total depth (B + C + D)
              </li>
            </ul>
            <p className="pt-1 border-t border-border mt-1">
              Default: EU868 Meshtastic (869.525 MHz) with H07V-U 1.5 mm&#178; solid copper wire (bare conductor diameter 1.38 mm).
              Use Advanced wire settings for copper vs stainless and sleeved wire compensation.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Algorithm by L.B. Cebik, W4RNL
          </p>
        </footer>
      </div>
    </main>
  );
}
