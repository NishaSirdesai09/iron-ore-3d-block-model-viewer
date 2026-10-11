export type Rand = () => number;

/** mulberry32: small, fast, seeded 32-bit PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): Rand {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample via Box-Muller, drawing from `rand`. */
export function makeGauss(rand: Rand): () => number {
  return () => {
    let u = 0;
    let v = 0;
    while (!u) u = rand();
    while (!v) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (t: number): number => t * t * (3 - 2 * t);

export interface Noise {
  /** Trilinear value noise in [0, 1]. */
  vn(x: number, y: number, z: number): number;
  /** Three-octave fractal sum of value noise. */
  fbm(x: number, y: number, z: number): number;
}

/** Builds value noise from a permutation table shuffled with `rand` (consumes 255 draws). */
export function makeNoise(rand: Rand): Noise {
  const perm = new Uint8Array(512);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const r = Math.floor(rand() * (i + 1));
    [p[i], p[r]] = [p[r], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const h3 = (x: number, y: number, z: number): number =>
    perm[(perm[(perm[x & 255] + y) & 255] + z) & 255] / 255;

  function vn(x: number, y: number, z: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const zf = smooth(z - zi);
    const c = (a: number, b: number, d: number) => h3(xi + a, yi + b, zi + d);
    return lerp(
      lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
      lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
      zf,
    );
  }
  const fbm = (x: number, y: number, z: number): number =>
    vn(x, y, z) * 0.57 +
    vn(x * 2.1, y * 2.1, z * 2.1) * 0.29 +
    vn(x * 4.3, y * 4.3, z * 4.3) * 0.14;

  return { vn, fbm };
}
