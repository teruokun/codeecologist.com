# DNS records and zone settings

Source of truth once Phase 1 is done: `infra/*.tf` (OpenTofu). This table is the spec those files must match. If they disagree, stop and ask Jeff.

Placeholders:
- `<PROJECT>`: the Cloudflare Pages project name (suggested: `codeecologist`). Pages hostname: `<PROJECT>.pages.dev`.
- `dmarc-reports@codeecologist.com`: a Fastmail **alias** Jeff creates (manual step). Change it if he picks a different address.
- `security@codeecologist.com`: Fastmail alias for CAA `iodef` reports and `/.well-known/security.txt`. Optional.

TTL: `Auto` means Cloudflare automatic (300 s), which is required for proxied records. Mail records use 3600, matching Fastmail's guidance.

> **Fastmail values are authoritative.** Before applying Phase 2, Jeff (or Claude, from his screenshot or paste) must compare every mail record below with **Fastmail > Settings > Domains > codeecologist.com > DNS**. If they differ, use Fastmail's values. Reference: https://www.fastmail.help/hc/en-us/articles/360060591153

---

## codeecologist.com (primary)

### Web

| Type | Name | Value | TTL | Proxied | Purpose |
|---|---|---|---|---|---|
| CNAME | `@` | `<PROJECT>.pages.dev` | Auto | Yes | Apex goes to Cloudflare Pages (CNAME flattening). **Add the Pages custom domain first** (`cloudflare_pages_domain`). Cloudflare may create this record automatically; if so, import it instead of creating it. A CNAME added without the Pages association returns 522. https://developers.cloudflare.com/pages/configuration/custom-domains/ |
| CNAME | `www` | `codeecologist.com` | Auto | Yes | Exists only so the www-to-apex redirect rule can match. |

### Mail (Fastmail)

| Type | Name | Value | TTL | Proxied | Purpose |
|---|---|---|---|---|---|
| MX | `@` | `us1-smtp.messagingengine.com` (pri 10) | Auto | No | Inbound mail (Fastmail US region) |
| MX | `@` | `us2-smtp.messagingengine.com` (pri 20) | Auto | No | Inbound mail, backup |
| TXT | `@` | `v=spf1 include:spf.messagingengine.com ?all` | Auto | No | SPF. See the note below on `?all`. |
| CNAME | `fm1._domainkey` | `fm1.codeecologist.com.dkim.fmhosted.com` | Auto | **No** | DKIM |
| CNAME | `fm2._domainkey` | `fm2.codeecologist.com.dkim.fmhosted.com` | Auto | **No** | DKIM |
| CNAME | `fm3._domainkey` | `fm3.codeecologist.com.dkim.fmhosted.com` | Auto | **No** | DKIM |
| TXT | `_dmarc` | Stage 1: `v=DMARC1; p=none; rua=mailto:dmarc-reports@codeecologist.com; adkim=s; aspf=r; fo=1` | 3600 | No | DMARC monitoring |
| TXT | `codeecologist.dev._report._dmarc` | `v=DMARC1` | 3600 | No | Lets the .dev zone's DMARC reports be sent to a .com address (RFC 7489 §7.1 external destination verification) |

DMARC ramp (Phase 2 → backlog). Move to the next stage only after reports show that all legitimate mail passes DKIM aligned:

| Stage | When | Value |
|---|---|---|
| 1 | Day 0 | `v=DMARC1; p=none; rua=mailto:dmarc-reports@codeecologist.com; adkim=s; aspf=r; fo=1` |
| 2 | +2 weeks of clean reports | `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@codeecologist.com; adkim=s; aspf=r; fo=1` |
| 3 | +2 more weeks clean | `v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc-reports@codeecologist.com; adkim=s; aspf=r; fo=1` |

`adkim=s` is safe because Fastmail signs with `d=codeecologist.com`. `aspf=r` is used because the envelope sender may be a Fastmail bounce domain. If a stage-1 report shows SPF alignment failing while DKIM passes, that is expected. **VERIFY** this against the first reports.

