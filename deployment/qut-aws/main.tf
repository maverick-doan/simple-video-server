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
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
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

# AWS Cognito will not be managed by Terraform
# This is because it's a bit too complex to manage with Terraform (need to manage users and groups).
# There is a workaround for this by having Terraform ignore certain resources however not worth the effort at this stage.

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