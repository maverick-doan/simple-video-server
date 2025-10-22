# Lambda function for DLQ processing using existing CAB432-Lambda-Role
resource "aws_lambda_function" "dlq_handler" {
  filename         = "../../scripts/dlq_handler.zip"
  function_name    = "${var.qut_student_id}-dlq-handler"
  role            = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/CAB432-Lambda-Role"
  handler         = "dlq_handler.lambda_handler"
  runtime         = "python3.9"
  timeout         = 30

  environment {
    variables = {
      LOG_LEVEL = "INFO"
    }
  }

  tags = {
    Name           = "${var.qut_student_id}-dlq-handler"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# Event source mapping for SQS DLQ
resource "aws_lambda_event_source_mapping" "dlq_mapping" {
  event_source_arn = aws_sqs_queue.transcoding_dlq.arn
  function_name    = aws_lambda_function.dlq_handler.arn
  batch_size       = 1
  maximum_batching_window_in_seconds = 0
  tags = {
    Name           = "${var.qut_student_id}-dlq-mapping"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}