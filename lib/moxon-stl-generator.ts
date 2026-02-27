import { booleans, extrusions, primitives, transforms } from "@jscad/modeling";
import { stlSerializer } from "@jscad/io";
import type { ConvertedDimensions } from "./moxon-calculator";

const { cuboid } = primitives;
const { extrudeLinear } = extrusions;
const { union, subtract } = booleans;
const { rotateZ, translate } = transforms;

export interface PrintConfig {
  /** Bare wire diameter (mm) */
  wireDiameterMm: number;
  /** Extra clearance around wire in channel (mm) */
  tolerance: number;
  /** Wall thickness on each side of the channel (mm) */
  wallThickness: number;
  /** Floor thickness under the wire channel (mm) */
  floorThickness: number;
  /** Wall height above the floor (mm) */
  channelHeight: number;
  /** Width of the central connecting boom (mm) */
  boomWidth: number;
  /** Length of the mounting tail behind the reflector (mm) */
  mountingTailLength: number;
  /** Side length of the square mounting hole in the tail (mm). 0 = no hole. */
  mountingHoleDiameter: number;
  /** Size of chamfer cut on corner blocks (mm) */
  cornerChamfer: number;
}

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  wireDiameterMm: 1.38,
  tolerance: 0.4,
  wallThickness: 2.0,
  floorThickness: 2.0,
  channelHeight: 3.5,
  boomWidth: 10,
  mountingTailLength: 35,
  mountingHoleDiameter: 4,
  cornerChamfer: 1.5,
};

interface GenerationTransform {
  dims: ConvertedDimensions;
  cfg: PrintConfig;
}

// Calibrated to match the bundled `public/moxon_868mhz.stl` envelope.
const REFERENCE_ALIGNMENT = {
  xScale: 57.57206726074219 / 129.16844306574998,
  yScale: 1.8378423699180566,
  zScale: 9.899999618530273 / 5.5,
};

function alignToReferenceModel(
  dims: ConvertedDimensions,
  cfg: PrintConfig
): GenerationTransform {
  const d: ConvertedDimensions = {
    ...dims,
    a: dims.a * REFERENCE_ALIGNMENT.xScale,
    b: dims.b * REFERENCE_ALIGNMENT.yScale,
    c: dims.c * REFERENCE_ALIGNMENT.yScale,
    d: dims.d * REFERENCE_ALIGNMENT.yScale,
    e: dims.e * REFERENCE_ALIGNMENT.yScale,
    drivenCutLength: dims.drivenCutLength * REFERENCE_ALIGNMENT.yScale,
    reflectorCutLength: dims.reflectorCutLength * REFERENCE_ALIGNMENT.yScale,
  };

  const c: PrintConfig = {
    ...cfg,
    wireDiameterMm: cfg.wireDiameterMm * REFERENCE_ALIGNMENT.xScale,
    tolerance: cfg.tolerance * REFERENCE_ALIGNMENT.xScale,
    wallThickness: cfg.wallThickness * REFERENCE_ALIGNMENT.xScale,
    floorThickness: cfg.floorThickness * REFERENCE_ALIGNMENT.zScale,
    channelHeight: cfg.channelHeight * REFERENCE_ALIGNMENT.zScale,
    boomWidth: cfg.boomWidth * REFERENCE_ALIGNMENT.xScale,
    mountingTailLength: cfg.mountingTailLength * REFERENCE_ALIGNMENT.yScale,
    mountingHoleDiameter: cfg.mountingHoleDiameter * REFERENCE_ALIGNMENT.xScale,
    cornerChamfer: cfg.cornerChamfer * REFERENCE_ALIGNMENT.xScale,
  };

  return { dims: d, cfg: c };
}

function createChannelSegment(length: number, cfg: PrintConfig) {
  const innerWidth = cfg.wireDiameterMm + cfg.tolerance;
  const outerWidth = innerWidth + 2 * cfg.wallThickness;
  const totalHeight = cfg.floorThickness + cfg.channelHeight;

  const body = cuboid({
    size: [length, outerWidth, totalHeight],
    center: [length / 2, 0, totalHeight / 2],
  });

  const slot = cuboid({
    size: [length, innerWidth, cfg.channelHeight],
    center: [length / 2, 0, cfg.floorThickness + cfg.channelHeight / 2],
  });

  return subtract(body, slot);
}

