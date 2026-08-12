import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeThinLensImaging,
  refractThroughThinLens,
  extendRayTo,
  buildParallelRayBundle,
} from './optics.ts';

const EPS = 1e-6;
function approx(actual: number, expected: number, msg?: string) {
  assert.ok(
    Math.abs(actual - expected) <= EPS,
    msg ?? `expected ${actual} ≈ ${expected} (±${EPS})`,
  );
}

test('computeThinLensImaging: object at 2f produces v=2f, m=-1 (real, inverted, equal size)', () => {
  const f = 2;
  const u = -2 * f; // object on left
  const r = computeThinLensImaging(u, f);
  assert.equal(r.isReal, true);
  assert.equal(r.isUpright, false);
  assert.equal(r.isEnlarged, false);
  approx(r.v, 2 * f);
  approx(r.magnification, -1);
});

test('computeThinLensImaging: object at 1.5f → enlarged real image between f and 2f', () => {
  const f = 2;
  const u = -1.5 * f; // u = -3
  const r = computeThinLensImaging(u, f);
  assert.equal(r.isReal, true);
  assert.equal(r.isEnlarged, true);
  assert.equal(r.isUpright, false);
  // 1/v = 1/f + 1/u = 1/2 + 1/(-3) = 1/6 → v = 6
  approx(r.v, 6);
  // m = v/u = 6 / -3 = -2
  approx(r.magnification, -2);
});

test('computeThinLensImaging: object inside focal length (|u|<|f|) → virtual upright image', () => {
  const f = 2;
  const u = -1; // |u| < |f|
  const r = computeThinLensImaging(u, f);
  assert.equal(r.isReal, false);
  assert.equal(r.isUpright, true);
  assert.equal(r.isEnlarged, true);
  // 1/v = 1/2 + 1/(-1) = -0.5 → v = -2 (left side, virtual)
  approx(r.v, -2);
  // m = v/u = -2 / -1 = 2 (upright, enlarged)
  approx(r.magnification, 2);
});

test('computeThinLensImaging: concave lens (f<0) with parallel-ish object → virtual image on same side', () => {
  const f = -2;
  const u = -3;
  const r = computeThinLensImaging(u, f);
  assert.equal(r.isReal, false);
  // 1/v = -1/2 + (-1/3) = -5/6 → v = -1.2
  approx(r.v, -1.2);
  // m = v/u = -1.2 / -3 = 0.4 (upright, diminished)
  approx(r.magnification, 0.4);
  assert.equal(r.isEnlarged, false);
});

test('computeThinLensImaging: object exactly at focal point → image at infinity', () => {
  const f = 2;
  const u = -2;
  const r = computeThinLensImaging(u, f);
  assert.equal(Number.isFinite(r.v), false);
  assert.equal(r.isReal, false); // v is -Infinity, which is not > 0
});

test('computeThinLensImaging: throws when focal length is zero', () => {
  assert.throws(() => computeThinLensImaging(-2, 0), /focalLength/);
});

test('refractThroughThinLens: parallel ray above axis crosses back focal point', () => {
  const f = 2;
  // Parallel ray at y=1, traveling along +x
  const ray = { x: -5, y: 1, dx: 1, dy: 0 };
  const out = refractThroughThinLens(ray, f);
  // Outgoing ray starts at (0, 1). Slope = tan(-y/f) = tan(-0.5)
  approx(out.x, 0);
  approx(out.y, 1);
  // At x=f, y should be 0 (passes through back focal point).
  const atF = extendRayTo(out, f);
  approx(atF.y, 0);
});

test('refractThroughThinLens: ray through lens center is undeflected', () => {
  const f = 2;
  // Ray from (-3, -1) aimed at origin → passes through center.
  // Direction: from (-3,-1) to (0,0) = (3,1), normalize.
  const len = Math.hypot(3, 1);
  const ray = { x: -3, y: -1, dx: 3 / len, dy: 1 / len };
  const out = refractThroughThinLens(ray, f);
  // Should pass through (0, 0) and keep the same slope.
  approx(out.y, 0);
  // Outgoing slope = θ_in (since y=0 at lens → θ_out = θ_in - 0 = θ_in).
  const expectedSlope = (1 / 3);
  const outSlope = out.dy / out.dx;
  approx(outSlope, expectedSlope);
});

test('refractThroughThinLens: ray through front focal point emerges parallel', () => {
  const f = 2;
  // Front focal point at (-f, 0) = (-2, 0). Ray from there with slope hitting lens at y=0.5.
  // Direction: from (-2, 0) toward (0, 0.5) → (2, 0.5).
  const dx = 2;
  const dy = 0.5;
  const len = Math.hypot(dx, dy);
  const ray = { x: -2, y: 0, dx: dx / len, dy: dy / len };
  const out = refractThroughThinLens(ray, f);
  // Emerging ray should be parallel to optical axis (dy=0).
  approx(out.dy, 0);
  approx(out.dx, 1);
});

test('refractThroughThinLens: concave lens (f<0) makes parallel ray diverge', () => {
  const f = -2;
  const ray = { x: -5, y: 1, dx: 1, dy: 0 };
  const out = refractThroughThinLens(ray, f);
  // θ_out = 0 - y/f = 0 - 1/(-2) = 0.5 rad
  // Outgoing ray has positive slope (diverges upward). Its back-extension
  // should hit the front focal plane at x = -|f| = -2, y = 0.
  // Parametrize: y(x) = 1 + slope * x. We want y at x=-2.
  const slope = out.dy / out.dx;
  const yAtMinusF = 1 + slope * (-2);
  approx(yAtMinusF, 0);
});

test('buildParallelRayBundle: produces N evenly-spaced rays in (-h, h)', () => {
  const rays = buildParallelRayBundle(5, 1, -10);
  assert.equal(rays.length, 5);
  for (const r of rays) {
    assert.ok(r.y > -1 && r.y < 1);
    assert.equal(r.dx, 1);
    assert.equal(r.dy, 0);
    assert.equal(r.x, -10);
  }
  // First and last rays should bracket the middle.
  assert.ok(rays[0].y < rays[1].y);
  assert.ok(rays[3].y < rays[4].y);
});
