// Builds a single-file page (library inlined) for sharing without a server.
//   node scripts/standalone.mjs <out.html> [source.html]      source defaults to demo/index.html
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync(process.argv[3] || 'demo/index.html', 'utf8');
const lib = readFileSync('dist/aid.min.js', 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(title, '').replace(/<meta[^>]*>\s*/g, '').replace(/<link rel="manifest"[^>]*>\s*/g, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1]
  .replace("import '../dist/aid.js';", '')
  .replace(/import \{([^}]*)\} from '\.\.\/dist\/aid\.js';/, 'const {$1} = AID;');
const out = `${title}\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${head}\n<script>${lib}</script>\n${body}`;
writeFileSync(process.argv[2] || 'demo/standalone.html', out);
console.log('written', (out.length / 1024).toFixed(1) + ' kB');
