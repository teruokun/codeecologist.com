// Checks the built site for TODO(jeff) placeholder copy.
//
// Fails if any placeholder reaches the built site (dist/), unless
// ALLOW_PLACEHOLDERS is "true". Placeholders in home.yaml that are not shown
// (fields marked "hidden until filled", and sections that stay hidden until
// their collection has a published entry) are listed as pending but do not
// fail: they are future content, not published copy. Publishing one of those
// sections while its copy is still a placeholder puts the TODO in dist/ and
// fails again.
//
// Usage: node scripts/check-placeholders.mjs [distDir]
// `npm run check` builds first, so dist/ is never stale.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = 'TODO(jeff)';
const root = fileURLToPath(new URL('..', import.meta.url));
const copyFile = join(root, 'src/content/site/home.yaml');
const distDir = resolve(root, process.argv[2] ?? 'dist');

if (!existsSync(distDir)) {
  console.log(`${relative(root, distDir) || distDir} not found. Run \`npm run build\` first.`);
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const shown = [];
for (const path of walk(distDir)) {
  if (!/\.(html|xml|txt|json|js|css)$/.test(path)) continue;
  const count = readFileSync(path, 'utf8').split(MARKER).length - 1;
  if (count > 0) shown.push(`${relative(root, path)}: ${count} occurrence(s)`);
}

const pending = [];
readFileSync(copyFile, 'utf8')
  .split('\n')
  .forEach((line, index) => {
    if (line.trimStart().startsWith('#')) return;
    if (line.includes(MARKER)) {
      pending.push(`${relative(root, copyFile)}:${index + 1}: ${line.trim()}`);
    }
  });

if (pending.length > 0) {
  console.log(`${pending.length} placeholder(s) in the copy file (pending; fine while not shown):\n`);
  for (const finding of pending) console.log(`  ${finding}`);
  console.log('');
}

if (shown.length === 0) {
  console.log('No TODO(jeff) placeholders in the built site.');
  process.exit(0);
}

console.log(`${shown.length} built file(s) show ${MARKER} placeholders:\n`);
for (const finding of shown) console.log(`  ${finding}`);

if (process.env.ALLOW_PLACEHOLDERS === 'true') {
  console.log('\nALLOW_PLACEHOLDERS=true: continuing. The site shows its draft banner.');
  process.exit(0);
}
console.log('\nFailing. Replace the placeholders, or set ALLOW_PLACEHOLDERS=true for a draft build.');
process.exit(1);
