#!/usr/bin/env node
/**
 * Convert a set of PNGs into a single multi-resolution .ico file.
 *
 * No deps — uses Node's built-in Buffer. The .ico format embeds
 * PNG payloads directly (modern format, supported by every browser
 * since IE 11 / Edge 12 / Firefox 41 / Chrome 80).
 *
 * Usage: node scripts/build-favicon-ico.mjs <out.ico> <16.png> <32.png> <48.png>
 *
 * ICONDIR (6 bytes):
 *   uint16 reserved (0)
 *   uint16 type (1 = icon)
 *   uint16 count
 *
 * ICONDIRENTRY (16 bytes per image):
 *   uint8  width   (0 means 256)
 *   uint8  height  (0 means 256)
 *   uint8  colorCount (0)
 *   uint8  reserved (0)
 *   uint16 planes (1)
 *   uint16 bitCount (32)
 *   uint32 bytesInRes
 *   uint32 imageOffset
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , outPath, ...inputs] = process.argv;
if (!outPath || inputs.length === 0) {
  console.error('usage: build-favicon-ico.mjs <out.ico> <16.png> <32.png> ...');
  process.exit(2);
}

const pngs = inputs.map((p) => readFileSync(p));
const count = pngs.length;

// 6-byte ICONDIR + 16 bytes per ICONDIRENTRY
const headerSize = 6 + 16 * count;
let offset = headerSize;
const entries = [];

for (let i = 0; i < count; i++) {
  // Decode PNG IHDR for dimensions. PNG layout: 8-byte sig, then chunks.
  // IHDR starts at byte 8, length-prefixed (4 bytes), type 'IHDR' (4),
  // width (4), height (4), ...
  const png = pngs[i];
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  // Width/height: 0 means 256 in ICO; otherwise clamped to 255 max.
  const icoW = width >= 256 ? 0 : width;
  const icoH = height >= 256 ? 0 : height;
  entries.push({
    icoW,
    icoH,
    bytesInRes: png.length,
    imageOffset: offset,
  });
  offset += png.length;
}

// Build the file.
const buf = Buffer.alloc(headerSize);
buf.writeUInt16LE(0, 0);    // reserved
buf.writeUInt16LE(1, 2);    // type: icon
buf.writeUInt16LE(count, 4); // image count

for (let i = 0; i < count; i++) {
  const e = entries[i];
  const base = 6 + 16 * i;
  buf.writeUInt8(e.icoW, base + 0);
  buf.writeUInt8(e.icoH, base + 1);
  buf.writeUInt8(0, base + 2);      // colorCount
  buf.writeUInt8(0, base + 3);      // reserved
  buf.writeUInt16LE(1, base + 4);  // planes
  buf.writeUInt16LE(32, base + 6);  // bitCount
  buf.writeUInt32LE(e.bytesInRes, base + 8);
  buf.writeUInt32LE(e.imageOffset, base + 12);
}

const out = Buffer.concat([buf, ...pngs]);
writeFileSync(outPath, out);
console.log(`wrote ${outPath} (${out.length} bytes, ${count} sizes: ${inputs.map((p) => p.split('/').pop()).join(', ')})`);
