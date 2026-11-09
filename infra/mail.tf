# codeecologist.com mail (Fastmail).
#
# The MX, SPF and DKIM records were created by hand from Fastmail's setup
# screen before OpenTofu managed this zone, and Fastmail reports them as
# verified. They are imported with the values they already had.
#
# Cloudflare Email Routing must stay disabled on this zone: it would replace
# these MX records.

locals {
  # Fastmail's US-region MX hosts, as shown for this account.
  fastmail_mx = {
    us1 = { host = "us1-smtp.messagingengine.com", priority = 10 }
    us2 = { host = "us2-smtp.messagingengine.com", priority = 20 }
  }

  fastmail_dkim_selectors = ["fm1", "fm2", "fm3"]

  # Client autodiscovery, from Fastmail's DNS help article. A target of "."
  # with port 0 means "this service is not offered" (RFC 2782), which steers
  # clients to the TLS-only variant.
  fastmail_srv = {
    "_submission._tcp"   = { priority = 0, weight = 0, port = 0, target = "." }
    "_submissions._tcp"  = { priority = 0, weight = 1, port = 465, target = "smtp.fastmail.com" }
    "_imap._tcp"         = { priority = 0, weight = 0, port = 0, target = "." }
    "_imaps._tcp"        = { priority = 0, weight = 1, port = 993, target = "imap.fastmail.com" }
    "_pop3._tcp"         = { priority = 0, weight = 0, port = 0, target = "." }
    "_pop3s._tcp"        = { priority = 10, weight = 1, port = 995, target = "pop.fastmail.com" }
    "_jmap._tcp"         = { priority = 0, weight = 1, port = 443, target = "api.fastmail.com" }
    "_autodiscover._tcp" = { priority = 0, weight = 1, port = 443, target = "autodiscover.fastmail.com" }
    "_carddav._tcp"      = { priority = 0, weight = 0, port = 0, target = "." }
    "_carddavs._tcp"     = { priority = 0, weight = 1, port = 443, target = "carddav.fastmail.com" }
    "_caldav._tcp"       = { priority = 0, weight = 0, port = 0, target = "." }
    "_caldavs._tcp"      = { priority = 0, weight = 1, port = 443, target = "caldav.fastmail.com" }
  }
}

resource "cloudflare_dns_record" "com_mx" {
  for_each = local.fastmail_mx

  zone_id  = local.zones.com.id
  name     = var.primary_domain
  type     = "MX"
  content  = each.value.host
  priority = each.value.priority
  ttl      = 1
}

# Fastmail's default SPF. DMARC is the enforcement point.
resource "cloudflare_dns_record" "com_spf" {
  zone_id = local.zones.com.id
  name    = var.primary_domain
  type    = "TXT"
  content = "\"v=spf1 include:spf.messagingengine.com ?all\""
  ttl     = 1
}

# DKIM keys are hosted by Fastmail so it can rotate them. These must never be
# proxied.
resource "cloudflare_dns_record" "com_dkim" {
  for_each = toset(local.fastmail_dkim_selectors)

  zone_id = local.zones.com.id
  name    = "${each.key}._domainkey.${var.primary_domain}"
  type    = "CNAME"
  content = "${each.key}.${var.primary_domain}.dkim.fmhosted.com"
  ttl     = 1
  proxied = false
}

# DMARC stage 1: monitor only. Moving to quarantine and then reject happens
# only after Jeff has reviewed the aggregate reports.
resource "cloudflare_dns_record" "com_dmarc" {
  zone_id = local.zones.com.id
  name    = "_dmarc.${var.primary_domain}"
  type    = "TXT"
  content = "\"v=DMARC1; p=none; rua=mailto:dmarc-reports@${var.primary_domain}; adkim=s; aspf=r; fo=1\""
  ttl     = 3600
}

# Authorises this zone to receive DMARC reports about the .dev zone
# (RFC 7489 section 7.1).
resource "cloudflare_dns_record" "com_dmarc_report_auth_dev" {
  zone_id = local.zones.com.id
  name    = "${var.redirect_domain}._report._dmarc.${var.primary_domain}"
  type    = "TXT"
  content = "\"v=DMARC1\""
  ttl     = 3600
}

resource "cloudflare_dns_record" "com_srv" {
  for_each = local.fastmail_srv

  zone_id = local.zones.com.id
  name    = "${each.key}.${var.primary_domain}"
  type    = "SRV"
  ttl     = 3600
  data = {
    priority = each.value.priority
    weight   = each.value.weight
    port     = each.value.port
    target   = each.value.target
  }
}
