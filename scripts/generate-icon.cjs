const fs = require("node:fs");
const path = require("node:path");

const size = 256;
const headerSize = 40;
const pixelBytes = size * size * 4;
const maskStride = Math.ceil(size / 32) * 4;
const maskBytes = maskStride * size;
const dibSize = headerSize + pixelBytes + maskBytes;
const icoSize = 6 + 16 + dibSize;
const buffer = Buffer.alloc(icoSize);
let offset = 0;

function writeU16(value) {
  buffer.writeUInt16LE(value, offset);
  offset += 2;
}

function writeU32(value) {
  buffer.writeUInt32LE(value, offset);
  offset += 4;
}

writeU16(0);
writeU16(1);
writeU16(1);
buffer[offset++] = 0;
buffer[offset++] = 0;
buffer[offset++] = 0;
buffer[offset++] = 0;
writeU16(1);
writeU16(32);
writeU32(dibSize);
writeU32(22);

writeU32(headerSize);
writeU32(size);
writeU32(size * 2);
writeU16(1);
writeU16(32);
writeU32(0);
writeU32(pixelBytes);
writeU32(0);
writeU32(0);
writeU32(0);
writeU32(0);

for (let y = size - 1; y >= 0; y -= 1) {
  for (let x = 0; x < size; x += 1) {
    const edge = x < 24 || x > size - 25 || y < 24 || y > size - 25;
    const accent = x > 70 && x < 186 && y > 70 && y < 186;
    const r = edge ? 18 : accent ? 43 : 238;
    const g = edge ? 29 : accent ? 119 : 244;
    const b = edge ? 44 : accent ? 255 : 252;
    buffer[offset++] = b;
    buffer[offset++] = g;
    buffer[offset++] = r;
    buffer[offset++] = 255;
  }
}

offset += maskBytes;
fs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "build", "icon.ico"), buffer);
console.log("Generated build/icon.ico");
