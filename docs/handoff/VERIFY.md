# Launch verification checklist

Run these after Phase 7. Record pass or fail and evidence (command output or a screenshot link) for each item. Items marked (Jeff) need his accounts or inbox.

## DNS and registrar
- [ ] `dig +short NS codeecologist.com` and `.dev` return Cloudflare nameservers
- [ ] DNSSEC chain valid: `dig +dnssec codeecologist.com SOA @1.1.1.1` shows the `ad` flag; https://dnsviz.net/d/codeecologist.com/dnssec/ and `/d/codeecologist.dev/` are all green
- [ ] (Jeff) Registrar lock and auto-renew shown as on for both domains in the dashboard
- [ ] CAA: `dig +short CAA codeecologist.com` and `.dev` contain letsencrypt.org, pki.goog, ssl.com (possibly plus hidden Cloudflare-added CAs)
- [ ] `cd infra && tofu plan -detailed-exitcode` exits 0 (no drift)

## Mail (codeecologist.com)
- [ ] MX, SPF, DKIM ×3, DMARC resolve as in `infra/dns-records.md`
- [ ] (Jeff) Fastmail Domains screen shows everything verified and DKIM enabled
- [ ] (Jeff) Send from jeff@ to the address shown by https://www.mail-tester.com (or similar); score ≥ 9/10; SPF, DKIM and DMARC all pass; no blocklist hits
- [ ] (Jeff) Gmail "Show original" on a sent message: `spf=pass`, `dkim=pass header.d=codeecologist.com`, `dmarc=pass`
- [ ] (Jeff) Inbound: mail from an outside account arrives; Fastmail aliases `dmarc-reports@` and `security@` deliver
- [ ] DMARC aggregate reports start arriving at dmarc-reports@ within ~48h. Optional: run them through a free DMARC report viewer, but ask Jeff before uploading reports to any third party.
- [ ] Cloudflare Email Routing is **disabled** on both zones

## Mail (codeecologist.dev, none)
- [ ] `dig +short MX codeecologist.dev` → `0 .`
- [ ] `dig +short TXT codeecologist.dev` → `"v=spf1 -all"`; `_dmarc` → `p=reject; sp=reject; adkim=s; aspf=s`
- [ ] `dig +short TXT x._domainkey.codeecologist.dev` → `"v=DKIM1; p="` (if the wildcard was added)
- [ ] `dig +short TXT codeecologist.dev._report._dmarc.codeecologist.com` → `"v=DMARC1"` (if `rua` is set on .dev)

## TLS and headers
- [ ] https://www.ssllabs.com/ssltest/analyze.html?d=codeecologist.com grade A or A+ (A+ needs HSTS ≥ 180 days, so A is expected at launch); same for codeecologist.dev
- [ ] `curl -sI http://codeecologist.com` → 301 to https
- [ ] `curl -sI https://codeecologist.com | grep -i strict-transport` → `max-age=2592000`
- [ ] https://securityheaders.com/?q=codeecologist.com grade A or better: CSP, nosniff, Referrer-Policy, Permissions-Policy, HSTS present
- [ ] CSP has no `'unsafe-inline'` or `'unsafe-eval'`; https://csp-evaluator.withgoogle.com shows no high-severity findings
- [ ] `curl -sI --tlsv1.1 --tls-max 1.1 https://codeecologist.com` fails (min TLS 1.2)

## Redirects
- [ ] `curl -sI https://codeecologist.dev/some/path?q=1` → `301`, `location: https://codeecologist.com/some/path?q=1`
- [ ] `http://codeecologist.dev`, `https://www.codeecologist.dev/`, `https://www.codeecologist.com/a` all reach `https://codeecologist.com/...` in at most 2 hops: `curl -sIL -o /dev/null -w '%{num_redirects} %{url_effective}\n' <url>`

## Site
- [ ] Homepage renders at 375, 768 and 1280 px, in light and dark mode, plus the toggle
- [ ] Talks, Writing and News sections are **absent** while the collections are empty or all drafts. Each appears after one non-draft entry is added (fixture test from Phase 4).
- [ ] No "Proposed" or future talks anywhere: `grep -ri proposed dist/` returns nothing
- [ ] `npm run check` placeholder list shown to Jeff. Production either has zero `TODO(jeff)` or the draft banner is deliberately on.
- [ ] `/rss.xml` is valid (https://validator.w3.org/feed/) once it has items
- [ ] 404 page works: `curl -s -o /dev/null -w '%{http_code}' https://codeecologist.com/nope` → 404
- [ ] Page load makes no third-party requests (DevTools, or https://webbkoll.5july.net for a privacy view). There is no Turnstile or other third-party script.
- [ ] Lighthouse (mobile), Chrome DevTools or `npx lighthouse@<pinned> https://codeecologist.com --preset=perf`: Performance ≥ 95, Accessibility = 100 target (≥ 95 minimum), Best Practices ≥ 95, SEO ≥ 95
- [ ] axe DevTools: 0 serious or critical issues. Keyboard-only walkthrough: skip link, focus visible, mobile menu, contact links reachable and named.
- [ ] Book a call: button opens Jeff's Cal.com page. (Jeff) Test booking appears in the Fastmail calendar via CalDAV, then cancel it.
- [ ] Contact: the homepage has no `<form>`; the email link opens a mail client addressed to Jeff; the LinkedIn and Cal.com links go to the right profiles; `curl -s https://codeecologist.com/api/contact -o /dev/null -w '%{http_code}'` → 404 (no endpoint exists)

## Supply chain
- [ ] `gh attestation verify site-checksums.txt -R OWNER/codeecologist.com` passes, using the file downloaded from the live site (exact commands on /supply-chain)
- [ ] `curl -s https://codeecologist.com/ -o index.html && gh attestation verify index.html -R OWNER/codeecologist.com` passes. This proves the served bytes equal the attested build, so Email Obfuscation and Rocket Loader are confirmed off.
- [ ] `sha256sum -c` against the downloaded `site-checksums.txt`, for a sample of fetched files, passes
- [ ] SBOM: `/.well-known/sbom.cdx.json` is valid CycloneDX (`jq .bomFormat,.specVersion`); its SBOM attestation verifies
- [ ] All workflow `uses:` are pinned to 40-hex SHAs with version comments; every workflow has `permissions: {}` at the top
- [ ] Scorecard published; score and badge visible. Review the low checks and record accepted exceptions (e.g. "Fuzzing", "CII badge") on /supply-chain.
- [ ] Branch ruleset on `main`: PR required, status checks required, signed commits required, no force-push. `gh api repos/OWNER/codeecologist.com/rules/branches/main` shows these.
- [ ] Secret scanning + push protection, Dependabot alerts and private vulnerability reporting are on
- [ ] `SECURITY.md` and `/.well-known/security.txt` (RFC 9116, with an `Expires` date ≤ 1 year away) exist
- [ ] Deploy token is Pages-only. Infra token has an expiry date or has been revoked.
