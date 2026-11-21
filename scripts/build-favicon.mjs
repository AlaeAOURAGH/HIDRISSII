// HIDRISSI H, electric bolt and scooter silhouette for the browser tab.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>HIDRISSI</title>
  <rect width="64" height="64" rx="14" fill="#0e1621"/>
  <g fill="#e6b75f">
    <path d="M14 16h7l-1 8h10l1-8h7l-3 22h-7l1-8H19l-1 8h-7z"/>
    <circle cx="15" cy="51" r="5.5"/>
    <circle cx="49" cy="51" r="5.5"/>
  </g>
  <path d="m32 15-9 12h6L20 41l16-17h-6z" fill="#0e1621"/>
  <path d="M13 44h31q4 0 3-4l-7-28h8" fill="none" stroke="#e6b75f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\n`;
await writeFile(path.join(assets, 'hidrissi-mark.svg'), svg);
const icons = [];
for (const size of [16, 32, 180]) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(path.join(assets, `hidrissi-mark-${size}.png`), png);
  if (size < 180) icons.push({ size, png });
}
const header = Buffer.alloc(6 + icons.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icons.length, 4);
let offset = header.length;
icons.forEach(({ size, png }, i) => {
  const entry = 6 + i * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
await writeFile(path.join(assets, 'hidrissi-mark.ico'), Buffer.concat([header, ...icons.map(i => i.png)]));
console.log('Created HIDRISSI SVG, ICO and 16/32/180px PNG icons.');
