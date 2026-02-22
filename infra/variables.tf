variable "cloudflare_api_token" {
  description = "Cloudflare API token with permissions for R2, DNS, and Pages"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for achus.casa"
  type        = string
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "Achxy"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "mnc-resources"
}

variable "cdn_base_url" {
  description = "CDN base URL for content delivery"
  type        = string
  default     = "https://cdn.mnc.achus.casa"
}
