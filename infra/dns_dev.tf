# codeecologist.dev: redirect-only, accepts and sends no mail.

# Placeholder addresses. The redirect rule answers at the edge before any
# origin is contacted. 192.0.2.1 is TEST-NET-1; 100:: is the discard prefix.
resource "cloudflare_dns_record" "dev_apex_a" {
  zone_id = local.zones.dev.id
  name    = var.redirect_domain
  type    = "A"
  content = "192.0.2.1"
  ttl     = 1
  proxied = true
}

resource "cloudflare_dns_record" "dev_apex_aaaa" {
  zone_id = local.zones.dev.id
  name    = var.redirect_domain
  type    = "AAAA"
  content = "100::"
  ttl     = 1
  proxied = true
}

resource "cloudflare_dns_record" "dev_www" {
  zone_id = local.zones.dev.id
  name    = "www.${var.redirect_domain}"
  type    = "CNAME"
  content = var.redirect_domain
  ttl     = 1
  proxied = true
}

# Null MX (RFC 7505): this domain accepts no mail.
resource "cloudflare_dns_record" "dev_null_mx" {
  zone_id  = local.zones.dev.id
  name     = var.redirect_domain
  type     = "MX"
  content  = "."
  priority = 0
  ttl      = 3600
}

# No host may send as this domain.
resource "cloudflare_dns_record" "dev_spf" {
  zone_id = local.zones.dev.id
  name    = var.redirect_domain
  type    = "TXT"
  content = "\"v=spf1 -all\""
  ttl     = 3600
}

# The rua address is in the .com zone, which authorises it with a
# codeecologist.dev._report._dmarc record (added with the mail records).
resource "cloudflare_dns_record" "dev_dmarc" {
  zone_id = local.zones.dev.id
  name    = "_dmarc.${var.redirect_domain}"
  type    = "TXT"
  content = "\"v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:dmarc-reports@${var.primary_domain}\""
  ttl     = 3600
}

# An empty key means "no valid DKIM keys", so every forged signature fails.
resource "cloudflare_dns_record" "dev_dkim_wildcard" {
  zone_id = local.zones.dev.id
  name    = "*._domainkey.${var.redirect_domain}"
  type    = "TXT"
  content = "\"v=DKIM1; p=\""
  ttl     = 3600
}
