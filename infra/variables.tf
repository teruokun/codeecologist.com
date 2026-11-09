variable "primary_domain" {
  description = "Zone that serves the site and mail."
  type        = string
  default     = "codeecologist.com"
}

variable "redirect_domain" {
  description = "Zone that only redirects to the primary domain and never handles mail."
  type        = string
  default     = "codeecologist.dev"
}

variable "caa_iodef" {
  description = "Where CAs report policy violations. Empty string omits the iodef record."
  type        = string
  default     = "mailto:security@codeecologist.com"
}