**SPF: `?all`, Fastmail's default.** These six records were created by Jeff from Fastmail's setup screen (2026-11) and Fastmail reports them as verified, so they are kept exactly as created, including the US-region MX hosts and automatic TTL. DMARC is the enforcement point, not SPF. The `.dev` zone sends no mail, so it uses `-all`.

### Optional Fastmail client autodiscovery (SRV)

These are from Fastmail's help article. They are optional, but they make Apple Mail, Thunderbird and calendar clients configure themselves. Add them unless Jeff says no. TTL 3600, DNS only.

| Name | Priority | Weight | Port | Target |
|---|---|---|---|---|
| `_submission._tcp` | 0 | 0 | 0 | `.` |
| `_submissions._tcp` | 0 | 1 | 465 | `smtp.fastmail.com` |
| `_imap._tcp` | 0 | 0 | 0 | `.` |
| `_imaps._tcp` | 0 | 1 | 993 | `imap.fastmail.com` |
| `_pop3._tcp` | 0 | 0 | 0 | `.` |
| `_pop3s._tcp` | 10 | 1 | 995 | `pop.fastmail.com` |
| `_jmap._tcp` | 0 | 1 | 443 | `api.fastmail.com` |
| `_autodiscover._tcp` | 0 | 1 | 443 | `autodiscover.fastmail.com` |
| `_carddav._tcp` | 0 | 0 | 0 | `.` |
| `_carddavs._tcp` | 0 | 1 | 443 | `carddav.fastmail.com` |
| `_caldav._tcp` | 0 | 0 | 0 | `.` |
| `_caldavs._tcp` | 0 | 1 | 443 | `caldav.fastmail.com` |

### CAA (both zones, identical)

Universal SSL issues from Let's Encrypt, Google Trust Services or SSL.com. Sources: https://developers.cloudflare.com/ssl/reference/certificate-authorities/ and https://developers.cloudflare.com/ssl/edge-certificates/caa-records/

| Type | Name | Flags | Tag | Value |
|---|---|---|---|---|
| CAA | `@` | 0 | issue | `letsencrypt.org` |
| CAA | `@` | 0 | issue | `pki.goog; cansignhttpexchanges=yes` |
| CAA | `@` | 0 | issue | `ssl.com` |
| CAA | `@` | 0 | issuewild | `letsencrypt.org` |
| CAA | `@` | 0 | issuewild | `pki.goog; cansignhttpexchanges=yes` |
| CAA | `@` | 0 | issuewild | `ssl.com` |
| CAA | `@` | 0 | iodef | `mailto:security@codeecologist.com` (optional) |

Notes:
- Once any CAA record exists, Cloudflare **automatically adds hidden CAA records** for the CAs it currently uses. They don't appear in the dashboard, Tofu or the API; see them with `dig CAA`. So `dig` can show more CAs than this table lists. That is expected; don't try to "fix" it.
- Cloudflare says its CA list can change. **VERIFY** the reference page again on the day you apply.
- Apply CAA **before** adding the Pages custom domain, so certificate issuance runs against the final policy.

### Contact form sending (only if Option B in PLAN Phase 5 is chosen)

| Type | Name | Value | Purpose |
|---|---|---|---|
| (per provider) | `<sub>.codeecologist.com` | **VERIFY**: copy exactly from the provider's domain-verification screen | SPF/DKIM (and possibly MX for bounces) on a dedicated sending subdomain. This keeps the apex SPF record unchanged. |

---

## codeecologist.dev (redirect-only, no mail)

