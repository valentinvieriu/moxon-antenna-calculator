/**
 * Moxon antenna dimension calculator.
 *
 * Method reference
 * ----------------
 * The geometry calculation implemented here follows the polynomial-fit approach
 * popularized by L.B. Cebik (W4RNL) in the original Moxon rectangle calculator.
 *
 * Why polynomial fits?
 * - A Moxon rectangle can be defined by 5 key dimensions (A..E) once frequency and
 *   conductor diameter are known.
 * - Cebik's method uses empirically derived equations that map the conductor
 *   electrical diameter (in wavelengths) to each geometry term.
 * - Those equations are fast, deterministic, and suitable for instant UI feedback.
 *
 * Scope of this module
 * --------------------
 * 1) Normalize wire diameter into electrical units (wavelength fraction).
 * 2) Evaluate Cebik polynomial equations for A/B/C/D.
 * 3) Apply practical correction factors (insulation + material).
 * 4) Derive E and cut-length values from A/B/C/D.
 * 5) Convert all wavelength outputs into common linear units.
 */

export type DiameterUnit = "in" | "mm" | "awg" | "wl";
export type OutputUnit = "wl" | "ft" | "in" | "m" | "mm";
export type WireMaterial = "copper" | "stainless";

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
  isSleeved: boolean;
  wireMaterial: WireMaterial;
  velocityFactor: number;
  converted: {
    [K in OutputUnit]: ConvertedDimensions;
  };
}

/**
 * Wavelength conversion constants expressed per MHz.
 *
 * Example:
 * wavelength_ft = SPEED_OF_LIGHT_FT / frequencyMHz
 *
 * These constants are rounded practical values commonly used in amateur radio
 * calculators, trading tiny theoretical precision for consistency and usability.
 */
const SPEED_OF_LIGHT_FT = 983.5592; // feet per MHz wavelength
const SPEED_OF_LIGHT_IN = 11802.71; // inches per MHz wavelength
const SPEED_OF_LIGHT_M = 299.7925; // meters per MHz wavelength
const SPEED_OF_LIGHT_MM = 299792.5; // mm per MHz wavelength

/**
 * Material correction factor.
 *
 * This app treats copper as baseline (factor = 1). Stainless is modeled as a
 * slight electrical shortening for the same physical geometry, therefore a
 * small down-scaling factor is applied.
 *
 * NOTE: This is a practical approximation, not a full electromagnetic material
 * model. Final tuning in the built environment is still recommended.
 */
const MATERIAL_CORRECTION_FACTOR: Record<WireMaterial, number> = {
  copper: 1,
  stainless: 0.992,
};

/**
 * Velocity factor for sleeved (insulated) wire.
 *
 * Insulation increases effective electrical length, so physical elements are
 * often shortened by a factor near 0.95-0.98. We use 0.97 as a pragmatic
 * default suitable for many PVC-insulated builds.
 */
const SLEEVED_VELOCITY_FACTOR = 0.97;

/**
 * Convert conductor diameter into wavelengths.
 *
 * The Cebik equations are parameterized by electrical diameter (dw), not by
 * raw metric/imperial units. Therefore every input path is normalized to a
 * wavelength fraction before geometry equations are evaluated.
 */
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
      // AWG -> inches: standard logarithmic wire-gauge relation.
      const diameterInches = 0.005 * Math.pow(92, (36 - diameter) / 39);
      return diameterInches / (SPEED_OF_LIGHT_IN / frequencyMHz);
    }
    default:
      return diameter;
  }
}

/**
 * Compute Moxon rectangle dimensions for a given frequency and wire diameter.
 *
 * Step-by-step method:
 * 1) Validate numeric safety (avoid log(<=0) and divide-by-zero paths).
 * 2) Convert wire diameter to wavelengths: dw.
 * 3) Compute log10(dw), the independent variable used by Cebik's fitted curves.
 * 4) Evaluate polynomial equations for A/B/C and linear equation for D.
 * 5) Apply multiplicative correction factors:
 *      finalFactor = sleevedFactor * materialFactor
 * 6) Derive secondary dimensions:
 *      E = B + C + D
 *      drivenCut = A + 2*B
 *      reflectorCut = A + 2*D
 * 7) Convert wavelength outputs to ft/in/m/mm using frequency-derived scale.
 *
 * Returned dimensions are always exposed both in wavelengths and converted units
 * so UI consumers can switch representation without recalculating geometry.
 */
export function calculateMoxon(
  frequencyMHz: number,
  wireDiameter: number,
  diameterUnit: DiameterUnit,
  isSleeved: boolean = false,
  wireMaterial: WireMaterial = "copper"
): MoxonResults | null {
  // Safety guard: prevent NaN / Infinity from log(0) or division by zero
  if (frequencyMHz <= 0 || wireDiameter <= 0) {
    return null;
  }

  // Convert wire diameter to wavelengths
  const dw = convertToWavelengths(wireDiameter, diameterUnit, frequencyMHz);

  // log10(dw): Cebik formulas are functions of this value.
  const log10Diameter = 0.4342945 * Math.log(dw);

  // Check for warnings
  let warning: string | undefined;
  if (log10Diameter < -6) {
    warning = "Wire diameter very small for this frequency — results may be unreliable.";
  } else if (log10Diameter > -2) {
    warning = "Wire diameter very large for this frequency — results may be unreliable.";
  }

  /**
   * Polynomial coefficients (A, B, C) and linear fit (D).
   *
   * These are direct numeric fits from the classic Cebik calculator lineage.
   * The outputs are dimension fractions in wavelengths before practical
   * correction factors are applied.
   */
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

  // Apply build-practical corrections as a single multiplicative factor.
  const sleevedFactor = isSleeved ? SLEEVED_VELOCITY_FACTOR : 1.0;
  const materialFactor = MATERIAL_CORRECTION_FACTOR[wireMaterial];
  const velocityFactor = sleevedFactor * materialFactor;
  a *= velocityFactor;
  b *= velocityFactor;
  c *= velocityFactor;
  d *= velocityFactor;

  const e = b + c + d;

  // Calculate cut lengths (total conductor to cut from spool before forming).
  const drivenCutLength = a + 2 * b;
  const reflectorCutLength = a + 2 * d;

  // Frequency-specific conversion factors from wavelength units.
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

  /**
   * Convert wavelength-based geometry into a linear output unit.
   *
   * factor = length of one wavelength in target unit at this frequency.
   */
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
    isSleeved,
    wireMaterial,
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

export const wireMaterialLabels: Record<WireMaterial, string> = {
  copper: "Copper",
  stainless: "Stainless steel",
};
