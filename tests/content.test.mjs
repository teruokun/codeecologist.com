// Builds the site against fixture content and checks what is shown.
// Run with `npm test`. Fixtures live in tests/fixtures, never in src/content.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outRoot = join(root, 'tests/.tmp');
// Run Astro's entry point with this Node directly: node_modules/.bin/astro is
// a shell shim, which spawnSync cannot run on Windows without a shell.
const astro = join(root, 'node_modules/astro/bin/astro.mjs');

/**
 * Build with the given fixture set (or the real, empty content) into its own
 * directory. `siteCopy` replaces src/content/site/home.yaml.
 */
function build(name, fixture, { siteCopy } = {}) {
  const outDir = join(outRoot, name);
  const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' };
  if (fixture) env.CONTENT_ROOT = `tests/fixtures/${fixture}`;
  else delete env.CONTENT_ROOT;
  if (siteCopy) env.SITE_COPY = siteCopy;
  else delete env.SITE_COPY;
  const result = spawnSync(process.execPath, [astro, 'build', '--outDir', outDir], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
  const read = (file) => readFileSync(join(outDir, file), 'utf8');
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}${result.error ?? ''}`, outDir, read };
}

/** Every file under dir. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

/**
 * A copy of home.yaml with the given keys set, whatever they hold now, so a
 * test does not depend on which copy Jeff has filled in. Returns its path
 * relative to the root.
 */
function copyWith(name, values) {
  let yaml = readFileSync(join(root, 'src/content/site/home.yaml'), 'utf8');
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(String.raw`^(\s+${key}: ).*$`, 'm');
    assert.match(yaml, pattern, `home.yaml has a ${key} key`);
    yaml = yaml.replace(pattern, (_, prefix) => `${prefix}${JSON.stringify(value)}`);
  }
  mkdirSync(outRoot, { recursive: true });
  writeFileSync(join(outRoot, `${name}.yaml`), yaml);
  return `tests/.tmp/${name}.yaml`;
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

test('optional claims: empty ones are hidden, filled ones shown', () => {
  const hidden = build('claims-hidden', undefined, {
    siteCopy: copyWith('home-claims-hidden', { availability: '', response_time: '', business_name: '' }),
  });
  assert.ok(hidden.ok, hidden.output);
  const home = hidden.read('index.html');
  assert.ok(!home.includes('class="avail"'), 'no availability line');
  assert.ok(!home.includes('business day'), 'no response time');
  assert.ok(!/©[^<]*·\s*·/.test(home), 'no empty business name in the footer');

  const shown = build('claims-shown', undefined, {
    siteCopy: copyWith('home-claims-shown', {
      availability: 'Example availability',
      response_time: 'Example response time',
      business_name: 'Example LLC',
    }),
  });
  assert.ok(shown.ok, shown.output);
  const page = shown.read('index.html');
  for (const text of ['Example availability', 'Example response time', 'Example LLC']) {
    assert.ok(page.includes(text), `${text} is shown`);
  }
});

test('services: kinds of work and kinds of contract are separate lists', () => {
  const site = build('services');
  assert.ok(site.ok, site.output);
  const home = site.read('index.html');
  const start = home.indexOf('id="services"');
  const services = home.slice(start, home.indexOf('</section>', start));
  assert.ok(services.includes('class="two"') && services.includes('class="engagements"'));
  assert.ok(!services.includes('class="tag"'), 'service cards carry no pricing tag');
  assert.ok(!/on call|incident response/i.test(home), 'no on-call or incident-response offer');
  assert.ok(!home.includes('Standards work'), 'no standards-work claim');
});

/** Run the placeholder check against a build directory, without the override. */
function checkPlaceholders(outDir) {
  const env = { ...process.env };
  delete env.ALLOW_PLACEHOLDERS;
  const result = spawnSync(process.execPath, [join(root, 'scripts/check-placeholders.mjs'), outDir], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}` };
}

