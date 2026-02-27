"use client";

import type { OutputUnit } from "@/lib/moxon-calculator";
import { cn } from "@/lib/utils";

interface UnitSelectorProps {
  value: OutputUnit;
  onChange: (unit: OutputUnit) => void;
}

const units: { value: OutputUnit; label: string }[] = [
  { value: "mm", label: "mm" },
  { value: "in", label: "in" },
  { value: "ft", label: "ft" },
  { value: "m", label: "m" },
  { value: "wl", label: "λ" },
];

export function UnitSelector({ value, onChange }: UnitSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground font-medium">Output Unit</span>
      <div className="flex rounded-lg bg-secondary p-1 gap-1">
        {units.map((unit) => (
          <button
            key={unit.value}
            type="button"
            onClick={() => onChange(unit.value)}
            className={cn(
              "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              value === unit.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {unit.label}
          </button>
        ))}
      </div>
    </div>
  );
}
