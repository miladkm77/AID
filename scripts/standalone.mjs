// Builds a single-file demo (library inlined) for sharing without a server.
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync('demo/index.html', 'utf8');
const lib = readFileSync('dist/aid.min.js', 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(title, '').replace(/<meta[^>]*>\s*/g, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1].replace("import '../dist/aid.js';", '');
const out = `${title}\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${head}\n<script>${lib}</script>\n${body}`;
writeFileSync(process.argv[2] || 'demo/standalone.html', out);
console.log('written', (out.length / 1024).toFixed(1) + ' kB');
