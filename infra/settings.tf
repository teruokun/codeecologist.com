# Zone settings from docs/handoff/infra/dns-records.md, identical on both zones.
# HSTS (security_header) is added in Phase 7.
locals {
  zone_settings = {
    ssl                      = "strict"
    min_tls_version          = "1.2"
    tls_1_3                  = "on"
    always_use_https         = "on"
    automatic_https_rewrites = "on"
    # These two rewrite HTML at the edge, which would break the published
    # per-file checksums: served bytes must equal built bytes.
    email_obfuscation = "off"
    rocket_loader     = "off"
  }

  zone_setting_pairs = merge([
    for zone_key, zone in local.zones : {
      for setting_id, value in local.zone_settings :
      "${zone_key}/${setting_id}" => {
        zone_id    = zone.id
        setting_id = setting_id
        value      = value
      }
    }
  ]...)
}

resource "cloudflare_zone_setting" "this" {
  for_each = local.zone_setting_pairs

  zone_id    = each.value.zone_id
  setting_id = each.value.setting_id
  value      = each.value.value
}
