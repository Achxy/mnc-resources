# DNS record for api.mnc.achus.casa (Workers route)
# Workers routes require a DNS record to exist; AAAA 100:: is the standard placeholder.
resource "cloudflare_record" "api_aaaa" {
  zone_id = var.cloudflare_zone_id
  name    = "cms"
  type    = "AAAA"
  content = "100::"
  proxied = true
}
