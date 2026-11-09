# Single Redirects. Both keep the path and the query string.

resource "cloudflare_ruleset" "dev_redirects" {
  zone_id     = local.zones.dev.id
  name        = "redirects"
  description = "Send every request for ${var.redirect_domain} to ${var.primary_domain}"
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  rules = [
    {
      ref         = "dev_to_com"
      description = "${var.redirect_domain} and www to ${var.primary_domain}"
      expression  = "(http.host in {\"${var.redirect_domain}\" \"www.${var.redirect_domain}\"})"
      action      = "redirect"
      action_parameters = {
        from_value = {
          status_code           = 301
          preserve_query_string = true
          target_url = {
            expression = "concat(\"https://${var.primary_domain}\", http.request.uri.path)"
          }
        }
      }
    }
  ]
}

resource "cloudflare_ruleset" "com_redirects" {
  zone_id     = local.zones.com.id
  name        = "redirects"
  description = "Send www.${var.primary_domain} to the apex"
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  rules = [
    {
      ref         = "www_to_apex"
      description = "www to apex"
      expression  = "(http.host eq \"www.${var.primary_domain}\")"
      action      = "redirect"
      action_parameters = {
        from_value = {
          status_code           = 301
          preserve_query_string = true
          target_url = {
            expression = "concat(\"https://${var.primary_domain}\", http.request.uri.path)"
          }
        }
      }
    }
  ]
}
