resource "cloudflare_pages_project" "app" {
  account_id        = var.cloudflare_account_id
  name              = "mnc-resources"
  production_branch = "main"

  source {
    type = "github"

    config {
      owner                         = var.github_owner
      repo_name                     = var.github_repo
      production_branch             = "main"
      deployments_enabled           = false
      pr_comments_enabled           = false
      production_deployment_enabled = false
      preview_deployment_setting    = "none"
    }
  }

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
  }
}
