variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for achus.casa"
  type        = string
}

variable "cdn_base_url" {
  description = "CDN base URL for content delivery"
  type        = string
  default     = "https://cdn.mnc.achus.casa"
}
