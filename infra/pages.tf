# Cloudflare Pages project for the site, deployed by Direct Upload from
# .github/workflows/deploy.yml. No `source` block: Cloudflare's git
# integration is deliberately not used, so Cloudflare never builds the site
# and never holds access to the repository.
#
# Applied in two steps (see docs/handoff/infra/dns-records.md):
#   1. The project and the custom domain (this file).
#   2. The apex CNAME to <project>.pages.dev. Cloudflare may create it on its
#      own when the domain is attached; if so it is imported, not created.

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
