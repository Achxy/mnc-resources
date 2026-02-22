resource "cloudflare_d1_database" "cms" {
  account_id = var.cloudflare_account_id
  name       = "mnc-cms"
}
