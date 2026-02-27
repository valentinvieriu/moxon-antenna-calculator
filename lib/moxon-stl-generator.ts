// Parametric binary STL generator for Moxon antenna 3D-printable frame
// Features: U-channels, chamfered corners, end caps, side bridges,
// central boom with mounting tail + zip-tie hole.
// All coordinates in mm — ready for slicers (Cura, PrusaSlicer, etc.)

import type { ConvertedDimensions } from "./moxon-calculator";

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

// ─── Triangle geometry primitives ────────────────────────────────────────

type Vec3 = [number, number, number];

interface Triangle {
  normal: Vec3;
  v1: Vec3;
  v2: Vec3;
  v3: Vec3;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function computeNormal(v1: Vec3, v2: Vec3, v3: Vec3): Vec3 {
  return normalize(cross(sub(v2, v1), sub(v3, v1)));
}

/**
 * Extrude a convex polygon along Z from z0 to z1.
 * Points must be counter-clockwise when viewed from +Z.
 */
function addPrism(
  triangles: Triangle[],
  points: [number, number][],
  z0: number,
  z1: number
) {
  const n = points.length;
  if (n < 3) return;

  // Center for fan triangulation
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p[0];
    cy += p[1];
  }
  cx /= n;
  cy /= n;
  const cBottom: Vec3 = [cx, cy, z0];
  const cTop: Vec3 = [cx, cy, z1];

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];

    // Bottom face (-Z)
    triangles.push({
      normal: [0, 0, -1],
      v1: [p2[0], p2[1], z0],
      v2: [p1[0], p1[1], z0],
      v3: cBottom,
    });

    // Top face (+Z)
    triangles.push({
      normal: [0, 0, 1],
      v1: [p1[0], p1[1], z1],
      v2: [p2[0], p2[1], z1],
      v3: cTop,
    });

    // Side face (quad = 2 triangles)
    const vBL: Vec3 = [p1[0], p1[1], z0];
    const vBR: Vec3 = [p2[0], p2[1], z0];
    const vTR: Vec3 = [p2[0], p2[1], z1];
    const vTL: Vec3 = [p1[0], p1[1], z1];
    const normal = computeNormal(vBL, vBR, vTR);
    triangles.push({ normal, v1: vBL, v2: vBR, v3: vTR });
    triangles.push({ normal, v1: vBL, v2: vTR, v3: vTL });
  }
}

/** Axis-aligned box: 12 triangles with outward-facing normals. */
function addBox(
  triangles: Triangle[],
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number
) {
  const points: [number, number][] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  addPrism(triangles, points, z0, z1);
}

/**
 * Chamfered corner block (octagonal prism) centered on (cx, cy).
 * All four edges of the square are chamfered by `chamfer` mm.
 */
function addChamferedCorner(
  triangles: Triangle[],
  cx: number,
  cy: number,
  size: number,
  z0: number,
  z1: number,
  chamfer: number
) {
  const half = size / 2;
  const c = Math.min(chamfer, half - 0.1);
  const x0 = cx - half;
  const x1 = cx + half;
  const y0 = cy - half;
  const y1 = cy + half;

  // Octagon CCW when viewed from +Z
  const points: [number, number][] = [
    [x0 + c, y0],
    [x1 - c, y0],
    [x1, y0 + c],
    [x1, y1 - c],
    [x1 - c, y1],
    [x0 + c, y1],
    [x0, y1 - c],
    [x0, y0 + c],
  ];
  addPrism(triangles, points, z0, z1);
}

// ─── Channel helpers ─────────────────────────────────────────────────────

function addChannelX(
  triangles: Triangle[],
  xStart: number,
  xEnd: number,
  cy: number,
  cfg: PrintConfig
) {
  const slotWidth = cfg.wireDiameterMm + cfg.tolerance;
  const outerWidth = slotWidth + 2 * cfg.wallThickness;
  const totalHeight = cfg.floorThickness + cfg.channelHeight;
  const halfOuter = outerWidth / 2;

  // Floor
  addBox(triangles, xStart, cy - halfOuter, 0, xEnd, cy + halfOuter, cfg.floorThickness);
  // Left wall
  addBox(triangles, xStart, cy - halfOuter, cfg.floorThickness, xEnd, cy - halfOuter + cfg.wallThickness, totalHeight);
  // Right wall
  addBox(triangles, xStart, cy + halfOuter - cfg.wallThickness, cfg.floorThickness, xEnd, cy + halfOuter, totalHeight);
}

