// ai-excited-01 v2: "Astronaut rides a giant koi through a neon storm"
// A tiny astronaut surfs on the back of a colossal koi leaping diagonally
// across a neon storm sky, over a miniature city far below.
// Pure Node 22 stdlib: hand-rolled PNG encoder (zlib) + software rasterizer.
// Deterministic: no randomness, no time, no network.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function setPx(x: number, y: number, r: number, g: number, b: number, a = 1): void {
  const ix = Math.floor(x), iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
  const o = (iy * W + ix) * 3;
  px[o] = Math.round(px[o] * (1 - a) + r * a);
  px[o + 1] = Math.round(px[o + 1] * (1 - a) + g * a);
  px[o + 2] = Math.round(px[o + 2] * (1 - a) + b * a);
}
function fillRect(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++)
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++)
      setPx(x, y, c[0], c[1], c[2]);
}
function disc(cx: number, cy: number, r: number, c: number[], a = 1): void {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(x, y, c[0], c[1], c[2], a);
    }
}
function ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, c: number[], a = 1): void {
  const cos = Math.cos(rot), sin = Math.sin(rot);
  for (let y = Math.floor(cy - ry - rx); y <= Math.ceil(cy + ry + rx); y++)
    for (let x = Math.floor(cx - rx - ry); x <= Math.ceil(cx + rx + ry); x++) {
      const dx = x - cx, dy = y - cy;
      const u = dx * cos + dy * sin, v = -dx * sin + dy * cos;
      if ((u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1) setPx(x, y, c[0], c[1], c[2], a);
    }
}
function thickLine(x0: number, y0: number, x1: number, y1: number, w: number, c: number[], a = 1): void {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(len));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(x0 + dx * t, y0 + dy * t, w / 2, c, a);
  }
}
function poly(points: number[][], c: number[], a = 1): void {
  // scanline polygon fill
  let minY = H, maxY = 0;
  for (const p of points) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const p0 = points[i], p1 = points[(i + 1) % points.length];
      if ((p0[1] <= y && p1[1] > y) || (p1[1] <= y && p0[1] > y)) {
        xs.push(p0[0] + ((y - p0[1]) / (p1[1] - p0[1])) * (p1[0] - p0[0]));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(W - 1, Math.floor(xs[k + 1])); x++)
        setPx(x, y, c[0], c[1], c[2], a);
  }
}
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function mix(c1: number[], c2: number[], t: number): number[] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// ---------- sky: deep indigo storm -> magenta horizon ----------
const skyTop = [16, 8, 48];
const skyMid = [58, 18, 96];
const skyBot = [176, 44, 120];
for (let y = 0; y < H; y++) {
  const t = y / H;
  const c = t < 0.55 ? mix(skyTop, skyMid, t / 0.55) : mix(skyMid, skyBot, (t - 0.55) / 0.45);
  for (let x = 0; x < W; x++) setPx(x, y, c[0], c[1], c[2]);
}
// stars
const stars: [number, number, number][] = [
  [80, 90, 2.2], [190, 60, 1.6], [320, 130, 2.0], [470, 70, 1.5], [620, 110, 2.2],
  [760, 60, 1.7], [900, 120, 2.0], [140, 210, 1.5], [980, 240, 1.8], [60, 330, 1.6],
  [540, 180, 1.4], [840, 300, 1.5], [260, 40, 1.3], [700, 190, 1.6],
];
for (const [sx, sy, sr] of stars) disc(sx, sy, sr, [255, 255, 255], 0.9);

// ---------- storm clouds (dark masses with neon rims) ----------
function cloud(cx: number, cy: number, s: number): void {
  const dark = [26, 14, 58];
  disc(cx, cy, 150 * s, dark);
  disc(cx - 110 * s, cy + 30 * s, 110 * s, dark);
  disc(cx + 120 * s, cy + 26 * s, 120 * s, dark);
  disc(cx + 40 * s, cy - 60 * s, 90 * s, dark);
  // neon rim: dots tracing the cloud's lower edge
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const rx = cx - 140 * s + t * 280 * s;
    const ry = cy + 96 * s - Math.sin(t * Math.PI) * 18 * s;
    disc(rx, ry, 4, [0, 229, 255], 0.6);
  }
}
cloud(180, 150, 1.0);
cloud(850, 120, 0.9);
cloud(920, 420, 0.7);
cloud(90, 480, 0.65);

