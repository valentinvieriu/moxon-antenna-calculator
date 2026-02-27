import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateMoxon, formatDimension } from '../lib/moxon-calculator.ts';

const EPSILON = 1e-10;

function assertAlmostEqual(actual: number, expected: number, epsilon = EPSILON) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

test('calculateMoxon returns null for non-positive inputs', () => {
  assert.equal(calculateMoxon(0, 1, 'in'), null);
  assert.equal(calculateMoxon(14.2, 0, 'in'), null);
  assert.equal(calculateMoxon(-14.2, 1, 'in'), null);
});

test('calculateMoxon maintains core geometry relationships', () => {
  const result = calculateMoxon(14.2, 2.5, 'mm');
  assert.ok(result);

  const { dimensions } = result;
  assertAlmostEqual(dimensions.e, dimensions.b + dimensions.c + dimensions.d);
  assertAlmostEqual(dimensions.drivenCutLength, dimensions.a + 2 * dimensions.b);
  assertAlmostEqual(dimensions.reflectorCutLength, dimensions.a + 2 * dimensions.d);
});

test('sleeved wire applies velocity factor scaling to wavelength dimensions', () => {
  const bare = calculateMoxon(14.2, 1.5, 'mm', false);
  const sleeved = calculateMoxon(14.2, 1.5, 'mm', true);

  assert.ok(bare);
  assert.ok(sleeved);
  assert.equal(sleeved.velocityFactor, 0.97);

  const keys = ['a', 'b', 'c', 'd', 'e', 'drivenCutLength', 'reflectorCutLength'] as const;
  for (const key of keys) {
    assertAlmostEqual(sleeved.dimensions[key], bare.dimensions[key] * sleeved.velocityFactor);
  }
});

test('stainless material applies additional shortening compared to copper', () => {
  const copper = calculateMoxon(14.2, 1.5, 'mm', false, 'copper');
  const stainless = calculateMoxon(14.2, 1.5, 'mm', false, 'stainless');

  assert.ok(copper);
  assert.ok(stainless);
  assert.equal(copper.velocityFactor, 1);
  assert.equal(stainless.velocityFactor, 0.992);
  assert.ok(stainless.dimensions.a < copper.dimensions.a);
});

test('converted output units are internally consistent', () => {
  const result = calculateMoxon(14.2, 2.0, 'mm');
  assert.ok(result);

  const wl = result.converted.wl;
  const inches = result.converted.in;
  const feet = result.converted.ft;

  assertAlmostEqual(wl.a * wl.wavelength, wl.a);
  assertAlmostEqual(inches.a / inches.wavelength, wl.a);
  assertAlmostEqual(feet.a / feet.wavelength, wl.a);
});

test('warning message appears for extremely small and large wire diameters', () => {
  const verySmall = calculateMoxon(14.2, 1e-7, 'wl');
  const veryLarge = calculateMoxon(14.2, 0.02, 'wl');

  assert.ok(verySmall?.dimensions.warning?.includes('very small'));
  assert.ok(veryLarge?.dimensions.warning?.includes('very large'));
});

test('awg input matches equivalent inch input', () => {
  const awg = 12;
  const diameterInches = 0.005 * Math.pow(92, (36 - awg) / 39);

  const fromAwg = calculateMoxon(28.5, awg, 'awg');
  const fromInches = calculateMoxon(28.5, diameterInches, 'in');

  assert.ok(fromAwg);
  assert.ok(fromInches);
  assertAlmostEqual(fromAwg.dimensions.wireDiameterWl, fromInches.dimensions.wireDiameterWl);
});

test('formatDimension uses fixed and exponential display modes correctly', () => {
  assert.equal(formatDimension(1.23456, 2), '1.23');
  assert.equal(formatDimension(0.0005, 2), '5.00e-4');
});
