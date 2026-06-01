// Generates icons/icon{16,48,128}.png with no external dependencies.
// Run: node generate-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

// Returns [r, g, b, a] for normalized coords u, v in [0, 1).
function pixel(u, v) {
  const inRounded = (r, x0, y0, x1, y1) => {
    const cx = Math.min(Math.max(u, x0 + r), x1 - r);
    const cy = Math.min(Math.max(v, y0 + r), y1 - r);
    const dx = u - cx, dy = v - cy;
    return dx * dx + dy * dy <= r * r;
  };
  if (!inRounded(0.16, 0, 0, 1, 1)) return [0, 0, 0, 0]; // transparent outside
  // Paper
  if (inRounded(0.06, 0.28, 0.18, 0.72, 0.82)) {
    if (u >= 0.36 && u <= 0.64) {
      const lines = [0.32, 0.45, 0.58, 0.71];
      for (let i = 0; i < lines.length; i++) {
        if (Math.abs(v - lines[i]) <= 0.028) {
          return i === 0 ? [37, 99, 235, 255] : [147, 197, 253, 255];
        }
      }
    }
    return [255, 255, 255, 255]; // paper
  }
  return [37, 99, 235, 255]; // blue background
}

function makePNG(N) {
  const stride = 1 + N * 4; // filter byte + RGBA row
  const raw = Buffer.alloc(N * stride);
  for (let y = 0; y < N; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < N; x++) {
      const [r, g, b, a] = pixel((x + 0.5) / N, (y + 0.5) / N);
      const o = y * stride + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0);
  ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, 'icons');
fs.mkdirSync(dir, { recursive: true });
for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(dir, `icon${size}.png`), makePNG(size));
  console.log(`wrote icons/icon${size}.png`);
}
