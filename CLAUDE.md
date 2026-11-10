# CLAUDE.md: codeecologist.com

This is the website and infrastructure for **Jeff, an independent consultant in Seattle** ("code ecologist": software supply chain security, dependency and package-ecosystem health, build provenance). Jeff maintains BuildWarden (https://github.com/buildwarden/buildwarden, Apache-2.0).

The site is also a **portfolio piece**: its own supply chain must be exemplary *and simple enough to explain on one page*. Every choice here should be one Jeff would defend in front of a client.

Planning docs (in the handoff package; copy them into `docs/handoff/` in the first PR): `PLAN.md`, `infra/dns-records.md`, `SECRETS.md`, `VERIFY.md`, `design/mockup.html`.

## Stack

- **Astro** (static output, current major; **VERIFY** the version at scaffold time and pin it exactly) with content collections in `src/content.config.ts` (`glob` loader from `astro/loaders`, `z` from `astro/zod`). https://docs.astro.build/en/guides/content-collections/
- `@astrojs/rss` for `/rss.xml` (essays + news)
- **Cloudflare Pages** with Direct Upload from GitHub Actions via `wrangler pages deploy`. Cloudflare's git integration is **not** used.
- **No server code.** There is no contact form, so there are no Pages Functions, no Turnstile and no mail-sending credential. Contact is a `mailto:` link, LinkedIn and a Cal.com link-out (decided 2026-11-09, Phase 5).
- **OpenTofu** in `infra/`, with the `cloudflare/cloudflare` provider v5 pinned exactly and `.terraform.lock.hcl` committed.
- No CSS framework, no web fonts, no client-side framework. Plain CSS with tokens from the mockup. Use only the minimum JS: the theme toggle, and an optional load-on-click Cal.com embed.

## Layout

```
src/
  content.config.ts      # collections: talks, essays, news, site (copy)
  content/{talks,essays,news}/*.md
  content/site/home.yaml # ALL homepage copy, TODO-marked
  components/  layouts/  pages/  styles/tokens.css
  lib/published.ts       # getPublished(name): non-draft entries, sorted
public/_headers          # security headers (CSP etc.)
deploy/                  # wrangler, with its own lockfile; deploy job only
scripts/checksums.sh     # dist/.well-known/site-checksums.txt for attestation
infra/                   # OpenTofu; state is local + gitignored
.github/workflows/{ci,deploy,scorecard}.yml
.github/dependabot.yml
```

## Commands

```
npm ci                      # always; never `npm install` in CI
npm run dev                 # local dev
npm run build               # astro build -> dist/
npm run check               # astro check + build + placeholder scan of dist/
npm run preview             # astro preview (serves dist/)
cd infra && tofu init -lockfile=readonly && tofu plan -out=plan.bin
tofu apply plan.bin         # ONLY after Jeff approves the plan output
```

## Supply-chain rules (non-negotiable)

1. **Lockfile committed** (`package-lock.json`). CI uses `npm ci`. `.npmrc` contains `save-exact=true` and `engine-strict=true`, and tries `ignore-scripts=true`. If a dependency truly needs an install script, document why in `.npmrc` comments and the PR.
2. **Exact versions** in `package.json` (no `^`/`~`). Node pinned in `.node-version` and `engines`.
3. **New dependencies need justification** in the PR description: what it does, why built-ins aren't enough, maintainer and download health, transitive count (`npm ls --all | wc -l` before and after). The default answer is no. Jeff approves every new runtime or dev dependency.
4. **GitHub Actions pinned by full 40-char commit SHA**, with a version comment: `uses: actions/checkout@<sha> # v6.0.0`. Resolve with `gh api repos/OWNER/REPO/commits/vX.Y.Z --jq .sha`. Peeling the ref this way avoids pinning an annotated-tag object SHA. No tags, no branches, no unpinned `docker://`.
5. **Least-privilege tokens.** Every workflow has `permissions: {}` at top level, and each job grants only what it needs. Never use `pull_request_target`. Never interpolate `${{ github.event.* }}` into `run:`; pass it through `env:`. Secrets live only in the `production` environment (limited to `main`).
6. **The build job never sees the Cloudflare token.** Build, SBOM and attest run in one job. Deploy runs in a separate job that downloads the artifact, **verifies its attestation**, then deploys.
7. **Updates via Dependabot** (npm, github-actions, terraform), grouped weekly, with a cooldown so new releases age a few days before adoption (Dependabot `cooldown`, **VERIFY** syntax). Review release notes; don't auto-merge.
8. **SBOM:** `npm sbom --sbom-format=cyclonedx --sbom-type=application`, published at `/.well-known/sbom.cdx.json` (stable URL) and attested.
9. **Provenance:** `actions/attest` (successor to `attest-build-provenance`, which is now a wrapper) over a checksums file covering every file in `dist/`. Visitors verify with `gh attestation verify <file> -R OWNER/codeecologist.com`.
10. **Served bytes must equal built bytes.** Keep Cloudflare Email Obfuscation, Rocket Loader and analytics injection **off** (Tofu-managed).
11. **No third-party JS or requests at all.** Cal.com is a link-out. Adding a form, an endpoint or any third-party script reopens the Phase 5 decision and needs Jeff's approval.
12. **Signed commits on `main`.** Claude works on branches and opens PRs. Jeff merges in the GitHub UI, and GitHub signs those merge commits. Tags are created and signed by Jeff.
13. **No secrets in Tofu state or code.** Pages secrets are set with `wrangler pages secret put`, not in Tofu.

## Content rules (non-negotiable)

- **Never invent claims**: no clients, metrics, certifications, testimonials, availability, response times, prices, standards-body roles or quotes. If the mockup shows such a claim, it becomes a `TODO(jeff)` placeholder.
- **Talks:** only talks **actually given**. The schema requires `date <= build date` and fails the build otherwise. There is no "proposed", "upcoming" or "accepted" status, ever. (The mockup's "Proposed" rows are layout examples only. Do not ship them.)
- **Essays:** Jeff writes them. Never draft, expand, summarize or paraphrase essay text, including the BuildWarden philosophy essay. Claude may create empty stub files with frontmatter and `draft: true` when asked.
- **Editing:** Jeff wants to keep his own voice. If asked about copy, give inline suggestions or comments, not rewrites.
- **Placeholders:** all homepage and service copy lives in `src/content/site/home.yaml`. Each placeholder value starts with `TODO(jeff):`. `npm run check` builds the site and lists them. The production deploy fails while any placeholder appears in the built site, unless the repo variable `ALLOW_PLACEHOLDERS=true` is set (which also shows a "draft site" banner). Placeholders that are not rendered (fields marked hidden until filled, and the Talks, Writing and News copy while those sections are hidden) are listed as pending and don't block a deploy (decided 2026-11-10).
- Facts Jeff has confirmed and may appear (in his final wording): 15 years as a senior engineer at Amazon; BuildWarden maintainer; biology background; based in Seattle.
- Every collection entry supports `draft: true`. Homepage Talks, Writing and News sections (and their nav links) render **only if** the collection has at least one non-draft entry.

## Deploy

Push or merge to `main` → `deploy.yml`: build → SBOM → checksums → attest → upload artifact → (job `deploy`, env `production`) download → `gh attestation verify` → `npx wrangler pages deploy dist --project-name=<PROJECT> --branch=main`. Wrangler comes from its own lockfile in `deploy/` (installed only by the deploy job, so it is never in the site build or SBOM), not `wrangler-action`. The deploy job also checks every file in the artifact against the attested checksums, and that no unlisted file is present. Infra changes are **not** applied by CI. They're applied locally by `tofu apply` after Jeff approves the plan.

## Needs Jeff's explicit approval

- Any `tofu apply`, and any DNS, MX or DMARC policy change (paste the plan and wait for "approve")
- Adding or removing a dependency or GitHub Action
- Changing workflow permissions, branch protection, CSP, HSTS values, or the Pages config
- Publishing any copy (removing a `TODO(jeff)`), setting `draft: false`, or adding a talk
- Anything touching email delivery (Fastmail), or sending test mail to anyone except Jeff
- Creating or rotating secrets (Jeff does it; Claude gives exact commands)
- Opening PRs or issues in other repos (e.g. buildwarden)
