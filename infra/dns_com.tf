# codeecologist.com web records. Mail records are added in Phase 2 and the
# apex record with the Pages project in Phase 6.

# Exists only so the www_to_apex redirect rule has a proxied hostname to match.
resource "cloudflare_dns_record" "com_www" {
  zone_id = local.zones.com.id
  name    = "www.${var.primary_domain}"
  type    = "CNAME"
  content = var.primary_domain
  ttl     = 1
  proxied = true
}
