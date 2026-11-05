// Assembles the static site in docs/ (served by GitHub Pages): library + lab.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
copyFileSync('dist/aid.js', 'docs/aid.js');
const lab = readFileSync('demo/index.html', 'utf8').replace("import '../dist/aid.js';", "import './aid.js';");
writeFileSync('docs/lab.html', lab);
console.log('docs/ ready');
