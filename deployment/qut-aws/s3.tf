# S3 Bucket
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
  restrict_public_buckets  = true
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