function addChannelY(
  triangles: Triangle[],
  yStart: number,
  yEnd: number,
  cx: number,
  cfg: PrintConfig
) {
  const slotWidth = cfg.wireDiameterMm + cfg.tolerance;
  const outerWidth = slotWidth + 2 * cfg.wallThickness;
  const totalHeight = cfg.floorThickness + cfg.channelHeight;
  const halfOuter = outerWidth / 2;
  const yMin = Math.min(yStart, yEnd);
  const yMax = Math.max(yStart, yEnd);

  addBox(triangles, cx - halfOuter, yMin, 0, cx + halfOuter, yMax, cfg.floorThickness);
  addBox(triangles, cx - halfOuter, yMin, cfg.floorThickness, cx - halfOuter + cfg.wallThickness, yMax, totalHeight);
  addBox(triangles, cx + halfOuter - cfg.wallThickness, yMin, cfg.floorThickness, cx + halfOuter, yMax, totalHeight);
}

/** End cap: solid block closing the open end of a tail channel. */
function addEndCap(
  triangles: Triangle[],
  cx: number,
  yEdge: number,
  cfg: PrintConfig,
  direction: "positive" | "negative"
) {
  const outerWidth = cfg.wireDiameterMm + cfg.tolerance + 2 * cfg.wallThickness;
  const halfOuter = outerWidth / 2;
  const totalHeight = cfg.floorThickness + cfg.channelHeight;
  const y0 = direction === "positive" ? yEdge : yEdge - cfg.wallThickness;
  const y1 = direction === "positive" ? yEdge + cfg.wallThickness : yEdge;
  addBox(triangles, cx - halfOuter, y0, 0, cx + halfOuter, y1, totalHeight);
}

/** Flat bridge bar connecting driver tail tip to reflector tail tip. */
function addSideBridge(
  triangles: Triangle[],
  yStart: number,
  yEnd: number,
  cx: number,
  cfg: PrintConfig
) {
  const bridgeWidth = cfg.wallThickness * 2;
  const halfWidth = bridgeWidth / 2;
  const yMin = Math.min(yStart, yEnd);
  const yMax = Math.max(yStart, yEnd);
  addBox(triangles, cx - halfWidth, yMin, 0, cx + halfWidth, yMax, cfg.floorThickness);
}

/**
 * Box with a square hole punched through the center along Z.
 * Implemented as 4 solid boxes surrounding the hole.
 */
