# The DNS record for cdn.mnc.achus.casa is auto-managed by R2's custom domain
# feature (CNAME -> public.r2.dev, proxied). It cannot be modified via the DNS
# API (error 1052). Any changes must be made through the R2 bucket's custom
# domain settings in the Cloudflare dashboard.

# Pages custom domain: mnc.achus.casa -> mnc-resources.pages.dev
resource "cloudflare_pages_domain" "app" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.app.name
  domain       = "mnc.achus.casa"
}

resource "cloudflare_record" "pages_cname" {
  zone_id = var.cloudflare_zone_id
  name    = "mnc"
  type    = "CNAME"
  content = "mnc-resources.pages.dev"
  proxied = true
}
