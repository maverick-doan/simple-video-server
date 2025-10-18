# This is the deployment script for QUT AWS
# Provided we already had certain resources preconfigured in place
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "cab432-n11562773-tfsate-storage"
    key            = "terraform.tfstate"
    region         = "ap-southeast-2"
    profile        = "mav-qut-sso"
    dynamodb_table = "n11562773-tfstate-backend"
  }
}

provider "aws" {
  region  = "ap-southeast-2"
  profile = "mav-qut-sso"
}