const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');

async function optimizeImages({ root, sources, output = path.join(root, 'dist/media') }) {
  await fs.mkdir(output, { recursive: true });
  const manifest = {}, report = { count: 0, originalBytes: 0, displayBytes: 0, previewBytes: 0, thumbnailBytes: 0 };
  const unique = [...new Set(sources)];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(3, unique.length) }, async () => {
    while (cursor < unique.length) {
      const src = unique[cursor++];
      if (!/^\/(img|uploads)\//.test(src) || src.includes('..')) throw Error('Invalid image path: ' + src);
      const input = await fs.readFile(path.join(root, src.slice(1)));
      const hash = createHash('sha256').update('gallery-v1-480q76-960q80-160q68').update(input).digest('hex').slice(0, 20);
      let buffer = input;
      const heic = input.length > 12 && input.toString('latin1', 4, 8) === 'ftyp' && /hei[cf]|mif1/.test(input.toString('latin1', 8, 32));
      if (heic) buffer = Buffer.from(await require('heic-convert')({ buffer: input, format: 'JPEG', quality: .94 }));
      const variants = {};
      for (const [width, quality] of [[160,68],[480,76],[960,80]]) {
        const name = hash + '-' + width + '.webp', file = path.join(output, name);
        let info;
        try { info = await sharp(file).metadata(); }
        catch { info = await sharp(buffer).rotate().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 4 }).toFile(file); }
        variants[width] = { url: '/media/' + name, width: info.width, height: info.height, bytes: (await fs.stat(file)).size };
      }
      manifest[src] = { display: variants[960].url, small: variants[480].url, card: variants[480].url, thumb: variants[160].url, full: heic ? variants[960].url : src, w: variants[960].width, h: variants[960].height };
      report.count++;
      report.originalBytes += input.length;
      report.displayBytes += variants[960].bytes;
      report.previewBytes += variants[480].bytes;
      report.thumbnailBytes += variants[160].bytes;
    }
  }));
  return { manifest, report };
}

module.exports = { optimizeImages };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  (async () => {
    const data = JSON.parse(await fs.readFile(path.join(root, 'data/catalogue.json'), 'utf8'));
    const result = await optimizeImages({ root, sources: data.flatMap(p => p.images) });
    await fs.writeFile(path.join(root, 'dist/media/image-manifest.json'), JSON.stringify(result.manifest));
    await fs.writeFile(path.join(root, 'dist/media/image-report.json'), JSON.stringify(result.report));
    console.log('Prepared', result.report.count, 'photos in thumbnail, preview and gallery sizes.');
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