// ---------- lightning ----------
function bolt(x0: number, y0: number, segs: [number, number][]): void {
  let px0 = x0, py0 = y0;
  for (const [dx, dy] of segs) {
    const nx = px0 + dx, ny = py0 + dy;
    thickLine(px0, py0, nx, ny, 9, [120, 240, 255], 0.35);
    thickLine(px0, py0, nx, ny, 4, [230, 250, 255], 0.95);
    px0 = nx; py0 = ny;
  }
}
bolt(700, 60, [[-30, 90], [45, 80], [-55, 90], [25, 70]]);
bolt(150, 240, [[40, 70], [-50, 60], [30, 60]]);

// ---------- miniature city far below (scale contrast) ----------
const cityBase = 940;
fillRect(0, cityBase, W, H, [10, 6, 30]);
const buildings: [number, number, number][] = [];
let bx = 0;
const bHeights = [60, 110, 80, 140, 95, 55, 125, 70, 100, 150, 65, 90, 120, 75, 105, 58, 135, 85];
let bi = 0;
while (bx < W) {
  const bw = 46 + ((bi * 37) % 30);
  const bh = bHeights[bi % bHeights.length];
  buildings.push([bx, cityBase - bh, bw]);
  fillRect(bx, cityBase - bh, bx + bw, cityBase, [14, 10, 40]);
  // tiny lit windows
  for (let wy = cityBase - bh + 8; wy < cityBase - 8; wy += 14)
    for (let wx = bx + 6; wx < bx + bw - 6; wx += 12)
      if ((wx * 7 + wy * 13) % 5 < 2) fillRect(wx, wy, wx + 4, wy + 6, [255, 214, 130]);
  bx += bw + 8;
  bi++;
}
// (tower removed: it floated above the skyline like a glitch)

// ---------- glowing speed trail behind the koi ----------
for (let i = 0; i < 5; i++) {
  const t = i / 5;
  const x = 120 + t * 220, y = 760 - t * 190;
  thickLine(x, y, x + 130, y - 60, 26 - i * 4, [0, 229, 255], 0.16 - i * 0.02);
  thickLine(x + 20, y + 26, x + 140, y - 30, 14 - i * 2, [255, 64, 180], 0.14 - i * 0.02);
}

// ---------- the giant koi: diagonal leap, bottom-left -> top-right ----------
// body built from overlapping rotated ellipses along a rising curve
const KOI_ROT = -0.62; // radians, nose up-right
const bodyWhite = [248, 244, 232];
const bodyOrange = [255, 122, 26];
const bodyBlack = [24, 18, 32];
function koiSeg(cx: number, cy: number, rx: number, ry: number): void {
  ellipse(cx, cy, rx, ry, KOI_ROT, bodyWhite);
}
// tail -> head along the diagonal, smooth taper (9 steps, small overlap)
const bodyPts: [number, number, number, number][] = [
  [205, 785, 118, 58], [290, 730, 138, 68], [380, 672, 152, 76],
  [475, 612, 160, 80], [570, 550, 158, 80], [660, 492, 148, 76],
  [745, 435, 134, 70], [825, 380, 116, 62], [895, 330, 96, 56],
];
for (const [cx, cy, rx, ry] of bodyPts) koiSeg(cx, cy, rx, ry);
// head (shifted 40 left so the whole head fits inside the frame)
ellipse(905, 300, 92, 68, KOI_ROT, bodyWhite);
// orange patches on the back (smaller, aligned to the body)
ellipse(430, 585, 68, 36, KOI_ROT, bodyOrange);
ellipse(620, 478, 62, 32, KOI_ROT, bodyOrange);
ellipse(800, 385, 46, 26, KOI_ROT, bodyOrange);
ellipse(300, 690, 50, 28, KOI_ROT, bodyOrange);
// black spots (small, on white areas only)
disc(560, 520, 12, bodyBlack);
disc(730, 430, 10, bodyBlack);
// belly shade (subtle)
ellipse(470, 660, 170, 46, KOI_ROT, [214, 196, 178], 0.45);
ellipse(700, 500, 140, 40, KOI_ROT, [214, 196, 178], 0.45);
// scales: arcs of dots along the body
for (let i = 0; i < 26; i++) {
  const t = i / 26;
  const cx = 280 + t * 560, cy = 745 - t * 400;
  const off = (i % 2) * 26;
  disc(cx + off * 0.4, cy + 18 + off * 0.5, 5, [226, 208, 186], 0.8);
  disc(cx - 14, cy - 22, 5, [226, 208, 186], 0.8);
}
// dorsal fins (slim, swept-back triangles)
poly([[400, 545], [470, 450], [520, 520], [460, 580]], bodyOrange);
poly([[580, 450], [640, 365], [685, 430], [640, 495]], bodyOrange);
// tail fin: two flowing lobes sweeping away from the body
// (outer tips chamfered so the lobes read soft, not triangular)
poly([[190, 770], [110, 690], [90, 675], [100, 705], [130, 750], [150, 800]], [255, 150, 120], 0.9);
poly([[180, 800], [90, 870], [75, 910], [95, 935], [130, 920], [200, 850]], [255, 110, 90], 0.9);
// pectoral fin: swept triangle emerging from the body's lower edge
poly([[640, 545], [620, 640], [690, 665], [710, 570]], [255, 140, 80], 0.95);
// eye: huge, looking up-right
disc(908, 272, 30, [255, 255, 255]);
disc(916, 266, 20, [20, 14, 30]);
disc(922, 258, 8, [255, 255, 255]);
disc(908, 272, 30, [0, 0, 0], 0); // keep outline crisp
thickLine(878, 246, 936, 238, 5, bodyBlack, 0.9);
// mouth + whiskers (shifted with the head)
thickLine(950, 330, 970, 352, 6, bodyBlack, 0.8);
thickLine(920, 350, 860, 420, 5, [255, 200, 150], 0.9);
thickLine(935, 360, 890, 440, 5, [255, 200, 150], 0.9);
// neon rim light tracing the koi's upper (dorsal) edge
const rimPts: [number, number][] = [[171, 738], [336, 610], [524, 485], [704, 378], [862, 284]];
for (let i = 0; i + 1 < rimPts.length; i++)
  thickLine(rimPts[i][0], rimPts[i][1], rimPts[i + 1][0], rimPts[i + 1][1], 5, [0, 229, 255], 0.45);

