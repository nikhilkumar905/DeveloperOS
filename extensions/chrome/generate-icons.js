/**
 * Generates simple PersonalOS brand icons (purple gradient) for the Chrome extension.
 * Uses only Node.js built-in modules — no external dependencies needed.
 * Run: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 32, 48, 128];
const OUT_DIR = path.join(__dirname, 'src', 'icons');

// Brand colors — purple gradient feel
const COLORS = {
  bg:     [15,  17,  23,  255],  // #0f1117 dark background
  circle: [99, 102, 241, 255],   // #6366f1 indigo
  inner:  [139, 92, 246, 255],   // #8b5cf6 violet
};

/**
 * Write a minimal PNG file to disk.
 * Builds raw RGBA scanlines, deflates them, wraps in PNG chunks.
 */
function writePng(filePath, size) {
  // Build raw pixel data (RGBA, size×size)
  const pixels = [];
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.22;

  for (let y = 0; y < size; y++) {
    pixels.push(0); // filter byte per scanline
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let color;
      if (dist <= innerR) {
        color = COLORS.inner;
      } else if (dist <= outerR) {
        // Blend between circle and inner
        const t = (dist - innerR) / (outerR - innerR);
        color = COLORS.circle.map((c, i) => Math.round(c * (1 - t) + COLORS.bg[i] * t));
      } else {
        color = [0, 0, 0, 0]; // transparent
      }
      pixels.push(...color);
    }
  }

  const rawData = Buffer.from(pixels);
  const compressed = zlib.deflateSync(rawData);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuffer, data]);
    let crc = 0xffffffff;
    for (let i = 0; i < body.length; i++) {
      crc ^= body[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, typeBuffer, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(filePath, png);
  console.log(`✅ Generated ${path.basename(filePath)} (${size}x${size})`);
}

// Create output directory
fs.mkdirSync(OUT_DIR, { recursive: true });

// Also make dist/icons directory if dist already exists
const distIconsDir = path.join(__dirname, 'dist', 'icons');
fs.mkdirSync(distIconsDir, { recursive: true });

// Generate each size
for (const size of SIZES) {
  const filename = `icon${size}.png`;
  writePng(path.join(OUT_DIR, filename), size);
  writePng(path.join(distIconsDir, filename), size);
}

console.log('\n🎉 All icons generated in src/icons/ and dist/icons/');
console.log('   Reload the extension in chrome://extensions');
