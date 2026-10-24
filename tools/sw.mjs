// Run after changing any file: writes sw.js (the service worker, with every file the installed game caches up front)
// and the count of modules the boot screen's bar waits for (index.html's boot-files).
//   node tools/sw.mjs
import fs from 'node:fs';
import path from 'node:path';

const D = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'),
  files = [];
const walk = d => {
  for (const f of fs.readdirSync(d)) {
    if (f.startsWith('.') || f === 'tools' || f === 'node_modules') continue;
    const p = path.join(d, f);
    fs.statSync(p).isDirectory() ? walk(p) : files.push(path.relative(D, p));
  }
};
walk(D);
const site = files.filter(f => !/\.(md|mjs)$/.test(f) && f !== 'LICENSE' && f !== 'sw.template.js' && f !== 'sw.js');
// (not cached up front: the networks, and what is known of each song (fetched when the song is played, kept then))
const shell = ['./', ...site.filter(f => !f.startsWith('vendor/ml/') && !f.startsWith('data/known/')).map(f => `./${f}`)],
  version = Date.now().toString(36);
fs.writeFileSync(path.join(D, 'sw.js'), fs.readFileSync(path.join(D, 'sw.template.js'), 'utf8').replace('__VERSION__', version).replace('__FILES__', JSON.stringify(shell)));
const modules = files.filter(f => f.startsWith('src/') && f.endsWith('.js')).length,
  html = fs.readFileSync(path.join(D, 'index.html'), 'utf8').replace(/\s*<meta name="boot-files" content="\d+" \/>/, '');
fs.writeFileSync(path.join(D, 'index.html'), html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    <meta name="boot-files" content="${modules}" />`));
console.log(`sw.js: ${shell.length} files cached; ${modules} modules`);
