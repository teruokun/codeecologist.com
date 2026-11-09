// Builds the site against fixture content and checks what is shown.
// Run with `npm test`. Fixtures live in tests/fixtures, never in src/content.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';

const root = new URL('..', import.meta.url).pathname;
const outRoot = join(root, 'tests/.tmp');
const astro = join(root, 'node_modules/.bin/astro');

/** Build with the given fixture set (or the real, empty content) into its own directory. */
function build(name, fixture) {
  const outDir = join(outRoot, name);
  const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' };
  if (fixture) env.CONTENT_ROOT = `tests/fixtures/${fixture}`;
  else delete env.CONTENT_ROOT;
  const result = spawnSync(astro, ['build', '--outDir', outDir], { cwd: root, env, encoding: 'utf8' });
  const read = (file) => readFileSync(join(outDir, file), 'utf8');
  return { ok: result.status === 0, output: result.stdout + result.stderr, outDir, read };
}

after(() => rmSync(outRoot, { recursive: true, force: true }));

test('empty collections: no sections, nav links or feed link', () => {
  const site = build('empty');
  assert.ok(site.ok, site.output);
  const home = site.read('index.html');
  for (const id of ['talks', 'writing', 'news']) {
    assert.ok(!home.includes(`id="${id}"`), `homepage must not have a #${id} section`);
    assert.ok(!home.includes(`href="/#${id}"`), `nav must not link to #${id}`);
    const index = site.read(`${id}/index.html`);
    assert.ok(index.includes('Nothing here yet'), `/${id}/ should say it is empty`);
    assert.ok(index.includes('name="robots" content="noindex"'), `/${id}/ should be noindex`);
  }
  assert.ok(!home.includes('rss.xml'), 'an empty feed must not be linked');
  const feed = site.read('rss.xml');
  assert.ok(feed.includes('<rss') && !feed.includes('<item>'), 'the empty feed is still valid RSS');
});

test('published entries: sections, nav links, pages and feed appear', () => {
  const site = build('published', 'published');
  assert.ok(site.ok, site.output);
  const home = site.read('index.html');
  for (const id of ['talks', 'writing', 'news']) {
    assert.ok(home.includes(`id="${id}"`), `homepage should have a #${id} section`);
    assert.ok(home.includes(`href="/#${id}"`), `nav should link to #${id}`);
    assert.ok(!site.read(`${id}/index.html`).includes('noindex'), `/${id}/ should be indexable`);
  }
  assert.ok(home.includes('Fixture talk') && home.includes('Fixture essay'));
  assert.ok(home.includes('href="https://example.com/fixture"'), 'linked news goes to its link');
  assert.ok(existsSync(join(site.outDir, 'writing/fixture-essay/index.html')));
  assert.ok(existsSync(join(site.outDir, 'news/fixture-news/index.html')));
  assert.ok(!existsSync(join(site.outDir, 'news/fixture-linked/index.html')));
  assert.ok(home.includes('application/rss+xml'), 'feed is linked from the head');
  const feed = site.read('rss.xml');
  assert.equal(feed.split('<item>').length - 1, 3, 'feed has the essay and both news items');
  assert.ok(feed.indexOf('Fixture essay') < feed.indexOf('Fixture linked news'), 'newest first');
});

test('drafts are never shown', () => {
  const published = build('published-drafts', 'published');
  assert.ok(!published.read('index.html').includes('Fixture draft essay'));
  assert.ok(!published.read('rss.xml').includes('Fixture draft essay'));
  assert.ok(!existsSync(join(published.outDir, 'writing/fixture-draft/index.html')));

  const site = build('draft', 'draft');
  assert.ok(site.ok, site.output);
  const home = site.read('index.html');
  assert.ok(!home.includes('id="news"'), 'a collection of only drafts shows no section');
  assert.ok(!home.includes('Fixture news item'));
  assert.ok(!site.read('rss.xml').includes('<item>'));
});

test('a talk dated in the future fails the build', () => {
  const site = build('future-talk', 'future-talk');
  assert.ok(!site.ok, 'the build must fail');
  assert.match(site.output, /Only talks already given may be listed/);
});
