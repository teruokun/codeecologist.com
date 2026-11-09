data "cloudflare_zone" "com" {
  filter = {
    name = var.primary_domain
  }
}

data "cloudflare_zone" "dev" {
  filter = {
    name = var.redirect_domain
  }
}

locals {
  zones = {
    com = { id = data.cloudflare_zone.com.zone_id, name = var.primary_domain }
    dev = { id = data.cloudflare_zone.dev.zone_id, name = var.redirect_domain }
  }
}