test('placeholders: hidden ones do not block, shown ones do', () => {
  // Hidden placeholders: a proof item marked hidden_until_filled, and the
  // headings of sections whose collections are empty.
  const hiddenCopy = copyWith('placeholders-hidden', {
    location: 'Seattle, WA',
  });
  let yaml = readFileSync(join(root, hiddenCopy), 'utf8');
  yaml = yaml.replace(
    /^  proof:\n/m,
    '  proof:\n    - lead: "TODO(jeff): hidden lead"\n      rest: "TODO(jeff): hidden rest"\n      hidden_until_filled: true\n',
  );
  yaml = yaml.replace(/^(  talks:\n    heading: ).*$/m, '$1"TODO(jeff): Talks"');
  writeFileSync(join(root, hiddenCopy), yaml);
  const hidden = build('placeholders-hidden', undefined, { siteCopy: hiddenCopy });
  assert.ok(hidden.ok, hidden.output);
  const hiddenCheck = checkPlaceholders(hidden.outDir);
  assert.ok(hiddenCheck.ok, hiddenCheck.output);

  // The same talks heading placeholder fails once a talk is published.
  const published = build('placeholders-published', 'published', { siteCopy: hiddenCopy });
  assert.ok(published.ok, published.output);
  const publishedCheck = checkPlaceholders(published.outDir);
  assert.ok(!publishedCheck.ok, 'a shown section heading placeholder must fail the check');

  // Any placeholder in always-shown copy fails.
  const shownCopy = copyWith('placeholders-shown', { location: 'TODO(jeff): Seattle, WA' });
  const shown = build('placeholders-shown', undefined, { siteCopy: shownCopy });
  assert.ok(shown.ok, shown.output);
  const shownCheck = checkPlaceholders(shown.outDir);
  assert.ok(!shownCheck.ok, 'a shown placeholder must fail the check');
  assert.match(shownCheck.output, /index\.html/);
});

test('contact: no form, no endpoint, no third-party script', () => {
  const siteCopy = copyWith('home-placeholders', {
    email: 'TODO(jeff): public contact email address',
    linkedin_url: 'TODO(jeff): LinkedIn profile URL',
    booking_url: 'TODO(jeff): Cal.com booking URL',
  });
  const site = build('contact-empty', undefined, { siteCopy });
  assert.ok(site.ok, site.output);
  const home = site.read('index.html');
  assert.ok(home.includes('id="contact"'), 'the contact section is always shown');
  assert.ok(!/<form[\s>]/.test(home), 'the homepage has no form');
  assert.ok(!home.includes('mailto:'), 'no mailto link while the address is a placeholder');
  assert.ok(!home.includes('cal.com'), 'no booking link while its URL is a placeholder');
  for (const file of walk(site.outDir)) {
    assert.ok(!readFileSync(file, 'utf8').includes('challenges.cloudflare.com'), `${file} mentions Turnstile`);
  }
  const csp = site.read('_headers').match(/Content-Security-Policy: (.*)/)[1];
  assert.match(csp, /form-action 'none'/);
  assert.match(csp, /script-src 'self';/);
});

test('contact: filled addresses link from the contact section and the footer', () => {
  const siteCopy = copyWith('home-filled', {
    email: 'hello@example.com',
    linkedin_url: 'https://www.linkedin.com/in/example',
    booking_url: 'https://cal.com/example/intro',
    github_url: 'https://github.com/example',
    buildwarden_url: 'https://github.com/example-org',
  });
  const site = build('contact-filled', undefined, { siteCopy });
  assert.ok(site.ok, site.output);
  const home = site.read('index.html');
  const contact = home.slice(home.indexOf('id="contact"'), home.indexOf('</section>', home.indexOf('id="contact"')));
  assert.ok(contact.includes('href="mailto:hello@example.com"'), 'contact links the email');
  assert.ok(contact.includes('href="https://www.linkedin.com/in/example"'), 'contact links LinkedIn');
  assert.ok(contact.includes('href="https://cal.com/example/intro"'), 'contact links the booking page');
  const footer = home.slice(home.indexOf('<footer'));
  assert.ok(footer.includes('href="mailto:hello@example.com"'), 'footer links the same email');
  assert.ok(footer.includes('href="https://www.linkedin.com/in/example"'), 'footer links the same LinkedIn');
  assert.ok(footer.includes('href="https://github.com/example"'), 'footer links GitHub');
  assert.ok(footer.includes('href="https://github.com/example-org"'), 'footer links the BuildWarden org');
});