// ---------- the tiny astronaut riding the koi ----------
// He stands on the koi's back near the head, one arm raised, surfing the storm.
const ax = 690, ay = 392; // feet on the koi's back, top edge near the head
// glowing surf plank under his boots
thickLine(ax - 52, ay + 40, ax + 58, ay + 12, 11, [0, 229, 255], 0.95);
thickLine(ax - 52, ay + 40, ax + 58, ay + 12, 4, [255, 255, 255], 0.9);
// legs
thickLine(ax - 6, ay + 4, ax - 22, ay + 34, 13, [235, 238, 245]);
thickLine(ax + 8, ay + 4, ax + 28, ay + 26, 13, [235, 238, 245]);
// torso (white suit)
poly([[ax - 18, ay - 40], [ax + 18, ay - 40], [ax + 15, ay + 6], [ax - 15, ay + 6]], [240, 242, 248]);
// chest stripe + life-support pack
thickLine(ax - 17, ay - 22, ax + 17, ay - 22, 6, [255, 64, 90]);
poly([[ax - 30, ay - 36], [ax - 18, ay - 36], [ax - 18, ay - 4], [ax - 30, ay - 4]], [200, 205, 215]);
// arms: one raised high holding a glowing flag, one down for balance
thickLine(ax + 15, ay - 34, ax + 52, ay - 80, 12, [235, 238, 245]);
thickLine(ax - 15, ay - 34, ax - 46, ay - 4, 12, [235, 238, 245]);
// flag on a thin pole in the raised hand
thickLine(ax + 52, ay - 80, ax + 52, ay - 140, 4, [255, 255, 255]);
poly([[ax + 52, ay - 140], [ax + 118, ay - 126], [ax + 52, ay - 108]], [255, 64, 180]);
// helmet: big bubble, visor reflecting the storm
disc(ax, ay - 62, 25, [235, 238, 245]);
disc(ax + 4, ay - 62, 19, [16, 30, 60]);
disc(ax + 11, ay - 68, 7, [140, 230, 255]);
disc(ax - 3, ay - 70, 4, [255, 255, 255]);
// tether line from astronaut to the koi (he is tied on, mid-leap)
thickLine(ax - 24, ay - 8, ax - 90, ay + 92, 4, [255, 220, 120], 0.85);

// ---------- rain streaks, diagonal, catching neon light ----------
for (let i = 0; i < 90; i++) {
  const rx = (i * 137) % W;
  const ry = (i * 211) % 700;
  const len = 14 + ((i * 29) % 18);
  const c = i % 3 === 0 ? [0, 229, 255] : i % 3 === 1 ? [255, 64, 180] : [200, 210, 255];
  thickLine(rx, ry, rx - 8, ry + len, 2, c, 0.35);
}
// speed lines around the koi's nose
thickLine(960, 180, 1020, 120, 5, [255, 255, 255], 0.5);
thickLine(900, 140, 980, 70, 4, [0, 229, 255], 0.5);
thickLine(1020, 260, 1024, 250, 5, [255, 64, 180], 0.5);

// ---------- PNG encode ----------
function crc32(buf: Buffer): number {
  let table = (crc32 as unknown as { t?: Int32Array }).t;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    (crc32 as unknown as { t: Int32Array }).t = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0;
  raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/entry.png`, png);
