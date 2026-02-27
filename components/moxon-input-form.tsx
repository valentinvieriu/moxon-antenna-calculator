"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { DiameterUnit, WireMaterial } from "@/lib/moxon-calculator";
import { diameterUnitLabels, wireMaterialLabels } from "@/lib/moxon-calculator";

interface MoxonInputFormProps {
  frequency: string;
  setFrequency: (value: string) => void;
  wireDiameter: string;
  setWireDiameter: (value: string) => void;
  diameterUnit: DiameterUnit;
  setDiameterUnit: (value: DiameterUnit) => void;
  isSleeved: boolean;
  setIsSleeved: (value: boolean) => void;
  wireMaterial: WireMaterial;
  setWireMaterial: (value: WireMaterial) => void;
}

export function MoxonInputForm({
  frequency,
  setFrequency,
  wireDiameter,
  setWireDiameter,
  diameterUnit,
  setDiameterUnit,
  isSleeved,
  setIsSleeved,
  wireMaterial,
  setWireMaterial,
}: MoxonInputFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="frequency" className="text-sm font-medium text-foreground">
          Frequency (MHz)
        </Label>
        <Input
          id="frequency"
          type="number"
          inputMode="decimal"
          placeholder="e.g., 869.525"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="h-12 text-base bg-input border-border focus:border-primary"
          min="0"
          step="any"
        />
        <p className="text-xs text-muted-foreground">Center frequency for your antenna design</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="diameter" className="text-sm font-medium text-foreground">
          Wire Diameter (conductor only)
        </Label>
        <div className="flex gap-2">
          <Input
            id="diameter"
            type="number"
            inputMode="decimal"
            placeholder={diameterUnit === "awg" ? "e.g., 14" : "e.g., 1.38"}
            value={wireDiameter}
            onChange={(e) => setWireDiameter(e.target.value)}
            className="h-12 text-base flex-1 bg-input border-border focus:border-primary"
            min="0"
            step="any"
          />
          <Select value={diameterUnit} onValueChange={(v) => setDiameterUnit(v as DiameterUnit)}>
            <SelectTrigger className="w-[130px] h-12 bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(diameterUnitLabels) as DiameterUnit[]).map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {diameterUnitLabels[unit]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          {diameterUnit === "awg"
            ? "Enter AWG gauge number (e.g., 14 for 14 AWG)"
            : diameterUnit === "mm"
              ? "Enter the bare metal diameter, not the cross-section area"
              : "Enter the wire diameter in your selected unit"}
        </p>
      </div>

      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium text-foreground">Advanced wire settings</summary>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="wire-material" className="text-sm font-medium text-foreground">
              Conductor material
            </Label>
            <Select
              value={wireMaterial}
              onValueChange={(v) => setWireMaterial(v as WireMaterial)}
            >
              <SelectTrigger id="wire-material" className="h-12 bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(wireMaterialLabels) as WireMaterial[]).map((material) => (
                  <SelectItem key={material} value={material}>
                    {wireMaterialLabels[material]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Stainless steel uses a small correction compared to copper.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="sleeved-toggle" className="text-sm font-medium text-foreground">
                Sleeved wire (PVC)
              </Label>
              <p className="text-xs text-muted-foreground">
                Uses a 0.97 velocity-factor correction when insulation sleeve stays on the wire.
              </p>
            </div>
            <Switch id="sleeved-toggle" checked={isSleeved} onCheckedChange={setIsSleeved} />
          </div>
        </div>
      </details>
    </div>
  );
}
