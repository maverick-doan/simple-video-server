output "ecs_cluster_name" {
  value = aws_ecs_cluster.video_app_cluster.name
}

output "ecs_cluster_arn" {
  value = aws_ecs_cluster.video_app_cluster.arn
}

output "api_service_name" {
  value = aws_ecs_service.api_service.name
}

output "transcoding_worker_service_name" {
  value = aws_ecs_service.transcoding_worker.name
}

output "external_api_service_name" {
  value = aws_ecs_service.external_api.name
}

output "redis_service_name" {
  value = aws_ecs_service.redis_service.name
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

output "transcoding_queue_url" {
  value = aws_sqs_queue.transcoding_queue.url
}

output "transcoding_queue_arn" {
  value = aws_sqs_queue.transcoding_queue.arn
}

output "transcoding_dlq_url" {
  value = aws_sqs_queue.transcoding_dlq.url
}

output "transcoding_dlq_arn" {
  value = aws_sqs_queue.transcoding_dlq.arn
}

output "alb_dns_name" {
  value = aws_lb.video_app_alb.dns_name
}

output "alb_zone_id" {
  value = aws_lb.video_app_alb.zone_id
}

output "redis_nlb_dns_name" {
  value = aws_lb.redis_nlb_v2.dns_name
}

output "redis_nlb_zone_id" {
  value = aws_lb.redis_nlb_v2.zone_id
}