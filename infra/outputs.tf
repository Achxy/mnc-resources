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
  description = "CDN hostname for content delivery"
  value       = cloudflare_record.cdn_cname.hostname
}
