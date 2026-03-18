export function makeRng(seed) {
  if (seed === undefined || seed === null || Number.isNaN(seed)) {
    return () => Math.random();
  }
  let a = (Number(seed) >>> 0);
  return function rng() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function randInt(rng, min, max, { allowZero = true } = {}) {
  const mn = Math.min(min, max);
  const mx = Math.max(min, max);
  let n = Math.floor(rng() * (mx - mn + 1)) + mn;
  if (!allowZero && n === 0) return randInt(rng, min, max, { allowZero });
  return n;
}
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}