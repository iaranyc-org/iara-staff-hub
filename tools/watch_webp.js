// Make 160w and 320w WebP copies of every Watch List photo, next to the original
// (img/watch/name.jpg -> name.160.webp, name.320.webp). Originals are kept.
// Lineup's wlSrcset() points srcset at these. Re-run after adding photos:
//   NODE_PATH=<dir with sharp>/node_modules node tools/watch_webp.js
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'img', 'watch');
(async () => {
  let n = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(jpe?g|png)$/i.test(f)) continue;
    const base = path.join(dir, f.replace(/\.[^.]+$/, ''));
    for (const w of [160, 320]) {
      const out = `${base}.${w}.webp`;
      if (fs.existsSync(out)) continue;
      await sharp(path.join(dir, f)).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out); n++;
    }
  }
  console.log('wrote', n);
})();
