variable "aws_region" {
  type    = string
  default = "ap-southeast-2"
}

variable "aws_profile" {
  type    = string
  default = "mav-qut-sso"
}

variable "qut_upn" {
  type = string
}

variable "qut_student_id" {
  type = string
}

variable "qut_vpc_id" {
  description = "QUT Pre-configured VPC ID"
  type        = string
}

variable "qut_security_group_id" {
  description = "QUT Pre-configured Security Group ID"
  type        = string
}

variable "instance_type" {
  description = "EC2 Instance Type"
  type        = string
  default     = "t3.micro"
}

variable "public_key_path" {
  description = "Path to your SSH public key"
  type        = string
}

variable "private_key_path" {
  description = "Path to your SSH private key"
  type        = string
}

variable "root_volume_size_gb" {
  description = "EC2 root volume size"
  type        = number
  default     = 30
}