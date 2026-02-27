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
import type { DiameterUnit } from "@/lib/moxon-calculator";
import { diameterUnitLabels } from "@/lib/moxon-calculator";

interface MoxonInputFormProps {
  frequency: string;
  setFrequency: (value: string) => void;
  wireDiameter: string;
  setWireDiameter: (value: string) => void;
  diameterUnit: DiameterUnit;
  setDiameterUnit: (value: DiameterUnit) => void;
  isInsulated: boolean;
  setIsInsulated: (value: boolean) => void;
}

export function MoxonInputForm({
  frequency,
  setFrequency,
  wireDiameter,
  setWireDiameter,
  diameterUnit,
  setDiameterUnit,
  isInsulated,
  setIsInsulated,
}: MoxonInputFormProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Frequency Input */}
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
        <p className="text-xs text-muted-foreground">
          Center frequency for your antenna design
        </p>
      </div>

      {/* Wire Diameter Input */}
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

      {/* Insulated Wire Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="insulated-toggle" className="text-sm font-medium text-foreground">
            Insulated wire (PVC)
          </Label>
          <p className="text-xs text-muted-foreground">
            Uses 0.97 velocity factor. At 868 MHz, shorten cuts 1–2 mm for tuning.
          </p>
        </div>
        <Switch
          id="insulated-toggle"
          checked={isInsulated}
          onCheckedChange={setIsInsulated}
        />
      </div>
    </div>
  );
}
