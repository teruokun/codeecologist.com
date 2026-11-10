# Implementation plan

How to work: one phase per PR, or per approval for infra. At the end of each phase, post the acceptance-check output to Jeff and wait for his OK before starting the next. Tofu is always run as `plan`, then shown to Jeff, then `apply`. Anything marked **VERIFY** must be checked against live docs or tools before relying on it.

Variables used below: `OWNER` = Jeff's GitHub username, `REPO` = `OWNER/codeecologist.com`, `PROJECT` = Cloudflare Pages project (`codeecologist`), `ZONE_COM`/`ZONE_DEV` = zone IDs.

---

## Phase 0: Preflight (read-only)

Steps
1. Confirm repo access: `gh repo view REPO --json name,visibility,defaultBranchRef` (expect public, empty or README-only). `gh auth status`.
2. Confirm the token without printing it: `curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify | jq .result.status` → `"active"`.
3. Zones are active: `curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "https://api.cloudflare.com/client/v4/zones?name=codeecologist.com" | jq '.result[0]|{id,status,name_servers}'` (repeat for .dev). Expect `status: "active"`.
4. Permission probes (GET only): list DNS records, `GET /zones/$Z/settings/ssl`, `GET /zones/$Z/rulesets/phases/http_request_dynamic_redirect/entrypoint` (a 404 is fine; a 403 is not), `GET /accounts/$ACCT/pages/projects`, `GET /accounts/$ACCT/challenges/widgets` (Turnstile; **VERIFY** the path).
5. Inventory the existing records: export both zones (`GET /zones/$Z/dns_records/export`) to `infra/snapshots/<zone>-<date>.txt`. This is the baseline, and is used for rollback.
6. Check DNSSEC and registrar state: `dig +short DS codeecologist.com @1.1.1.1`, `dig +dnssec codeecologist.com SOA`. If there's no DS, ask Jeff to click Enable DNSSEC in Registrar (manual) and continue; it takes 1-2 days.
7. Check tool versions: `tofu version`, `node --version`, `gh --version`.

Acceptance: every probe returns 200 (or the expected 404); the zone snapshot is saved; there's a list of missing permissions (should be empty) and of manual items still pending.
Rollback: n/a (read-only).

---

## Phase 1: DNS and zone hardening via OpenTofu

Files: `infra/versions.tf`, `providers.tf`, `variables.tf`, `zones.tf` (data sources), `settings.tf`, `caa.tf`, `redirects.tf`, `imports.tf`, `.terraform.lock.hcl`, `infra/README.md`; `.gitignore` adds `infra/.terraform/`, `*.tfstate*`, `plan.bin`, `*.tfvars`.

