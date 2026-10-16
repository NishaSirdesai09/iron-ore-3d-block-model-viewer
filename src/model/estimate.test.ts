import { describe, expect, it } from "vitest";
import { Phi, cellStatus, erf, price, sigma, stageOf } from "./estimate";

describe("normal CDF", () => {
  it("matches standard table values", () => {
    expect(Phi(0)).toBeCloseTo(0.5, 6);
    expect(Phi(1)).toBeCloseTo(0.841345, 5);
    expect(Phi(-1)).toBeCloseTo(0.158655, 5);
    expect(Phi(1.96)).toBeCloseTo(0.975002, 5);
    expect(Phi(-2.5758)).toBeCloseTo(0.005, 4);
    expect(Phi(3)).toBeCloseTo(0.99865, 4);
  });

  it("erf is odd and bounded", () => {
    for (const x of [0.1, 0.5, 1, 2, 4]) {
      expect(erf(-x)).toBeCloseTo(-erf(x), 12);
      expect(Math.abs(erf(x))).toBeLessThanOrEqual(1);
    }
  });
});

describe("price curve", () => {
  it("is zero below 45% Fe", () => {
    expect(price(44.9)).toBe(0);
    expect(price(10)).toBe(0);
  });

  it("hits the anchor points", () => {
    expect(price(45)).toBe(700);
    expect(price(55)).toBe(2100);
    expect(price(60)).toBe(3300);
    expect(price(63)).toBe(4500);
    expect(price(65)).toBe(5400);
    expect(price(67)).toBe(6100);
  });

  it("interpolates linearly and caps above 67% Fe", () => {
    expect(price(50)).toBeCloseTo(1400, 9);
    expect(price(61.5)).toBeCloseTo(3900, 9);
    expect(price(68)).toBe(6100);
  });

  it("never decreases with grade", () => {
    let last = -1;
    for (let g = 40; g <= 70; g += 0.25) {
      expect(price(g)).toBeGreaterThanOrEqual(last);
      last = price(g);
    }
  });
});

describe("cellStatus", () => {
  it("splits on a 50% chance and the G2 confidence boundary", () => {
    expect(cellStatus(0.87, 0.82)).toBe("defined-ore");
    expect(cellStatus(0.77, 0.24)).toBe("speculative");
    expect(cellStatus(0.03, 0.67)).toBe("tested-low");
    expect(cellStatus(0.2, 0.1)).toBe("unknown");
    expect(cellStatus(0.5, 0.5)).toBe("defined-ore");
  });
});

describe("sigma and stage", () => {
  it("shrinks uncertainty with confidence", () => {
    expect(sigma(0)).toBeCloseTo(12.5, 9);
    expect(sigma(1)).toBeCloseTo(1.5, 9);
  });

  it("maps confidence to G1..G4", () => {
    expect(stageOf(0.97)).toBe(1);
    expect(stageOf(0.75)).toBe(1);
    expect(stageOf(0.6)).toBe(2);
    expect(stageOf(0.3)).toBe(3);
    expect(stageOf(0.1)).toBe(4);
  });
});
