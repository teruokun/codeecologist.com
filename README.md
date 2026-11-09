# codeecologist.com

Source for [codeecologist.com](https://codeecologist.com): a static site built
with [Astro](https://astro.build), plus the OpenTofu configuration for its DNS
and Cloudflare zone settings.

The site is not deployed yet, and its copy is placeholder text.

## Develop

Requires the Node.js version in [`.node-version`](.node-version).

```bash
npm ci
npm run dev       # local development server
npm run build     # build to dist/
npm run check     # type check, then list remaining TODO(jeff) placeholders
npm run preview   # serve the built site
```

`npm run check` fails while placeholder copy remains. Set
`ALLOW_PLACEHOLDERS=true` to build a draft, which shows a "draft site" banner
on every page.

## Layout

| Path | Contents |
|---|---|
| `src/content/site/home.yaml` | All homepage copy |
| `src/components/`, `src/layouts/`, `src/pages/` | Astro components and pages |
| `src/styles/` | Plain CSS; colour tokens in `tokens.css` |
| `public/_headers` | Security headers, including the Content-Security-Policy |
| `infra/` | OpenTofu for DNS, zone settings and redirects; see [`infra/README.md`](infra/README.md) |
| `docs/handoff/` | The original plan, DNS spec and design mockup |

Working rules for contributors and AI agents are in [`CLAUDE.md`](CLAUDE.md).