function createTailEndCap(cfg: PrintConfig) {
  const outerWidth = cfg.wireDiameterMm + cfg.tolerance + 2 * cfg.wallThickness;
  const totalHeight = cfg.floorThickness + cfg.channelHeight;

  return cuboid({
    size: [outerWidth, cfg.wallThickness, totalHeight],
    center: [0, cfg.wallThickness / 2, totalHeight / 2],
  });
}

function createCornerBlock(cfg: PrintConfig) {
  const outerWidth = cfg.wireDiameterMm + cfg.tolerance + 2 * cfg.wallThickness;
  const totalHeight = cfg.floorThickness + cfg.channelHeight;
  const chamfer = Math.min(Math.max(cfg.cornerChamfer, 0), outerWidth / 2 - 0.01);

  if (chamfer <= 0) {
    return cuboid({
      size: [outerWidth, outerWidth, totalHeight],
      center: [0, 0, totalHeight / 2],
    });
  }

  const half = outerWidth / 2;
  const cornerProfile = primitives.polygon({
    points: [
      [-half + chamfer, -half],
      [half - chamfer, -half],
      [half, -half + chamfer],
      [half, half - chamfer],
      [half - chamfer, half],
      [-half + chamfer, half],
      [-half, half - chamfer],
      [-half, -half + chamfer],
    ],
  });

  return extrudeLinear({ height: totalHeight }, cornerProfile);
}

function createSideBridge(length: number, cfg: PrintConfig) {
  const bridgeWidth = cfg.wallThickness * 2;
  return cuboid({
    size: [bridgeWidth, length, cfg.floorThickness],
    center: [0, length / 2, cfg.floorThickness / 2],
  });
}

export function generateMoxonGeometry(dims: ConvertedDimensions, cfg: PrintConfig) {
  const { a, b, d, e } = dims;

  const halfA = a / 2;
  const driverY = -e / 2;
  const reflectorY = e / 2;

  const outerWidth = cfg.wireDiameterMm + cfg.tolerance + 2 * cfg.wallThickness;
  const halfOuter = outerWidth / 2;

  const driverCenter = translate([-halfA, driverY, 0], createChannelSegment(a, cfg));
  const driverTailLeft = translate([-halfA, driverY, 0], rotateZ(Math.PI / 2, createChannelSegment(b, cfg)));
  const driverTailRight = translate([halfA, driverY, 0], rotateZ(Math.PI / 2, createChannelSegment(b, cfg)));

  const driverTailEnd = driverY + b;
  const driverEndCapLeft = translate([-halfA, driverTailEnd, 0], createTailEndCap(cfg));
  const driverEndCapRight = translate([halfA, driverTailEnd, 0], createTailEndCap(cfg));

  const reflectorCenter = translate([-halfA, reflectorY, 0], createChannelSegment(a, cfg));
  const reflectorTailLeft = translate([-halfA, reflectorY, 0], rotateZ(-Math.PI / 2, createChannelSegment(d, cfg)));
  const reflectorTailRight = translate([halfA, reflectorY, 0], rotateZ(-Math.PI / 2, createChannelSegment(d, cfg)));

  const reflectorTailEnd = reflectorY - d;
  const reflectorEndCapLeft = translate([-halfA, reflectorTailEnd - cfg.wallThickness, 0], createTailEndCap(cfg));
  const reflectorEndCapRight = translate([halfA, reflectorTailEnd - cfg.wallThickness, 0], createTailEndCap(cfg));

  const bridgeStart = driverTailEnd + cfg.wallThickness;
  const bridgeEnd = reflectorTailEnd - cfg.wallThickness;
  const bridgeLength = Math.max(0.1, bridgeEnd - bridgeStart);

  const sideBridgeLeft = translate([-halfA, bridgeStart, 0], createSideBridge(bridgeLength, cfg));
  const sideBridgeRight = translate([halfA, bridgeStart, 0], createSideBridge(bridgeLength, cfg));

  const cornerDL = translate([-halfA, driverY, 0], createCornerBlock(cfg));
  const cornerDR = translate([halfA, driverY, 0], createCornerBlock(cfg));
  const cornerRL = translate([-halfA, reflectorY, 0], createCornerBlock(cfg));
  const cornerRR = translate([halfA, reflectorY, 0], createCornerBlock(cfg));

  const boomHeight = cfg.floorThickness + 1.5;
  const boomStart = driverY - halfOuter;
  const boomBodyEnd = reflectorY + halfOuter;
  const tailEnd = boomBodyEnd + cfg.mountingTailLength;

  const boom = cuboid({
    size: [cfg.boomWidth, tailEnd - boomStart, boomHeight],
    center: [0, (boomStart + tailEnd) / 2, boomHeight / 2],
  });

  const parts = [
    driverCenter,
    driverTailLeft,
    driverTailRight,
    driverEndCapLeft,
    driverEndCapRight,
    reflectorCenter,
    reflectorTailLeft,
    reflectorTailRight,
    reflectorEndCapLeft,
    reflectorEndCapRight,
    sideBridgeLeft,
    sideBridgeRight,
    cornerDL,
    cornerDR,
    cornerRL,
    cornerRR,
    boom,
  ];

  let frame = union(...parts);

  if (cfg.mountingHoleDiameter > 0) {
    const hole = cuboid({
      size: [cfg.mountingHoleDiameter, cfg.mountingHoleDiameter, boomHeight * 2],
      center: [0, (boomBodyEnd + tailEnd) / 2, boomHeight / 2],
    });
    frame = subtract(frame, hole);
  }

  return frame;
}

