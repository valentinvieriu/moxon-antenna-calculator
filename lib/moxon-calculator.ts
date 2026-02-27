// Moxon antenna dimension calculator
// Based on algorithm by L.B. Cebik, W4RNL
// http://www.cebik.com/moxon/moxgen.html

export type DiameterUnit = "in" | "mm" | "awg" | "wl";
export type OutputUnit = "wl" | "ft" | "in" | "m" | "mm";

export interface MoxonDimensions {
  a: number; // Overall width (corner-to-corner, same for both elements)
  b: number; // Driven element tail length (bent portion toward reflector)
  c: number; // Gap between tail tips (driver tip to reflector tip)
  d: number; // Reflector tail length (bent portion toward driver)
  e: number; // Total depth / boom length (B + C + D)
  drivenCutLength: number; // Total wire needed for driven element: A + 2*B
  reflectorCutLength: number; // Total wire needed for reflector element: A + 2*D
  wavelength: number;
  wireDiameterWl: number;
  warning?: string;
}

export interface ConvertedDimensions {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  drivenCutLength: number;
  reflectorCutLength: number;
  wavelength: number;
  wireDiameter: number;
}

export interface MoxonResults {
  dimensions: MoxonDimensions;
  isInsulated: boolean;
  velocityFactor: number;
  converted: {
    [K in OutputUnit]: ConvertedDimensions;
  };
}

// Conversion factors
const SPEED_OF_LIGHT_FT = 983.5592; // feet per MHz wavelength
const SPEED_OF_LIGHT_IN = 11802.71; // inches per MHz wavelength
const SPEED_OF_LIGHT_M = 299.7925; // meters per MHz wavelength
const SPEED_OF_LIGHT_MM = 299792.5; // mm per MHz wavelength

// Velocity factor for PVC-insulated wire (typical H07V-U)
const INSULATED_VELOCITY_FACTOR = 0.97;

// Convert wire diameter to wavelengths
function convertToWavelengths(
  diameter: number,
  unit: DiameterUnit,
  frequencyMHz: number
): number {
  switch (unit) {
    case "wl":
      return diameter;
    case "in":
      return diameter / (SPEED_OF_LIGHT_IN / frequencyMHz);
    case "mm":
      return diameter / (SPEED_OF_LIGHT_MM / frequencyMHz);
    case "awg": {
      // AWG to inches conversion
      const diameterInches = 0.005 * Math.pow(92, (36 - diameter) / 39);
      return diameterInches / (SPEED_OF_LIGHT_IN / frequencyMHz);
    }
    default:
      return diameter;
  }
}

// Calculate Moxon dimensions based on Cebik's algorithm
export function calculateMoxon(
  frequencyMHz: number,
  wireDiameter: number,
  diameterUnit: DiameterUnit,
  isInsulated: boolean = false
): MoxonResults | null {
  // Safety guard: prevent NaN / Infinity from log(0) or division by zero
  if (frequencyMHz <= 0 || wireDiameter <= 0) {
    return null;
  }

  // Convert wire diameter to wavelengths
  const dw = convertToWavelengths(wireDiameter, diameterUnit, frequencyMHz);

  // log base 10 of wire diameter in wavelengths
  const log10Diameter = 0.4342945 * Math.log(dw);

  // Check for warnings
  let warning: string | undefined;
  if (log10Diameter < -6) {
    warning = "Wire diameter very small for this frequency — results may be unreliable.";
  } else if (log10Diameter > -2) {
    warning = "Wire diameter very large for this frequency — results may be unreliable.";
  }

  // Calculate dimensions in wavelengths using Cebik's polynomial formulas
  let a =
    -0.0008571428571 * log10Diameter * log10Diameter +
    -0.009571428571 * log10Diameter +
    0.3398571429;

  let b =
    -0.002142857143 * log10Diameter * log10Diameter +
    -0.02035714286 * log10Diameter +
    0.008285714286;

  let c =
    0.001809523381 * log10Diameter * log10Diameter +
    0.01780952381 * log10Diameter +
    0.05164285714;

  let d = 0.001 * log10Diameter + 0.07178571429;

  // Apply insulated wire velocity factor correction
  const velocityFactor = isInsulated ? INSULATED_VELOCITY_FACTOR : 1.0;
  a *= velocityFactor;
  b *= velocityFactor;
  c *= velocityFactor;
  d *= velocityFactor;

  const e = b + c + d;

  // Calculate cut lengths (total wire to cut from spool)
  const drivenCutLength = a + 2 * b;
  const reflectorCutLength = a + 2 * d;

  // Wavelength conversion factors
  const wlToFt = SPEED_OF_LIGHT_FT / frequencyMHz;
  const wlToIn = SPEED_OF_LIGHT_IN / frequencyMHz;
  const wlToM = SPEED_OF_LIGHT_M / frequencyMHz;
  const wlToMm = SPEED_OF_LIGHT_MM / frequencyMHz;

  const dimensions: MoxonDimensions = {
    a,
    b,
    c,
    d,
    e,
    drivenCutLength,
    reflectorCutLength,
    wavelength: 1,
    wireDiameterWl: dw,
    warning,
  };

  function convert(factor: number): ConvertedDimensions {
    return {
      a: a * factor,
      b: b * factor,
      c: c * factor,
      d: d * factor,
      e: e * factor,
      drivenCutLength: drivenCutLength * factor,
      reflectorCutLength: reflectorCutLength * factor,
      wavelength: factor,
      wireDiameter: dw * factor,
    };
  }

  return {
    dimensions,
    isInsulated,
    velocityFactor,
    converted: {
      wl: convert(1),
      ft: convert(wlToFt),
      in: convert(wlToIn),
      m: convert(wlToM),
      mm: convert(wlToMm),
    },
  };
}

// Format number for display
export function formatDimension(value: number, decimals: number = 2): string {
  if (Math.abs(value) < 0.001) {
    return value.toExponential(decimals);
  }
  return value.toFixed(decimals);
}

// Unit display names
export const unitLabels: Record<OutputUnit, string> = {
  wl: "Wavelengths",
  ft: "Feet",
  in: "Inches",
  m: "Meters",
  mm: "Millimeters",
};

export const diameterUnitLabels: Record<DiameterUnit, string> = {
  in: "Inches",
  mm: "Millimeters",
  awg: "AWG",
  wl: "Wavelengths",
};
