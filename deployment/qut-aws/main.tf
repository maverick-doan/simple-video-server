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

data "aws_vpc" "qut_vpc" {
  id = var.qut_vpc_id
}

data "aws_subnets" "qut_subnets" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.qut_vpc.id]
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
  ami                         = data.aws_ami.ubuntu.id
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