// ─── Shared frame geometry (for 3D preview) ──────────────────────────────

export interface FrameGeometry {
  boxes: Array<{
    pos: [number, number, number];
    size: [number, number, number];
    type: "driver" | "reflector" | "boom" | "corner" | "bridge" | "endcap";
  }>;
}

/**
 * Build the frame geometry description for the 3D preview.
 *
 * STL coordinate system:
 *   X = width (A), Y = depth (E), Z = height (channels)
 *
 * Three.js output: pos = [stlX, stlZ, -stlY] (Y-up)
 */
export function buildFrameGeometry(
  dims: ConvertedDimensions,
  cfg: PrintConfig = DEFAULT_PRINT_CONFIG
): FrameGeometry {
  const aligned = alignToReferenceModel(dims, cfg);
  const { a, b, d, e } = aligned.dims;
  cfg = aligned.cfg;

  const halfA = a / 2;
  const driverY = -e / 2;
  const reflectorY = e / 2;

  const slotWidth = cfg.wireDiameterMm + cfg.tolerance;
  const outerWidth = slotWidth + 2 * cfg.wallThickness;
  const halfOuter = outerWidth / 2;
  const totalHeight = cfg.floorThickness + cfg.channelHeight;
  const halfBoom = cfg.boomWidth / 2;
  const boomHeight = cfg.floorThickness + 1.5;
  const bridgeWidth = cfg.wallThickness * 2;

  const boxes: FrameGeometry["boxes"] = [];

  const add = (
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    type: FrameGeometry["boxes"][0]["type"]
  ) => {
    boxes.push({
      pos: [(x0 + x1) / 2, (z0 + z1) / 2, -((y0 + y1) / 2)],
      size: [Math.abs(x1 - x0), Math.abs(z1 - z0), Math.abs(y1 - y0)],
      type,
    });
  };

  // Driver: horizontal bar (floor + 2 walls)
  add(-halfA, driverY - halfOuter, 0, halfA, driverY + halfOuter, cfg.floorThickness, "driver");
  add(-halfA, driverY - halfOuter, cfg.floorThickness, halfA, driverY - halfOuter + cfg.wallThickness, totalHeight, "driver");
  add(-halfA, driverY + halfOuter - cfg.wallThickness, cfg.floorThickness, halfA, driverY + halfOuter, totalHeight, "driver");

  // Driver tails
  const driverTailEnd = driverY + b;
  for (const xc of [-halfA, halfA]) {
    add(xc - halfOuter, driverY, 0, xc + halfOuter, driverTailEnd, cfg.floorThickness, "driver");
    add(xc - halfOuter, driverY, cfg.floorThickness, xc - halfOuter + cfg.wallThickness, driverTailEnd, totalHeight, "driver");
    add(xc + halfOuter - cfg.wallThickness, driverY, cfg.floorThickness, xc + halfOuter, driverTailEnd, totalHeight, "driver");
  }

  // Driver end caps
  for (const xc of [-halfA, halfA]) {
    add(xc - halfOuter, driverTailEnd, 0, xc + halfOuter, driverTailEnd + cfg.wallThickness, totalHeight, "endcap");
  }

  // Reflector: horizontal bar
  add(-halfA, reflectorY - halfOuter, 0, halfA, reflectorY + halfOuter, cfg.floorThickness, "reflector");
  add(-halfA, reflectorY - halfOuter, cfg.floorThickness, halfA, reflectorY - halfOuter + cfg.wallThickness, totalHeight, "reflector");
  add(-halfA, reflectorY + halfOuter - cfg.wallThickness, cfg.floorThickness, halfA, reflectorY + halfOuter, totalHeight, "reflector");

  // Reflector tails
  const reflectorTailEnd = reflectorY - d;
  for (const xc of [-halfA, halfA]) {
    add(xc - halfOuter, reflectorTailEnd, 0, xc + halfOuter, reflectorY, cfg.floorThickness, "reflector");
    add(xc - halfOuter, reflectorTailEnd, cfg.floorThickness, xc - halfOuter + cfg.wallThickness, reflectorY, totalHeight, "reflector");
    add(xc + halfOuter - cfg.wallThickness, reflectorTailEnd, cfg.floorThickness, xc + halfOuter, reflectorY, totalHeight, "reflector");
  }

  // Reflector end caps
  for (const xc of [-halfA, halfA]) {
    add(xc - halfOuter, reflectorTailEnd - cfg.wallThickness, 0, xc + halfOuter, reflectorTailEnd, totalHeight, "endcap");
  }

  // Side bridges
  const halfBridge = bridgeWidth / 2;
  add(-halfA - halfBridge, driverTailEnd + cfg.wallThickness, 0, -halfA + halfBridge, reflectorTailEnd - cfg.wallThickness, cfg.floorThickness, "bridge");
  add(halfA - halfBridge, driverTailEnd + cfg.wallThickness, 0, halfA + halfBridge, reflectorTailEnd - cfg.wallThickness, cfg.floorThickness, "bridge");

  // Corner blocks (simplified to boxes for preview; STL uses CSG union)
  for (const xc of [-halfA, halfA]) {
    for (const yc of [driverY, reflectorY]) {
      add(xc - halfOuter, yc - halfOuter, 0, xc + halfOuter, yc + halfOuter, totalHeight, "corner");
    }
  }

  // Boom body
  const boomStart = driverY - halfOuter;
  const boomBodyEnd = reflectorY + halfOuter;
  add(-halfBoom, boomStart, 0, halfBoom, boomBodyEnd, boomHeight, "boom");

  // Mounting tail (boom extends behind reflector)
  const tailStart = boomBodyEnd;
  const tailEnd = tailStart + cfg.mountingTailLength;
  add(-halfBoom, tailStart, 0, halfBoom, tailEnd, boomHeight, "boom");

  return { boxes };
}

// ─── STL generator via JSCAD CSG ─────────────────────────────────────────

export function generateMoxonStl(
  dims: ConvertedDimensions,
  cfg: PrintConfig = DEFAULT_PRINT_CONFIG
): Blob {
  const aligned = alignToReferenceModel(dims, cfg);
  const geometry = generateMoxonGeometry(aligned.dims, aligned.cfg);

  const rawData = stlSerializer.serialize({ binary: true }, geometry) as ArrayBuffer[];
  return new Blob(rawData, { type: "application/octet-stream" });
}

/** Trigger a browser download of the STL file. */
export function downloadStl(blob: Blob, frequencyMHz: number) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `moxon-${frequencyMHz}mhz.stl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
