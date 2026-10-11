import { describe, expect, it } from "vitest";
import { makeGauss, makeNoise, mulberry32 } from "./rng";

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(2655);
    const b = mulberry32(2655);
    expect(Array.from({ length: 100 }, a)).toEqual(Array.from({ length: 100 }, b));
  });

  it("differs between seeds and stays in [0, 1)", () => {
    const xs = Array.from({ length: 1000 }, mulberry32(2655));
    expect(xs).not.toEqual(Array.from({ length: 1000 }, mulberry32(2656)));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
  });

  it("matches the reference sequence for seed 2655", () => {
    const r = mulberry32(2655);
    expect([r(), r(), r()]).toEqual(REFERENCE_2655);
  });
});

// First three draws of the prototype's mulberry32(2655).
const REFERENCE_2655 = [0.3629930492024869, 0.009461740497499704, 0.6950034566689283];

describe("gaussian and noise", () => {
  it("gaussian has roughly zero mean and unit variance", () => {
    const xs = Array.from({ length: 20000 }, makeGauss(mulberry32(1)));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const v = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(v - 1)).toBeLessThan(0.05);
  });

  it("value noise is deterministic, bounded and continuous", () => {
    const n1 = makeNoise(mulberry32(7));
    const n2 = makeNoise(mulberry32(7));
    for (let s = 0; s < 50; s++) {
      const [x, y, z] = [s * 0.37, s * 0.11, s * 0.23];
      expect(n1.fbm(x, y, z)).toBe(n2.fbm(x, y, z));
      expect(n1.vn(x, y, z)).toBeGreaterThanOrEqual(0);
      expect(n1.vn(x, y, z)).toBeLessThanOrEqual(1);
      expect(Math.abs(n1.vn(x + 1e-4, y, z) - n1.vn(x, y, z))).toBeLessThan(1e-2);
    }
  });
});
