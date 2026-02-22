terraform {
  required_version = ">= 1.5"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4"
    }
  }

  # Partial config — pass endpoint via: terraform init -backend-config="endpoint=https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
  backend "s3" {
    bucket = "mnc-terraform-state"
    key    = "terraform.tfstate"
    region = "auto"

    force_path_style            = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }
}

# Auth via env vars: CLOUDFLARE_API_TOKEN (scoped token) or CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL (global key)
provider "cloudflare" {}
