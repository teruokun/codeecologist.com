# CAA: the three CAs Cloudflare Universal SSL can issue from.
# https://developers.cloudflare.com/ssl/reference/certificate-authorities/
# Cloudflare also adds hidden CAA records for the CAs it uses once any CAA
# record exists; those show up in DNS answers but not here. That is expected.
locals {
  caa_cas = {
    letsencrypt = "letsencrypt.org"
    google      = "pki.goog; cansignhttpexchanges=yes"
    sslcom      = "ssl.com"
  }

  caa_records = merge([
    for zone_key, zone in local.zones : merge(
      {
        for pair in setproduct(["issue", "issuewild"], keys(local.caa_cas)) :
        "${zone_key}/${pair[0]}/${pair[1]}" => {
          zone_id = zone.id
          name    = zone.name
          tag     = pair[0]
          value   = local.caa_cas[pair[1]]
        }
      },
      var.caa_iodef == "" ? {} : {
        "${zone_key}/iodef" = {
          zone_id = zone.id
          name    = zone.name
          tag     = "iodef"
          value   = var.caa_iodef
        }
      }
    )
  ]...)
}

resource "cloudflare_dns_record" "caa" {
  for_each = local.caa_records

  zone_id = each.value.zone_id
  name    = each.value.name
  type    = "CAA"
  ttl     = 3600
  data = {
    flags = 0
    tag   = each.value.tag
    value = each.value.value
  }
}
