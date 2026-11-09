# Secrets and tokens

Rules:
- Never commit a secret, or echo one into logs, PR text, commit messages or Tofu state.
- Claude never asks Jeff to paste a secret into chat. Jeff sets secrets himself, or they are injected into the session environment.
- Each secret has one home, listed below. If something needs a secret that isn't in this table, stop and ask.

| # | Secret | Home | Used by | Minimum scope | Expiry / rotation |
|---|---|---|---|---|---|
| 1 | `CLOUDFLARE_API_TOKEN` (**infra**) | Claude Code session environment, local only. Never in GitHub. | `tofu plan/apply`, one-off `wrangler` admin calls | See "Infra token permissions" below. Resources: zones `codeecologist.com` + `codeecologist.dev`; account: Jeff's account. | Set a TTL of **30 days** at creation (the token form supports start/end dates). Revoke once setup is done, and create a new one for later infra changes. |
| 2 | `CLOUDFLARE_API_TOKEN` (**deploy**) | GitHub repo → Environment `production` → secret | `deploy.yml` deploy job only | **Account > Cloudflare Pages > Edit**, Jeff's account only. No zone permissions. https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/ | Expiry 1 year, calendar reminder to rotate. Optional: client IP filtering isn't practical (GitHub runner IPs vary). |
| 3 | `CLOUDFLARE_ACCOUNT_ID` | GitHub Environment `production` → variable (not secret; an identifier) | `deploy.yml` | n/a | n/a |
| 4 | `TURNSTILE_SECRET_KEY` | Cloudflare Pages project → Production env → **secret** (`wrangler pages secret put TURNSTILE_SECRET_KEY --project-name <PROJECT>`) | Pages Function `functions/api/contact.ts` | One widget, hostname `codeecologist.com` only | Rotate if leaked (Turnstile supports secret rotation, **VERIFY** UI path). Site key (public) goes in code or a build var. |
| 5 | Contact-delivery credential (see PLAN Phase 5) | Pages project → Production → secret | Pages Function | **Option B (recommended):** provider API key with *sending-only* permission restricted to the sending subdomain (Resend: key permission + domain restriction, https://resend.com/docs/dashboard/api-keys; **VERIFY** exact options). **Option A:** Fastmail API token with scope **Email** only (no Email submission). Note that this scope can read, edit and delete the whole mailbox (https://www.fastmail.help/hc/en-us/articles/5254602856719). | Option B: 1 year, rotate. Option A: no expiry exists; review "last used" monthly and revoke on any doubt. |
| 6 | `CONTACT_TO` (Jeff's inbox address) | Pages → Production → **environment variable** (plain text) | Pages Function | n/a | n/a |
| 7 | `GITHUB_TOKEN` | Automatic per job | All workflows | Default `permissions: {}` at workflow level; each job adds only what it needs | Per job |
| 8 | Fastmail **app password** for Cal.com CalDAV | Cal.com only (Jeff enters it) | Cal.com ↔ Fastmail calendar | Fastmail app password limited to **CalDAV** access (**VERIFY** the app-password access options in Fastmail) | Revoke in Fastmail if Cal.com is dropped |
| 9 | Jeff's commit/tag signing key (SSH or GPG) | Jeff's machine + GitHub account | Signed commits and tags | n/a | Jeff's policy |
| 10 | Fastmail connector in Claude | Claude connector settings (OAuth) | Jeff's AI inbox and calendar triage. **Not used by the website.** | Whatever the connector asks for. Separate from the site. | Revoke in Fastmail if unused |

No secret is needed for: Scorecard (`publish_results` uses OIDC), attestations (OIDC + `GITHUB_TOKEN`), Dependabot, or SBOM generation.

## Infra token permissions (#1)

Jeff creates this as a **Custom Token** at dash.cloudflare.com → My Profile → API Tokens. Names come from https://developers.cloudflare.com/fundamentals/api/reference/permissions/ (the dashboard shows "Edit"; the API reference often says "Write"; they're the same thing).

**Zone resources:** Include → Specific zone → `codeecologist.com`, and again for `codeecologist.dev`.

| Permission group | Level | Needed for |
|---|---|---|
| Zone > Zone | Read | Look up zone IDs, `data "cloudflare_zone"` |
| Zone > DNS | Edit | All DNS records, CAA. Also the DNSSEC endpoint ("DNS Write", https://developers.cloudflare.com/api/python/resources/dns/subresources/dnssec/methods/edit/), so Claude can *read* DNSSEC status. |
| Zone > Zone Settings | Edit | `ssl`, `min_tls_version`, `always_use_https`, `security_header` (HSTS), `email_obfuscation`, `rocket_loader`, etc. ("Zone Settings Write" per the API reference) |
| Zone > Single Redirect | Edit | Redirect rules (`http_request_dynamic_redirect` ruleset). **VERIFY:** the permissions page also lists "Dynamic URL Redirects Write", which may be the API-side name for the same group. If `tofu apply` on the ruleset returns 403, add that one. |
| Zone > SSL and Certificates | Read | Check edge certificate status in Phase 0/8 |

**Account resources:** Include → Jeff's account.

| Permission group | Level | Needed for |
|---|---|---|
| Account > Cloudflare Pages | Edit | Create the Pages project, attach custom domains, set Pages secrets |
| Account > Turnstile | Edit | Create the Turnstile widget in Tofu. **Not in Jeff's original scope ("zones + Pages")**: either add it, or Jeff creates the widget by hand and Claude imports it. |
| Account > Account Settings | Read | **VERIFY**: some provider data sources need it. Add it only if a plan fails without it. |

**Not possible with this token (manual):** domain purchase, registrar lock, auto-renew, one-click Registrar DNSSEC, creating API tokens.
