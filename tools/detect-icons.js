// Detects icon bounding boxes in sprite.png via connected components on alpha channel.
// Output: data/sprite-boxes.json — array of {x,y,w,h,row,col,index}.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SPRITE = path.join(__dirname, '..', 'public', 'icons', 'sprite.png');
const OUT = path.join(__dirname, '..', 'data', 'sprite-boxes.json');
const ALPHA_THRESHOLD = 40;       // pixels with alpha > this count as icon
const MIN_BOX = 30;               // ignore tiny noise blobs
const MERGE_DIST = 6;             // pixel distance to consider blobs connected (tolerates speckle)

const buf = fs.readFileSync(SPRITE);
const png = PNG.sync.read(buf);
const { width: W, height: H, data } = png;
console.log(`Loaded ${W}x${H}`);

// Build mask of "filled" pixels (alpha above threshold). For non-alpha images, use brightness.
const mask = new Uint8Array(W * H);
let hasAlpha = false;
for (let i = 0; i < W * H; i++) {
  const a = data[i * 4 + 3];
  if (a < 255) hasAlpha = true;
}
console.log('hasAlpha:', hasAlpha);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    let filled;
    if (hasAlpha) filled = a > ALPHA_THRESHOLD;
    else {
      // sprite on near-white: filled if it's NOT near-white
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      filled = lum < 235;
    }
    mask[y * W + x] = filled ? 1 : 0;
  }
}

// Dilate mask slightly to merge close speckles into a single icon blob.
function dilate(src, w, h, r) {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dy = -r; dy <= r && !v; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r && !v; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= w) continue;
          if (src[yy * w + xx]) v = 1;
        }
      }
      dst[y * w + x] = v;
    }
  }
  return dst;
}
const m2 = dilate(mask, W, H, MERGE_DIST);

// Connected components (4-conn iterative flood)
const visited = new Uint8Array(W * H);
const blobs = [];
const qx = new Int32Array(W * H);
const qy = new Int32Array(W * H);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    if (!m2[idx] || visited[idx]) continue;
    let head = 0, tail = 0;
    qx[tail] = x; qy[tail] = y; tail++;
    visited[idx] = 1;
    let minX = x, maxX = x, minY = y, maxY = y;
    while (head < tail) {
      const cx = qx[head], cy = qy[head]; head++;
      if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
      const nbs = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
      for (const [nx, ny] of nbs) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (!m2[ni] || visited[ni]) continue;
        visited[ni] = 1;
        qx[tail] = nx; qy[tail] = ny; tail++;
      }
    }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    if (w >= MIN_BOX && h >= MIN_BOX) {
      blobs.push({ x: minX, y: minY, w, h });
    }
  }
}

console.log('Detected blobs:', blobs.length);

// Sort by row (y center) then by x. Group y centers into rows by clustering.
blobs.forEach((b) => { b.cx = b.x + b.w / 2; b.cy = b.y + b.h / 2; });
const sorted = blobs.slice().sort((a, b) => a.cy - b.cy);
const rows = [];
const ROW_TOL = 60; // px
for (const b of sorted) {
  let placed = false;
  for (const r of rows) {
    const avgCy = r.reduce((s, x) => s + x.cy, 0) / r.length;
    if (Math.abs(avgCy - b.cy) < ROW_TOL) { r.push(b); placed = true; break; }
  }
  if (!placed) rows.push([b]);
}
rows.forEach((r) => r.sort((a, b) => a.cx - b.cx));

const flat = [];
rows.forEach((r, ri) => {
  r.forEach((b, ci) => {
    flat.push({ row: ri, col: ci, x: b.x, y: b.y, w: b.w, h: b.h });
  });
});

console.log('Rows: ' + rows.map((r) => r.length).join(', '));
fs.writeFileSync(OUT, JSON.stringify({ sprite: { width: W, height: H }, boxes: flat }, null, 2));
console.log('Wrote', OUT);
