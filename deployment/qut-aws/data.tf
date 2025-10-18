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

# Get private subnets for internal services
data "aws_subnets" "private_subnets" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.qut_vpc.id]
  }
  filter {
    name   = "tag:Name"
    values = ["*Private*"]
  }
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

# Data Source for AWS Account ID
data "aws_caller_identity" "current" {}
