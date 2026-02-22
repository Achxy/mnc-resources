output "r2_bucket_name" {
  description = "R2 bucket name for content storage"
  value       = cloudflare_r2_bucket.content.name
}

output "pages_project_name" {
  description = "Cloudflare Pages project name"
  value       = cloudflare_pages_project.app.name
}

output "pages_subdomain" {
  description = "Cloudflare Pages subdomain"
  value       = cloudflare_pages_project.app.subdomain
}

output "cdn_hostname" {
  description = "CDN hostname for content delivery (R2-managed DNS record)"
  value       = "cdn.mnc.achus.casa"
}

output "app_hostname" {
  description = "App custom domain"
  value       = cloudflare_pages_domain.app.domain
}

output "d1_database_id" {
  description = "D1 database ID for CMS"
  value       = cloudflare_d1_database.cms.id
}

output "api_hostname" {
  description = "CMS API hostname"
  value       = "cms.achus.casa"
}