| Type | Name | Value | TTL | Proxied | Purpose |
|---|---|---|---|---|---|
| A | `@` | `192.0.2.1` | Auto | Yes | Placeholder (TEST-NET-1). The Single Redirect rule answers before any origin is contacted. |
| AAAA | `@` | `100::` | Auto | Yes | Placeholder (discard prefix) for IPv6 clients |
| CNAME | `www` | `codeecologist.dev` | Auto | Yes | So www.codeecologist.dev also redirects |
| MX | `@` | `.` (priority 0) | 3600 | No | Null MX (RFC 7505): this domain accepts no mail |
| TXT | `@` | `v=spf1 -all` | 3600 | No | No host may send as this domain |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:dmarc-reports@codeecologist.com` | 3600 | No | Reject spoofing. The `rua` is optional and needs the `_report._dmarc` authorization record in the .com zone (above). |
| TXT | `*._domainkey` | `v=DKIM1; p=` | 3600 | No | Optional. An empty key means "no valid DKIM keys", which makes every forged DKIM signature fail. |
| CAA | `@` | same 6 or 7 records as .com | 3600 | No | Same CA policy |

`.dev` is on the HSTS preload list at the TLD level, so browsers only ever use HTTPS for it. The edge certificate must therefore exist before the redirect works for browsers. Universal SSL covers `codeecologist.dev` and `*.codeecologist.dev`.

---

## Redirect rules (Single Redirects, `http_request_dynamic_redirect` phase)

| Zone | Rule (ref) | Match expression | Target | Status | Keep query |
|---|---|---|---|---|---|
| .dev | `dev_to_com` | `(http.host in {"codeecologist.dev" "www.codeecologist.dev"})` | dynamic: `concat("https://codeecologist.com", http.request.uri.path)` | 301 | Yes |
| .com | `www_to_apex` | `(http.host eq "www.codeecologist.com")` | dynamic: `concat("https://codeecologist.com", http.request.uri.path)` | 301 | Yes |

Terraform reference (v4 syntax on the page; translate to v5 attributes): https://developers.cloudflare.com/rules/url-forwarding/single-redirects/terraform-example/

---

## Zone settings

| Setting (API id) | .com | .dev | Managed by | Notes |
|---|---|---|---|---|
| SSL mode (`ssl`) | `strict` (Full strict) | `strict` | Tofu `cloudflare_zone_setting` | The Pages origin has a valid certificate. On .dev, no origin is ever contacted. |
| Min TLS (`min_tls_version`) | `1.2` | `1.2` | Tofu | |
| TLS 1.3 (`tls_1_3`) | `on` | `on` | Tofu | Usually the default |
| Always Use HTTPS (`always_use_https`) | `on` | `on` | Tofu | |
| Automatic HTTPS Rewrites (`automatic_https_rewrites`) | `on` | `on` | Tofu | Harmless; the site has no http:// assets |
| HSTS (`security_header`) | Phase 7: enabled, `max_age=2592000` (30 d), `include_subdomains=false`, `preload=false`, `nosniff=true` | same | Tofu | Ramp plan below |
| Email Address Obfuscation (`email_obfuscation`) | **`off`** | `off` | Tofu | It rewrites HTML at the edge, which breaks the published per-file hashes (provenance) and injects a script. Required off. |
| Rocket Loader (`rocket_loader`) | `off` | `off` | Tofu | Same reason: it changes served bytes |
| Web Analytics auto-injection | off / not enabled | n/a | Dashboard check | Avoids injected third-party JS. Jeff can opt in later. |
| Email Routing | **never enable** | **never enable** | n/a | On .com it conflicts with the Fastmail MX. On .dev it would replace the null MX. |
| DNSSEC | on | on | **Dashboard**: Registrar > Manage Domains > Configuration > Enable DNSSEC (one click; DS goes to the registry automatically via CDS/CDNSKEY, takes 1-2 days) https://developers.cloudflare.com/registrar/get-started/enable-dnssec/ | Not managed in Tofu, so it can't fight the Registrar flow. Verify with `dig`. |
| Registrar lock | on | on | **Dashboard**: Registrar > Manage Domains | Registrar API support for this isn't confirmed (**VERIFY**), so treat it as manual |
| Auto-renew | on | on | **Dashboard** | |

### HSTS ramp (decision for Jeff)

1. Phase 7: `max-age=2592000` (30 days), no includeSubDomains, no preload.
2. After 30 days with no TLS problems: `max-age=15552000` (180 d) + `includeSubDomains`. Every web-facing subdomain must be HTTPS. The mail CNAMEs aren't web hosts, so they're unaffected.
3. **Jeff decides:** preload `.com`? It needs `max-age>=31536000; includeSubDomains; preload` and submission at https://hstspreload.org. Removal takes months. Upside: a small credibility signal. Downside: it locks every future subdomain into HTTPS forever. `.dev` is already preloaded by the TLD.
