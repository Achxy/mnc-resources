# Type/content may need adjustment after import — run `terraform plan` to detect drift
resource "cloudflare_record" "cdn_cname" {
  zone_id = var.cloudflare_zone_id
  name    = "cdn.mnc"
  type    = "AAAA"
  content = "100::"
  proxied = true
  comment = "CDN endpoint for mnc-resources (routed to mnc-cdn worker)"
}
