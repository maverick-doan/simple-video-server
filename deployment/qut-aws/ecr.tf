# ECR Repository
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
