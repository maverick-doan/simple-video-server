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
    bucket = "cab432-n11562773-tfsate-storage"
    key = "terraform.tfstate"
    region = "ap-southeast-2"
    profile = "mav-qut-sso"
    dynamodb_table = "n11562773-tfstate-backend"
  }
}

provider "aws" {
  region  = "ap-southeast-2"
  profile = "mav-qut-sso"
}

# ------------------------------------------------
# Data Sources
# ------------------------------------------------

data "aws_vpc" "qut_vpc" {
  id = var.qut_vpc_id
}

data "aws_subnets" "qut_subnets" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.qut_vpc.id]
  }
  filter {
    name   = "tag:Name"
    values = ["*Public*"]
  }
}

data "aws_subnet" "qut_subnet" {
  id = data.aws_subnets.qut_subnets.ids[0]
}

data "aws_security_group" "qut_security_group" {
  id = var.qut_security_group_id
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# ------------------------------------------------
# Resources
# ------------------------------------------------

# AWS RDS will not be managed by Terraform
# QUT already has a RDS instance running and we are not allowed to create new ones, so there is no point in managing it with Terraform.

resource "aws_ecr_repository" "qut_ecr_repository" {
  name                 = "${var.qut_student_id}-ecr-repository"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }

  tags = {
    Name           = "${var.qut_student_id}-ecr-repository"
    "qut-username" = var.qut_upn
    purpose        = "assessment 1"
  }
}

resource "aws_key_pair" "ssh_key" {
  key_name   = "${var.qut_student_id}-video-app-key"
  public_key = file(var.public_key_path)
  tags = {
    "qut-username" = var.qut_upn
    purpose        = "assessment 1"
  }
}

resource "aws_instance" "qut_instance" {
  ami                         = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnet.qut_subnet.id
  vpc_security_group_ids      = [data.aws_security_group.qut_security_group.id]
  key_name                    = aws_key_pair.ssh_key.key_name
  iam_instance_profile        = var.instance_profile_name
  associate_public_ip_address = true

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size_gb
  }

  tags = {
    Name           = "${var.qut_student_id}-video-app-ec2"
    "qut-username" = var.qut_upn
    "qut-username2" = var.qut_upn2
    purpose        = "assessment 1"
  }
}

resource "aws_s3_bucket" "qut_s3_bucket" {
  bucket = var.s3_bucket_name
  tags = {
    Name           = "${var.s3_bucket_name}"
    "qut-username" = var.qut_upn
    purpose        = "assessment 2"
  }
}

resource "aws_s3_bucket_public_access_block" "qut_s3_bucket" {
  bucket                  = aws_s3_bucket.qut_s3_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "qut_s3_bucket" {
  bucket = aws_s3_bucket.qut_s3_bucket.id
  versioning_configuration {
    status = var.s3_enable_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "qut_s3_bucket" {
  bucket = aws_s3_bucket.qut_s3_bucket.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "qut_s3_bucket" {
  bucket = aws_s3_bucket.qut_s3_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_cognito_user_pool" "qut_cognito_user_pool" {
  name = "${var.qut_student_id}-video-app-user-pool"
  username_attributes = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration = "ON"

  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length = 12
    require_numbers = true
    require_symbols = true
    require_uppercase = true
    require_lowercase = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  tags = {
    Name = "${var.qut_student_id}-video-app-user-pool"
    "qut-username" = var.qut_upn
    purpose = "assessment 2"
  }
}

resource "aws_cognito_user_pool_domain" "qut_cognito_user_pool_domain" {
  user_pool_id = aws_cognito_user_pool.qut_cognito_user_pool.id
  domain = "${var.qut_student_id}-video-app-user-pool-domain"
}

resource "aws_cognito_identity_provider" "qut_cognito_identity_provider" {
  count = var.cognito_identity_provider_count
  user_pool_id = aws_cognito_user_pool.qut_cognito_user_pool.id
  provider_name = "Google"
  provider_type = "Google"
  provider_details = {
    client_id = var.google_client_id
    client_secret = var.google_client_secret
    authorize_scopes = "openid email profile"
    authorize_url = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url = "https://www.googleapis.com/oauth2/v4/token"
    attributes_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    oidc_issuer = "https://accounts.google.com"
  }
  attribute_mapping = {
    email = "email"
    username = "sub"
  }
}

resource "aws_cognito_user_pool_client" "qut_cognito_user_pool_client" {
  name = "${var.qut_student_id}-video-app-user-pool-client"
  user_pool_id = aws_cognito_user_pool.qut_cognito_user_pool.id
  generate_secret = true
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation = true
  explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH", "ALLOW_CUSTOM_AUTH"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows = ["code"]
  allowed_oauth_scopes = ["openid", "email", "profile"]
  callback_urls = [var.cognito_callback_url]
  logout_urls = [var.cognito_logout_url]
  supported_identity_providers = ["Google", "COGNITO"]
  depends_on = [aws_cognito_user_pool_domain.qut_cognito_user_pool_domain]
}

resource "aws_cognito_user_group" "admin" {
  name = "Admin"
  user_pool_id = aws_cognito_user_pool.qut_cognito_user_pool.id
  description = "Admin group"
  precedence = 1
}

resource "aws_cognito_user_group" "user" {
  name = "User"
  user_pool_id = aws_cognito_user_pool.qut_cognito_user_pool.id
  description = "User group"
  precedence = 2
}

# ------------------------------------------------
# Outputs
# ------------------------------------------------

output "ec2_instance_id" {
  value = aws_instance.qut_instance.id
}

output "ec2_public_ip" {
  value = aws_instance.qut_instance.public_ip
}

output "ssh_command" {
  value = "ssh -i ${var.private_key_path} ubuntu@${aws_instance.qut_instance.public_ip}"
}

output "ecr_repository_url" {
  value = aws_ecr_repository.qut_ecr_repository.repository_url
}

output "s3_bucket_name" {
  value = aws_s3_bucket.qut_s3_bucket.bucket
}

output "s3_bucket_arn" {
  value = aws_s3_bucket.qut_s3_bucket.arn
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.qut_cognito_user_pool.id
}

output "cognito_user_pool_domain" {
  value = aws_cognito_user_pool_domain.qut_cognito_user_pool_domain.domain
}