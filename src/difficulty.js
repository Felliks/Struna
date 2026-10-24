// The difficulties: how many obstacles (a factor on each bar's allowance, on the breath between moves, and a ledge in a
// shaft every so many beats), the
// judgement windows (seconds either side
// of the beat for a perfect and a great; a press up to `near` from an obstacle's beat still counts for it) and how much
// a hit costs. Normal follows rhythm-game practice (perfect 50 ms, great 100 ms).
export const DIFFICULTY = {
  easy: { density: 0.6, rest: 1, laneEvery: 3, perfect: 0.07, great: 0.13, near: 0.35, hit: 15 },
  normal: { density: 1, rest: 0, laneEvery: 2, perfect: 0.05, great: 0.1, near: 0.3, hit: 25 },
  hard: { density: 1.4, rest: 0, laneEvery: 1, perfect: 0.04, great: 0.08, near: 0.25, hit: 34 },
};
