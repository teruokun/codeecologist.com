// Lists every remaining TODO(jeff) placeholder in the homepage copy and in the
// built site. Exits 1 if any remain, unless ALLOW_PLACEHOLDERS is "true".
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const MARKER = 'TODO(jeff)';
const root = new URL('..', import.meta.url).pathname;
const copyFile = join(root, 'src/content/site/home.yaml');
const distDir = join(root, 'dist');

const findings = [];

readFileSync(copyFile, 'utf8')
  .split('\n')
  .forEach((line, index) => {
    if (line.trimStart().startsWith('#')) return;
    if (line.includes(MARKER)) {
      findings.push(`${relative(root, copyFile)}:${index + 1}: ${line.trim()}`);
    }
  });

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

if (existsSync(distDir)) {
  for (const path of walk(distDir)) {
    if (!/\.(html|xml|txt|json|js|css)$/.test(path)) continue;
    const count = readFileSync(path, 'utf8').split(MARKER).length - 1;
    if (count > 0) {
      findings.push(`${relative(root, path)}: ${count} occurrence(s)`);
    }
  }
} else {
  console.log('dist/ not found: scanned the copy file only (run `npm run build` first).');
}

if (findings.length === 0) {
  console.log('No TODO(jeff) placeholders remain.');
  process.exit(0);
}

console.log(`${findings.length} place(s) still contain ${MARKER}:\n`);
for (const finding of findings) console.log(`  ${finding}`);

if (process.env.ALLOW_PLACEHOLDERS === 'true') {
  console.log('\nALLOW_PLACEHOLDERS=true: continuing. The site shows its draft banner.');
  process.exit(0);
}
console.log('\nFailing. Replace the placeholders, or set ALLOW_PLACEHOLDERS=true for a draft build.');
process.exit(1);