function addBoxWithSquareHole(
  triangles: Triangle[],
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  holeSize: number
) {
  if (holeSize <= 0) {
    addBox(triangles, x0, y0, z0, x1, y1, z1);
    return;
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hHalf = holeSize / 2;

  // Left
  addBox(triangles, x0, y0, z0, cx - hHalf, y1, z1);
  // Right
  addBox(triangles, cx + hHalf, y0, z0, x1, y1, z1);
  // Top strip (between hole sides)
  addBox(triangles, cx - hHalf, cy + hHalf, z0, cx + hHalf, y1, z1);
  // Bottom strip (between hole sides)
  addBox(triangles, cx - hHalf, y0, z0, cx + hHalf, cy - hHalf, z1);
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
  const { a, b, d, e } = dims;

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

  // Corner blocks (simplified to boxes for preview; STL uses chamfered)
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

// ─── Binary STL generator ────────────────────────────────────────────────

export function generateMoxonStl(
  dims: ConvertedDimensions,
  cfg: PrintConfig = DEFAULT_PRINT_CONFIG
): Blob {
  const { a, b, d, e } = dims;
  const triangles: Triangle[] = [];

  const halfA = a / 2;
  const driverY = -e / 2;
  const reflectorY = e / 2;
  const outerWidth = cfg.wireDiameterMm + cfg.tolerance + 2 * cfg.wallThickness;
  const halfOuter = outerWidth / 2;
  const totalHeight = cfg.floorThickness + cfg.channelHeight;

  // ── Driver element ──
  addChannelX(triangles, -halfA, halfA, driverY, cfg);
  const driverTailEnd = driverY + b;
  addChannelY(triangles, driverY, driverTailEnd, -halfA, cfg);
  addChannelY(triangles, driverY, driverTailEnd, halfA, cfg);
  // Driver end caps
  addEndCap(triangles, -halfA, driverTailEnd, cfg, "positive");
  addEndCap(triangles, halfA, driverTailEnd, cfg, "positive");

  // ── Reflector element ──
  addChannelX(triangles, -halfA, halfA, reflectorY, cfg);
  const reflectorTailEnd = reflectorY - d;
  addChannelY(triangles, reflectorTailEnd, reflectorY, -halfA, cfg);
  addChannelY(triangles, reflectorTailEnd, reflectorY, halfA, cfg);
  // Reflector end caps
  addEndCap(triangles, -halfA, reflectorTailEnd, cfg, "negative");
  addEndCap(triangles, halfA, reflectorTailEnd, cfg, "negative");

  // ── Side bridges (close gap C) ──
  addSideBridge(triangles, driverTailEnd + cfg.wallThickness, reflectorTailEnd - cfg.wallThickness, -halfA, cfg);
  addSideBridge(triangles, driverTailEnd + cfg.wallThickness, reflectorTailEnd - cfg.wallThickness, halfA, cfg);

  // ── Chamfered corner blocks ──
  addChamferedCorner(triangles, -halfA, driverY, outerWidth, 0, totalHeight, cfg.cornerChamfer);
  addChamferedCorner(triangles, halfA, driverY, outerWidth, 0, totalHeight, cfg.cornerChamfer);
  addChamferedCorner(triangles, -halfA, reflectorY, outerWidth, 0, totalHeight, cfg.cornerChamfer);
  addChamferedCorner(triangles, halfA, reflectorY, outerWidth, 0, totalHeight, cfg.cornerChamfer);

  // ── Central boom ──
  const halfBoom = cfg.boomWidth / 2;
  const boomHeight = cfg.floorThickness + 1.5;
  const boomStart = driverY - halfOuter;
  const boomBodyEnd = reflectorY + halfOuter;
  addBox(triangles, -halfBoom, boomStart, 0, halfBoom, boomBodyEnd, boomHeight);

  // ── Mounting tail with zip-tie hole ──
  const tailStart = boomBodyEnd;
  const tailEnd = tailStart + cfg.mountingTailLength;
  if (cfg.mountingHoleDiameter > 0) {
    const holeMidY = (tailStart + tailEnd) / 2;
    const hHalf = cfg.mountingHoleDiameter / 2;
    // Section before hole
    addBox(triangles, -halfBoom, tailStart, 0, halfBoom, holeMidY - hHalf, boomHeight);
    // Left side of hole
    addBox(triangles, -halfBoom, holeMidY - hHalf, 0, -halfBoom + (cfg.boomWidth - cfg.mountingHoleDiameter) / 2, holeMidY + hHalf, boomHeight);
    // Right side of hole
    addBox(triangles, halfBoom - (cfg.boomWidth - cfg.mountingHoleDiameter) / 2, holeMidY - hHalf, 0, halfBoom, holeMidY + hHalf, boomHeight);
    // Section after hole
    addBox(triangles, -halfBoom, holeMidY + hHalf, 0, halfBoom, tailEnd, boomHeight);
  } else {
    addBox(triangles, -halfBoom, tailStart, 0, halfBoom, tailEnd, boomHeight);
  }

  // ── Encode to binary STL ──
  const numTriangles = triangles.length;
  const bufferSize = 84 + numTriangles * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  const header = "Moxon Antenna Frame - Generated by Moxon Calculator";
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  view.setUint32(80, numTriangles, true);

  let offset = 84;
  for (const tri of triangles) {
    view.setFloat32(offset, tri.normal[0], true); offset += 4;
    view.setFloat32(offset, tri.normal[1], true); offset += 4;
    view.setFloat32(offset, tri.normal[2], true); offset += 4;
    view.setFloat32(offset, tri.v1[0], true); offset += 4;
    view.setFloat32(offset, tri.v1[1], true); offset += 4;
    view.setFloat32(offset, tri.v1[2], true); offset += 4;
    view.setFloat32(offset, tri.v2[0], true); offset += 4;
    view.setFloat32(offset, tri.v2[1], true); offset += 4;
    view.setFloat32(offset, tri.v2[2], true); offset += 4;
    view.setFloat32(offset, tri.v3[0], true); offset += 4;
    view.setFloat32(offset, tri.v3[1], true); offset += 4;
    view.setFloat32(offset, tri.v3[2], true); offset += 4;
    view.setUint16(offset, 0, true); offset += 2;
  }

  return new Blob([buffer], { type: "application/octet-stream" });
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
