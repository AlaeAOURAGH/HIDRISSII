// Browser-tab mark based on HIDRISSI's H / lightning motif.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>HIDRISSI</title>
  <rect width="64" height="64" rx="14" fill="#0e1621"/>
  <path d="M15 14h10l-2 14h16l2-14h10l-5 36H36l2-14H22l-2 14H10z" fill="#e6b75f"/>
  <path d="M43 10 27 33h9L22 55l27-29H38z" fill="#0e1621"/>
  <path d="m43 15-12 17h9L27 49l18-21h-9z" fill="#e6b75f"/>
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
