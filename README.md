# codeecologist.com

Source for [codeecologist.com](https://codeecologist.com): a static site built
with [Astro](https://astro.build), plus the OpenTofu configuration for its DNS
and Cloudflare zone settings.

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/teruokun/codeecologist.com/badge)](https://scorecard.dev/viewer/?uri=github.com/teruokun/codeecologist.com)

Every deploy publishes an SBOM and signed build provenance for every file.
[codeecologist.com/supply-chain](https://codeecologist.com/supply-chain)
explains how to verify them. To report a vulnerability, see
[`SECURITY.md`](SECURITY.md).

## Develop

Requires the Node.js version in [`.node-version`](.node-version).

```bash
npm ci
npm run dev       # local development server
npm run build     # build to dist/
npm run check     # type check, build, then check for TODO(jeff) placeholders
npm run preview   # serve the built site
npm test          # build against fixture content and check what is shown
```

`npm run check` fails while placeholder copy appears in the built site.
Placeholders that are not shown (hidden-until-filled fields, and sections
that stay hidden until they have a published entry) are listed as pending but
don't fail. Set `ALLOW_PLACEHOLDERS=true` to build a draft with shown
placeholders, which adds a "draft site" banner on every page.

## Layout

| Path | Contents |
|---|---|
| `src/content/site/home.yaml` | All homepage copy |
| `src/content/{talks,essays,news}/` | Markdown entries. A section appears on the site only once it has an entry that is not a draft |
| `src/components/`, `src/layouts/`, `src/pages/` | Astro components and pages |
| `src/styles/` | Plain CSS; colour tokens in `tokens.css` |
| `tests/` | Build-based tests and their fixture content |
| `public/_headers` | Security headers, including the Content-Security-Policy |
| `infra/` | OpenTofu for DNS, zone settings, redirects and the Pages project; see [`infra/README.md`](infra/README.md) |
| `.github/workflows/` | `ci` (pull requests), `deploy` (build, attest, verify, deploy on `main`), `scorecard` |
| `deploy/` | Wrangler with its own lockfile, installed only by the deploy job |
| `scripts/` | Placeholder check and the checksums file for attestation |
| `docs/handoff/` | The original plan, DNS spec and design mockup |

Working rules for contributors and AI agents are in [`CLAUDE.md`](CLAUDE.md).
