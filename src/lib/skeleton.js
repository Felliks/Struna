// The skeleton every figure shares (joint order of engine/data/mixamo.json, bones, parents) and two maths helpers,
// with no dependency on the episode inputs, so modules outside the episode engine (the game in game/) can use the
// body code (ragdoll.js) too. clips.js checks the library's joints against JN.
export const JN = ['hips', 'chest', 'neck', 'head', 'shL', 'elL', 'haL', 'shR', 'elR', 'haR', 'hiL', 'knL', 'ftL', 'toL', 'hiR', 'knR', 'ftR', 'toR'];
export const JI = Object.fromEntries(JN.map((n, i) => [n, i])),
  NJ = JN.length;
export const BONES = [
  ['hips', 'chest'],
  ['chest', 'neck'],
  ['neck', 'head'],
  ['neck', 'shL'],
  ['shL', 'elL'],
  ['elL', 'haL'],
  ['neck', 'shR'],
  ['shR', 'elR'],
  ['elR', 'haR'],
  ['hips', 'hiL'],
  ['hiL', 'knL'],
  ['knL', 'ftL'],
  ['ftL', 'toL'],
  ['hips', 'hiR'],
  ['hiR', 'knR'],
  ['knR', 'ftR'],
  ['ftR', 'toR'],
].map(([a, c]) => [JI[a], JI[c]]);
export const NB = BONES.length;
export const PARENT = BONES.map(([a]) => BONES.findIndex(([, c]) => c === a));
export const clamp = (x, a = 0, c = 1) => Math.min(c, Math.max(a, x));
export const smooth = (a, c, x) => {
  const u = clamp((x - a) / (c - a));
  return u * u * (3 - 2 * u);
};
