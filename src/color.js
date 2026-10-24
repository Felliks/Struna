// Colour in OKLCH (Ottosson's Oklab in polar form: lightness 0..1, chroma 0..~0.37, hue in degrees), so steps in
// lightness and colourfulness look even whatever the hue; converted to sRGB hex and clipped to its gamut.
const toSrgb = c => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
};
function oklabToRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
// in gamut: no channel out of 0..1 (beyond a hair)
const inGamut = rgb => rgb.every(v => v >= -0.001 && v <= 1.001);

// an OKLCH colour as #rrggbb; out of gamut, its chroma is lowered until it fits (the hue and lightness are kept)
export function oklch(L, C, h) {
  const r = (h * Math.PI) / 180;
  let c = C,
    rgb = oklabToRgb(L, c * Math.cos(r), c * Math.sin(r));
  for (let i = 0; i < 12 && !inGamut(rgb); i++) {
    c *= 0.8;
    rgb = oklabToRgb(L, c * Math.cos(r), c * Math.sin(r));
  }
  return '#' + rgb.map(v => toSrgb(v).toString(16).padStart(2, '0')).join('');
}
