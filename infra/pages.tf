# Cloudflare Pages project for the site, deployed by Direct Upload from
# .github/workflows/deploy.yml. No `source` block: Cloudflare's git
# integration is deliberately not used, so Cloudflare never builds the site
# and never holds access to the repository.
#
# The custom domain is attached before the apex CNAME exists (a CNAME
# without the Pages association returns 522). Cloudflare did not create the
# CNAME on its own when the domain was attached on 2026-11-10, so it is
# managed here.

locals {
  account_id    = data.cloudflare_zone.com.account.id
  pages_project = "codeecologist"
}

resource "cloudflare_pages_project" "site" {
  account_id        = local.account_id
  name              = local.pages_project
  production_branch = "main"
}

# CAA already allows the CAs Pages issues from (caa.tf), so the certificate
# for the custom domain is issued against the final policy.
resource "cloudflare_pages_domain" "apex" {
  account_id   = local.account_id
  project_name = cloudflare_pages_project.site.name
  name         = var.primary_domain
}

# Apex to Pages, proxied; Cloudflare flattens the CNAME at the apex.
resource "cloudflare_dns_record" "com_apex" {
  zone_id = local.zones.com.id
  name    = var.primary_domain
  type    = "CNAME"
  content = cloudflare_pages_project.site.subdomain
  ttl     = 1
  proxied = true

  depends_on = [cloudflare_pages_domain.apex]
}
