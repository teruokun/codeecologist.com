# Claude Code handoff: codeecologist.com website and infrastructure

This package lets a Claude Code session, with Jeff's GitHub repos and a Cloudflare API token attached, build and wire up:
- the consulting website (Astro on Cloudflare Pages, deployed from GitHub Actions with SBOM and SLSA provenance)
- DNS and zone hardening for `codeecologist.com` (primary) and `codeecologist.dev` (301 redirect), managed with OpenTofu
- Fastmail mail DNS
- the contact section (mailto, LinkedIn and Cal.com links; the original contact-form plan was dropped in Phase 5)

| File | Purpose |
|---|---|
| `CLAUDE.md` | Drop into the site repo root. Standing rules: stack, supply-chain rules, content rules, approvals. |
| `PLAN.md` | Phases 0–8 with steps, files, verification commands and rollback; plus the backlog |
| `infra/dns-records.md` | Every DNS record and zone setting for both zones |
| `SECRETS.md` | Every token or secret: where it lives, scope, expiry; plus the exact Cloudflare token permissions |
| `VERIFY.md` | Final launch checklist |
| `design/mockup.html` | Approved layout mockup (the copy in it is placeholder) |

## How Jeff starts the session

1. Finish the "Before the session" items below.
2. Create the empty public repo (suggested name `codeecologist.com`) under your personal account, and install the Claude GitHub App on it.
3. Start Claude Code with that repo checked out and `CLOUDFLARE_API_TOKEN` (the infra token from SECRETS.md #1) in the environment. Add this package to the repo as `docs/handoff/`, or attach it.
4. Paste:

> You're building my consulting website and its infrastructure. Read `docs/handoff/README.md`, `CLAUDE.md`, `PLAN.md`, `infra/dns-records.md`, `SECRETS.md` and `VERIFY.md` first, and copy `CLAUDE.md` to the repo root in your first PR. Work through PLAN.md one phase at a time, starting with the read-only Phase 0 preflight. After each phase, show me the acceptance-check output and wait for my OK. Never run `tofu apply`, change DNS, add a dependency or action, or publish copy without my explicit approval. Never invent claims, talks or essay text: placeholders stay `TODO(jeff)`. Never ask me to paste a secret into chat; give me the command to set it. Anything marked VERIFY, check against current official docs before relying on it, and tell me what you found.

## Order of operations

0. Preflight (read-only) → 1. DNS and zone hardening (OpenTofu) → 2. Fastmail DNS → 3. Site scaffold → 4. Content collections, hide-empty, RSS → 5. Contact form + Turnstile → 6. CI/CD, SBOM, provenance, Scorecard, first deploy → 7. HSTS + redirect re-check → 8. VERIFY.md.

Phases 3–4 don't depend on 1–2 and can run in parallel with them. Phase 6 needs Phase 1 (CAA before the custom domain).

## Blocked on Jeff

**Before the session** (from his separate runbook):
- [ ] Both domains bought at Cloudflare Registrar; zones active
- [ ] In the Registrar dashboard: **registrar lock**, **auto-renew**, **Enable DNSSEC** on both domains (none of these can be done with the API token)
- [ ] Fastmail Individual signup; `codeecologist.com` added; aliases `dmarc-reports@` and `security@` created
- [ ] Cal.com signup, Fastmail calendar connected via CalDAV (with a Fastmail app password), 30-min event created
- [ ] Cloudflare **infra token** created with the permissions in SECRETS.md, (Turnstile Edit is no longer needed: there is no contact form), with a 30-day expiry
- [ ] Empty GitHub repo + Claude GitHub App installed
- [ ] Fastmail connector connected in Claude (for inbox and calendar triage; not used by the site)

**During the session:**
- Phase 2: paste or screenshot the DNS values shown in **Fastmail > Settings > Domains**. They override dns-records.md.
- Phase 5: decided 2026-11-09: no contact form. Fill in the email, LinkedIn and Cal.com links in `home.yaml`.
- Phase 6: create the **deploy token** (Pages Edit only) and add it to the GitHub `production` environment. Set the branch ruleset if the GitHub App lacks admin rights. Set up commit and tag signing on your machine.
- Throughout: approve every `tofu plan`; replace `TODO(jeff)` copy; send your Cal.com booking URL.

## Decisions made in this package (Jeff can override)

| Decision | Why |
|---|---|
| **Cal.com: plain link-out button by default.** An inline embed is backlog, and would load only on click. | The embed loads Cal.com JS on our origin and needs CSP exceptions. A link has zero third-party code, which matches the supply-chain story. |
| **No contact form** (overrides the original "transactional email API" decision, 2026-11-09): mailto, LinkedIn and Cal.com links only | A form needs a public endpoint, a mail-sending key and a third-party spam check. Plain links need none of these. |
| SPF `~all` on .com, `-all` on .dev | DMARC does the enforcement; `~all` avoids SMTP-time rejects on forwarded mail. .dev never sends. |
| `actions/attest` instead of `actions/attest-build-provenance` | The latter is now a wrapper; GitHub says new implementations should use `actions/attest`. |
| Attest a checksums file of every built file (one subject per file) | Lets anyone `curl` a live page and run `gh attestation verify` on it directly |
| SBOM via built-in `npm sbom` (CycloneDX) | No extra SBOM tool dependency |
| Wrangler from the lockfile instead of `cloudflare/wrangler-action`; deploy job verifies the attestation before deploying | One fewer third-party action; the Cloudflare token never shares a job with the build |
| Cloudflare Email Obfuscation and Rocket Loader off | They rewrite HTML, which would break provenance verification |
| Tofu state local and gitignored, backed up manually; DNSSEC and registrar lock managed in the dashboard | Single operator, no secrets in state, everything re-importable. The Registrar's one-click DNSSEC flow shouldn't be fought by Tofu. |
| Dependabot (not Renovate) | Native to GitHub, no third-party app |
| Production deploy fails while `TODO(jeff)` placeholders remain, unless `ALLOW_PLACEHOLDERS=true` (which shows a draft banner) | Prevents shipping invented-looking copy by accident |
| Talks schema rejects future dates | Makes "only talks actually given" a build-time guarantee |
| No analytics | No third-party JS. Cloudflare Web Analytics can be opted into later. |
| `www` → apex 301 on .com | Single canonical host |

## Open questions for Jeff
- HSTS preload for .com: yes or no, after the ramp (dns-records.md)
- The unconfirmed mockup claims ("Standards work: OpenSSF/SLSA/CycloneDX", availability, response time, business or LLC name): keep, change or drop?
- Repo name and GitHub username; Pages project name (`codeecologist` suggested)
- Optional `step-security/harden-runner`: worth the extra vendor?
