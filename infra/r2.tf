resource "cloudflare_r2_bucket" "content" {
  account_id = var.cloudflare_account_id
  name       = "mnc-resources"
}
