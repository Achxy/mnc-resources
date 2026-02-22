# Deployments are done via `wrangler pages deploy` in GitHub Actions (deploy-app.yml),
# not via Pages CI. Terraform only creates and owns the project shell.
resource "cloudflare_pages_project" "app" {
  account_id        = var.cloudflare_account_id
  name              = "mnc-resources"
  production_branch = "main"

  build_config {
    build_command   = "npm run build"
    destination_dir = "dist"
  }

  deployment_configs {
    production {
      environment_variables = {
        VITE_CDN_BASE_URL = var.cdn_base_url
        NODE_VERSION      = "20"
      }
    }

    preview {}
  }
}
