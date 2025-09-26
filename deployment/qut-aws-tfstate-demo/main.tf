terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "cab432-n11562773-tfsate-storage-demo"
    key = "terraform.tfstate"
    region = "ap-southeast-2"
    profile = "mav-qut-sso"
    dynamodb_table = "n11562773-tfstate-backend-demo"
  }
}

provider "aws" {
  region  = "ap-southeast-2"
  profile = "mav-qut-sso"
}

# Simple S3 bucket for demo
resource "aws_s3_bucket" "demo_bucket" {
  bucket = "cab432-n11562773-demo-bucket"
  
  tags = {
    Name         = "Demo Bucket"
    qut-username = "n11562773@qut.edu.au"
    purpose      = "tfstate-demo"
    version      = var.version_tag
  }
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Output for GitHub Actions
output "bucket_name" {
  value = aws_s3_bucket.demo_bucket.id
}

output "bucket_tags" {
  value = aws_s3_bucket.demo_bucket.tags
}