Steps
1. `versions.tf`: `required_providers { cloudflare = { source = "cloudflare/cloudflare", version = "= 5.x.y" } }`. Use the latest 5.x; v5.20.0 was current as of 2026-06 (**VERIFY** a newer release and read its changelog). `required_version` pins OpenTofu's minor version.
2. `tofu init`, then `tofu providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=windows_amd64` (covers the CI/session Linux host plus Jeff's Apple-silicon Mac and x86_64 Windows PC). Commit the lock file.
3. Resources (v5 names; **VERIFY** attribute shapes against registry docs at the pinned version):
   - `cloudflare_zone_setting` for each setting in the dns-records.md table: `ssl=strict`, `min_tls_version=1.2`, `tls_1_3=on`, `always_use_https=on`, `automatic_https_rewrites=on`, `email_obfuscation=off`, `rocket_loader=off`, on both zones. **HSTS is Phase 7.**
   - `cloudflare_dns_record` for CAA on both zones. Apply CAA before anything that issues certificates.
   - `cloudflare_dns_record` for .dev placeholders (A/AAAA/www) and .dev null MX, SPF, DMARC, `*._domainkey`. These are safe now because .dev has no mail.
   - `cloudflare_ruleset` (zone, phase `http_request_dynamic_redirect`) for `.dev` → `.com` and `www.codeecologist.com` → apex. Both are in dns-records.md.
4. **Imports:** for any record that already exists (Registrar or Pages may have auto-created some), add `import { to = cloudflare_dns_record.x  id = "<zone_id>/<record_id>" }` blocks in `imports.tf` (**VERIFY** the v5 import ID format in the resource docs). For an existing redirect entrypoint ruleset, import with `zones/<zone_id>/<ruleset_id>` (**VERIFY**). Use `tofu plan -generate-config-out=generated.tf` to bootstrap config for imported resources, then hand-tidy it.
5. **State:** local `infra/terraform.tfstate`, gitignored. It holds no secrets by design, because the API token comes from `CLOUDFLARE_API_TOKEN` env. Back it up after each apply: `cp terraform.tfstate ~/Backups/codeecologist-tfstate-$(date +%F).json`, or Jeff stores it in his password manager. Everything is also re-importable from the API, so losing state is an inconvenience, not an outage. Upgrade path, if Jeff wants it later: OpenTofu state encryption plus an R2 backend (**VERIFY**). Not needed now.
6. Manual items (dashboard only; Jeff does these in his runbook, and Claude verifies): registrar lock, auto-renew, Registrar one-click DNSSEC, domain purchase.

Verify
```
tofu plan -detailed-exitcode   # after apply: exit 0, no drift
dig +short CAA codeecologist.com @1.1.1.1      # includes the 3 issue + 3 issuewild (plus hidden CF-added CAs)
dig +short MX codeecologist.dev                # "0 ."
dig +short TXT codeecologist.dev               # "v=spf1 -all"
dig +short TXT _dmarc.codeecologist.dev
curl -sI http://codeecologist.dev/x?y=1        # 301 to https (Always Use HTTPS)
curl -sI https://codeecologist.dev/x?y=1       # 301 Location: https://codeecologist.com/x?y=1
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" .../zones/$ZONE_COM/settings/ssl | jq .result.value   # "strict"
dig +dnssec +short DS codeecologist.com @1.1.1.1  # once Jeff has enabled DNSSEC
```
The apex of .com won't serve a site until Phase 6. That's expected.

Rollback: `git revert` the Tofu change and `tofu apply`, or `tofu destroy -target=...` for a newly added resource. For zone settings, reapply the previous value. The Phase 0 snapshot is the reference.

---

## Phase 2: Email DNS (Fastmail) and verification

Prereq (Jeff): Fastmail account exists, `codeecologist.com` has been added in Fastmail, aliases `dmarc-reports@` and `security@` exist, and Jeff has shared the **values shown in Fastmail > Settings > Domains** (paste or screenshot). Those values win over dns-records.md.

Files: `infra/mail.tf`.

Steps
1. Diff Fastmail's displayed values against `infra/dns-records.md`. Report any difference to Jeff before writing Tofu.
2. Add MX ×2, SPF, DKIM CNAME ×3 (**proxied=false**), DMARC stage 1, the `codeecologist.dev._report._dmarc` auth record, and the optional SRV set.
3. Check that **Cloudflare Email Routing is disabled** on both zones (dashboard or API GET). Never enable it.
4. `tofu plan` → Jeff approves → `apply`.
5. Jeff clicks "Check now" (or equivalent) in Fastmail's domain screen.

Verify
```
dig +short MX codeecologist.com                       # 10 in1-smtp..., 20 in2-smtp...
dig +short TXT codeecologist.com | grep spf1
for s in fm1 fm2 fm3; do dig +short CNAME $s._domainkey.codeecologist.com; dig +short TXT $s._domainkey.codeecologist.com | head -c 80; echo; done
dig +short TXT _dmarc.codeecologist.com
```
Then: Fastmail shows the domain as verified, with DKIM active. Jeff sends a message from jeff@codeecologist.com to a Gmail address and checks "Show original": SPF pass, DKIM pass (d=codeecologist.com), DMARC pass. Jeff also does a mail-tester style check (VERIFY.md).

Rollback: remove the MX records (inbound mail then bounces back to senders, so warn Jeff first) or revert DMARC to the previous stage. Keep DKIM records; they're harmless.

DMARC ramp (backlog with dates): stage 2 at +2 weeks and stage 3 at +4 weeks, **only after Jeff reviews the aggregate reports**. Use `send_later`/scheduled reminders only if Jeff asks.

---

## Phase 3: Site scaffold from the mockup

Files: `package.json`, `package-lock.json`, `.npmrc`, `.node-version`, `astro.config.mjs` (`output: 'static'`, `site: 'https://codeecologist.com'`), `src/layouts/Base.astro`, `src/styles/tokens.css`, `src/components/*`, `src/pages/index.astro`, `src/pages/404.astro`, `src/content/site/home.yaml`, `public/_headers`, `public/robots.txt`, `public/.well-known/security.txt`, `docs/handoff/*`.

Steps
1. Scaffold Astro manually (or with `npm create astro@<exact> -- --template minimal`; check what it installs and remove extras). Pin exact versions. Set `.npmrc` per CLAUDE.md.
2. Port `design/mockup.html` into components: `Nav`, `Hero`, `Services`, `ProofStrip`, `Talks`, `Writing`, `News`, `OpenSource`, `Contact`, `Footer`. Port the color tokens verbatim from the mockup's `:root` and dark block. Also add `:root[data-theme="dark"]` so a toggle can force dark (the mockup only handles forced light). Add a small theme toggle that remembers the choice in `localStorage` inside try/catch.
3. Fix the mockup gaps:
   - mobile nav (the mockup hides `.links` under 760px with no replacement; use a `<details>` menu, no JS)
   - `<label for>`/`id` on every form control
   - visible `:focus-visible` styles
   - `prefers-reduced-motion`
   - skip link
   - `lang`, meta description, canonical, OG tags
   - remove the "Layout mockup" banner and the `.ph` outlines, replacing them with the placeholder banner logic
4. **All copy into `home.yaml`** as `TODO(jeff): <mockup text>`, including hero, services, proof strip, section subtitles, footer business name, and availability line. The proof-strip "Standards work: OpenSSF, SLSA, CycloneDX/SPDX" item and "2 days/week available" are **unconfirmed claims**: keep them as TODO and **don't render them unless Jeff fills them in**. "Reply within a business day" is also TODO.
5. `public/_headers`, starting point:
   ```
   /*
     Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self'; img-src 'self' data:; style-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
     Cross-Origin-Opener-Policy: same-origin
   ```
   Astro may emit inline scripts or styles. If it does, either configure it to emit external files or use hashes; **don't** add `'unsafe-inline'`. Turnstile host requirements: **VERIFY** at https://developers.cloudflare.com/turnstile/reference/content-security-policy/. HSTS comes from the zone setting, not `_headers`.
6. `npm run check` = `astro check` + `astro build` + `scripts/check-placeholders.mjs` (fails on `TODO(jeff)` in `dist/`; lists the rest of `home.yaml` as pending; updated 2026-11-10).

Verify: `npm ci && npm run build && npm run preview`. Layout matches the mockup at 375px and 1280px, in light and dark mode. No requests to third-party hosts on load (DevTools network panel, or `grep -rE 'https?://' dist | grep -v codeecologist`). No console errors. axe or Lighthouse accessibility ≥ 95 locally.
Rollback: revert the PR (nothing has been deployed yet).

---

## Phase 4: Content collections, hide-empty logic, RSS

Files: `src/content.config.ts`, `src/lib/published.ts`, `src/content/{talks,essays,news}/.gitkeep`, `src/pages/{talks,writing,news}/index.astro`, `src/pages/writing/[...slug].astro`, `src/pages/news/[...slug].astro`, `src/pages/rss.xml.ts`, `scripts/check-talks.mjs` (or a Zod refinement).

Schemas (`z` from `astro/zod`):
- `talks`: `title`, `event`, `location?`, `date` (coerce.date, **refine: `<= new Date()`, error "Only talks already given may be listed"**), `slidesUrl?` (url), `videoUrl?` (url), `abstract?`, `draft` (default false).
- `essays`: `title`, `description`, `pubDate`, `updatedDate?`, `draft` (default false), `ogImage?`.
- `news`: `title`, `date`, `link?`, `draft` (default false).
- `site`: `file()` loader over `home.yaml`.

Steps
1. `getPublished(name)` = `getCollection(name, ({data}) => data.draft !== true)`, sorted by date descending. getCollection order is non-deterministic, so the sort is required.
2. The homepage section and its nav link render only if `getPublished(...).length > 0`. Index pages also exist, but when empty they show "Nothing here yet", carry `<meta name="robots" content="noindex">`, and aren't linked.
3. RSS at `/rss.xml` via `@astrojs/rss`: merged essays + news, non-draft, sorted. Add `<link rel="alternate" type="application/rss+xml">` to the head and the footer RSS link (show the link only if the feed has items).
4. Create **no content entries**. For tests, use fixtures under `tests/fixtures/` or a temp dir, never `src/content`. Exception: if Jeff asks, an `essays/buildwarden-philosophy.md` stub with frontmatter only and `draft: true`.
5. Per-post OG images: backlog.

Verify
- With the empty collections, the build has no Talks, Writing or News on the homepage or in the nav: `grep -c 'id="talks"' dist/index.html` → 0.
- Fixture test: add one non-draft news entry in a test branch, and the section appears. Mark it `draft: true` and it disappears.
- A future-dated talk fixture makes `npm run build` **fail**.
- `curl -s localhost:8788/rss.xml | xmllint --noout -` is valid. An empty feed is valid and isn't linked.

Rollback: revert the PR.

---

## Phase 5: Contact form + Turnstile

> **Superseded 2026-11-09: no contact form.** Jeff chose a `mailto:` link, LinkedIn and the Cal.com link-out instead. That removes the Pages Function, the Turnstile widget (whose secret the Cloudflare provider would also have put in Tofu state, against CLAUDE.md rule 13) and the mail-sending key. Phase 5 now consists of: the contact section with those three links, removing `challenges.cloudflare.com` from the CSP and setting `form-action 'none'`. The original plan below is kept for reference only.

Files: `functions/api/contact.ts`, `src/components/Contact.astro`, `infra/turnstile.tf` (or a manual widget plus import), `wrangler.toml` (Pages config: `pages_build_output_dir = "dist"`, `compatibility_date` pinned).

Delivery decision. **Recommendation: Option B** (Jeff to confirm):

| | A: Fastmail JMAP `Email/import` into Inbox | B: transactional email API (e.g. Resend; Postmark as alternate), send-only key |
|---|---|---|
| Token scope | Fastmail "Email" scope = **read/edit/delete the entire mailbox** (submission isn't needed for import). No narrower option exists. https://www.fastmail.help/hc/en-us/articles/5254602856719 | Sending-only key restricted to one sending domain (**VERIFY** current Resend permissions: https://resend.com/docs/dashboard/api-keys) |
| Blast radius if the Pages secret leaks | All client mail exposed | Attacker can send mail from `<sub>.codeecologist.com` until the key is revoked |
| New vendor / DNS | None | One vendor; SPF/DKIM records on a dedicated subdomain (values from the provider) |
| Deliverability | Perfect (no SMTP; the message is written straight to the mailbox) | Good; message arrives From `form@<sub>` with Reply-To set to the visitor |
| Code | JMAP session → upload blob → `Email/import` (https://fastmail.com/dev/, https://jmap.io) | One HTTPS POST |

Why B: a public endpoint should never hold a credential that can read a consultant's client mail. Option A is acceptable only if Jeff explicitly accepts that risk to avoid a vendor. Either way the Function code is dependency-free (`fetch` only). A "hosted form service" posting directly from the browser (Formspree-style) is rejected: it loads a third party into the form path and bypasses our Turnstile check.

Steps
1. Turnstile widget: mode `managed`, domains `["codeecologist.com"]` (add `localhost` only in a separate dev widget, or use Cloudflare's test keys locally: **VERIFY** the test-key values in the Turnstile docs).
2. Client: plain `<form method="post" action="/api/contact">` that works without JS (302 back to `/contact/thanks` or `?sent=1`). Progressive enhancement does fetch + inline status. Load the Turnstile script only on form focus or intersection. Add a honeypot field and the `cf-turnstile` div with `data-action="contact"`.
3. Function: accept POST only, with `Content-Type` form or JSON; enforce size ≤ 10 KB; validate fields (name ≤ 200, email format, topic from enum, message ≤ 5000); reject if the honeypot is filled; call `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response` and `remoteip` (`CF-Connecting-IP`); require `success`, `hostname === "codeecologist.com"` and `action === "contact"` (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). Then deliver to `env.CONTACT_TO` with Reply-To set to the visitor. Return generic errors and log no message bodies. Optional: per-IP rate limit (**VERIFY** Pages Functions rate limiting binding, or skip).
4. Jeff sets the secrets (SECRETS.md #4-6). Claude gives him the exact `wrangler pages secret put` commands.
5. If Option B: add the provider's sending-subdomain DNS records to `infra/mail.tf` (values copied from the provider), then plan → approve → apply.

Verify
```
curl -s -o /dev/null -w '%{http_code}\n' -X GET https://codeecologist.com/api/contact            # 405
curl -s -X POST https://codeecologist.com/api/contact -d 'name=x&email=x@example.com&message=hi'   # 400/403: missing token
```
A real browser submission arrives in Jeff's inbox with the correct Reply-To. A replayed token fails (`timeout-or-duplicate`). Test on mobile.
Rollback: hide the form behind a build flag and leave the plain `mailto:` link and Cal.com link. Revoke the delivery key.

---

## Phase 6: CI/CD, SBOM, provenance, Scorecard

Files: `.github/workflows/ci.yml`, `deploy.yml`, `scorecard.yml`, `.github/dependabot.yml`, `SECURITY.md`, `src/pages/supply-chain.astro`, `scripts/checksums.sh`, `infra/pages.tf`.

Steps
1. Pages project (Tofu `cloudflare_pages_project`, Direct Upload, production branch `main`, **no** git source), `cloudflare_pages_domain` for `codeecologist.com`, then the apex CNAME (import it if auto-created). Alternative: `npx wrangler pages project create PROJECT --production-branch=main`, then import.
2. Resolve every action to a SHA (CLAUDE.md rule 4). Expected set: `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `actions/download-artifact`, `actions/attest`, `ossf/scorecard-action`, `github/codeql-action/upload-sarif`. Optional: `step-security/harden-runner` in audit mode (adds a vendor; ask Jeff).
3. `ci.yml` (pull_request + push to non-main): `permissions: {}`; job `contents: read`; `npm ci` → `npm run check` (includes the build) → `npm sbom ...` (smoke). No secrets. Also `tofu fmt -check` and `tofu validate` (no credentials needed).
4. `deploy.yml` (push to `main`, plus `workflow_dispatch`), with `permissions: {}` at the top:
   - job `build`: permissions `contents: read, id-token: write, attestations: write, artifact-metadata: write` (the last one is from the actions/attest README; **VERIFY** it's still required). Steps: checkout (`persist-credentials: false`) → setup-node (`node-version-file`, `cache: npm`) → `npm ci` → `npm run check` (builds `dist/`, then fails on placeholders shown in it unless `vars.ALLOW_PLACEHOLDERS == 'true'`; updated 2026-11-10, so no separate `npm run build` step is needed) → `npm sbom --sbom-format=cyclonedx --sbom-type=application > dist/.well-known/sbom.cdx.json` → `scripts/checksums.sh` writes `dist/.well-known/site-checksums.txt` (`sha256sum` of every file in dist except itself, sorted, paths relative). Keep this under 1024 entries, the actions/attest subject limit. Then:
     ```yaml
     - uses: actions/attest@<sha> # v4.x
       with:
         subject-checksums: dist/.well-known/site-checksums.txt
     - uses: actions/attest@<sha> # v4.x   (SBOM attestation, subject = checksums file)
       with:
         subject-path: dist/.well-known/site-checksums.txt
         sbom-path: dist/.well-known/sbom.cdx.json
     ```
     **VERIFY** that `subject-checksums` produces one subject per file in the installed version (README: https://github.com/actions/attest). If not, fall back to `subject-path: 'dist/**'` (glob, ≤1024). → `upload-artifact` (dist, retention 7d).
   - job `deploy`: `needs: build`, `environment: production` (deployment branches: `main` only), permissions `contents: read, deployments: write`. Download the artifact → `gh attestation verify dist/.well-known/site-checksums.txt -R ${{ github.repository }} --signer-workflow ${{ github.repository }}/.github/workflows/deploy.yml` (with `GH_TOKEN: ${{ github.token }}`; **VERIFY** flag name) → spot-verify `dist/index.html` the same way → `npm ci --ignore-scripts` (for wrangler) → `npx wrangler pages deploy dist --project-name=$PROJECT --branch=main --commit-hash=$GITHUB_SHA` with `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` from the environment. The `npm ci` step can be avoided by putting wrangler in a separate tiny `deploy/package-lock.json`; recommended, to keep the deploy job's dependency surface minimal.
   - `concurrency: { group: deploy, cancel-in-progress: false }`.
5. `scorecard.yml`: **separate workflow** (publish_results restrictions: no workflow-level env or write permissions; only the scorecard job holds `id-token: write`; ubuntu runner; approved actions only). Triggers: `push` to main, weekly `schedule`, `branch_protection_rule`. Job permissions `security-events: write, id-token: write, contents: read, actions: read`. Steps: checkout (`persist-credentials: false`) → `ossf/scorecard-action` (`results_file: results.sarif`, `results_format: sarif`, `publish_results: true`) → `upload-sarif`. Add the badge to the README and the /supply-chain page. https://github.com/marketplace/actions/ossf-scorecard-action (v2.4.4 latest at time of writing; **VERIFY**).
6. `dependabot.yml`: ecosystems `npm` (/), `npm` (/deploy if used), `github-actions` (/), `terraform` (/infra; **VERIFY** that Dependabot handles an OpenTofu lock file correctly; if not, skip and bump manually) with weekly schedule, groups, `cooldown` (**VERIFY**), and `open-pull-requests-limit: 5`.
7. Repo settings (Claude runs `gh api` if the GitHub App has admin rights; **otherwise Jeff does this**). Ruleset on `main`: require PR, require status checks (`ci`), require signed commits, block force-push and deletion, require linear history. Also: Actions → "Require actions to be pinned to a full-length commit SHA" if available at repo level (**VERIFY**), workflow permissions default read-only, disallow Actions from creating PRs, private vulnerability reporting on, secret scanning + push protection on, Dependabot alerts on.
8. `/supply-chain` page (written as a factual, how-to page; prose is TODO(jeff) for tone). Sections:
   - what's pinned and how
   - SBOM link (`/.well-known/sbom.cdx.json`)
   - checksums link
   - verify commands:
     ```
     curl -sO https://codeecologist.com/.well-known/site-checksums.txt
     gh attestation verify site-checksums.txt -R OWNER/codeecologist.com
     curl -s https://codeecologist.com/ -o index.html && gh attestation verify index.html -R OWNER/codeecologist.com
     gh attestation verify site-checksums.txt -R OWNER/codeecologist.com --predicate-type https://cyclonedx.org/bom   # VERIFY predicate URI
     ```
   - Scorecard badge + link
   - why Email Obfuscation etc. are off
   - known limits: Cloudflare edge serves the bytes, so trust in Cloudflare remains; HTML for `/` is served as `index.html`; edge-added headers aren't covered

Verify
- The first `main` deploy succeeds. `curl -sI https://codeecologist.com` returns 200 from Cloudflare.
- `gh attestation verify` commands from the /supply-chain page pass from Jeff's machine.
- `curl -s https://codeecologist.com/.well-known/sbom.cdx.json | jq .bomFormat` → `"CycloneDX"`.
- `grep -rnE 'uses: [^@]+@[^0-9a-f]' .github/workflows` returns nothing (every action pinned to a SHA).
- Scorecard run is green and results appear at `https://scorecard.dev/viewer/?uri=github.com/REPO`.
- Dependabot opens its first PRs (or "up to date").

Rollback: `npx wrangler pages deployment list --project-name PROJECT`, then roll back to the previous deployment in the dashboard (Pages → Deployments → Rollback). For a workflow problem, revert the PR. In an emergency, disable the workflow with `gh workflow disable deploy.yml`.

---

## Phase 7: .dev redirect confirmation + HSTS

Steps
1. The redirects have been live since Phase 1. Re-test them now that .com serves the site.
2. Add `security_header` to both zones: enabled, `max_age = 2592000`, `include_subdomains = false`, `preload = false`, `nosniff = true` (**VERIFY** the v5 value object shape). Plan → Jeff approves → apply.
3. Put the HSTS ramp and the preload decision in the backlog (dns-records.md).

Verify
```
curl -sI https://codeecologist.com | grep -i strict-transport      # max-age=2592000
curl -sI https://codeecologist.dev/talks?x=1 | grep -iE '^(HTTP|location|strict)'
curl -sI https://www.codeecologist.dev/ | grep -i location           # https://codeecologist.com/
curl -sI https://www.codeecologist.com/a | grep -i location          # https://codeecologist.com/a
```
Rollback: set `max_age = 0` and apply. Browsers that already cached HSTS keep it for up to the old max-age, which is why we start at 30 days.

---

## Phase 8: End-to-end verification

Run every item in `VERIFY.md` and paste the results into a PR comment or an issue titled "Launch verification". Anything that fails becomes a backlog issue. Then hand back to Jeff with:
- the placeholder list (`npm run check` output)
- pending manual items
- the backlog

---

## Backlog (do NOT do now)

- DMARC → `p=quarantine` (+2 wk), then `p=reject` (+4 wk), after Jeff reviews the reports
- HSTS → 180d + includeSubDomains, then the preload decision (Jeff)
- Per-post OG images (build-time, no external service)
- Optional: MTA-STS + TLS-RPT for .com (Fastmail support **VERIFY**)
- Optional: redirect `PROJECT.pages.dev` to the custom domain (Bulk Redirects, which need account "Bulk URL Redirects" permission) and protect preview URLs
- Optional: Cal.com load-on-click inline embed (see README decision)
- Optional: zizmor/actionlint in CI
- Revoke the 30-day infra token once setup is done
- **Separate task, later:** once Jeff publishes the BuildWarden philosophy essay, open a PR to `buildwarden/buildwarden` that replaces `docs/book/src/design/philosophy.md` with a short summary plus a link to the essay. The summary text needs Jeff's approval, and must not be written from essay text he hasn't published.
