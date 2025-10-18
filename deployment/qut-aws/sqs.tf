# Dead Letter Queue for failed transcoding jobs
resource "aws_sqs_queue" "transcoding_dlq" {
  name                      = "${var.qut_student_id}-transcoding-dlq"
  message_retention_seconds = 1209600

  tags = {
    Name            = "${var.qut_student_id}-transcoding-dlq"
    "qut-username"  = var.qut_upn
    "qut-username2" = var.qut_upn2
    purpose         = "assessment 3"
  }
}

# Main transcoding queue with DLQ configuration
resource "aws_sqs_queue" "transcoding_queue" {
  name                       = "${var.qut_student_id}-transcoding-queue"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.transcoding_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name            = "${var.qut_student_id}-transcoding-queue"
    "qut-username"  = var.qut_upn
    "qut-username2" = var.qut_upn2
    purpose         = "assessment 3"
  }
}
