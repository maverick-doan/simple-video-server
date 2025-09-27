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

variable "qut_upn2" {
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

variable "instance_profile_name" {
  type = string
}

variable "ami_id" {
  type = string
}

variable "s3_bucket_name" {
  type        = string
  description = "Globally-unique S3 bucket name"
}

variable "s3_enable_versioning" {
  type    = bool
  default = true
}

variable "qut_purpose_tag" {
  type    = string
  default = "assessment 2"
}

variable "cognito_identity_provider_count" {
  type    = number
  default = 1
}

variable "google_client_id" {
  type = string
}

variable "google_client_secret" {
  type = string
}

variable "cognito_callback_url" {
  type = string
}

variable "cognito_logout_url" {
  type = string
}

variable "cognito_email_sending_account" {
  description = "Cognito email sending account type"
  type        = string
  default     = "DEVELOPER"
}

variable "cognito_from_email_address" {
  description = "Cognito from email address"
  type        = string
}

variable "cognito_ses_source_arn" {
  description = "SES source ARN for Cognito email sending"
  type        = string
}