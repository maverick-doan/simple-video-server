resource "aws_ecs_cluster" "video_app_cluster" {
  name = "${var.qut_student_id}-video-app-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name           = "${var.qut_student_id}-video-app-cluster"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# Architecture:
# - API Service: https://[DNS_NAME]/ (default route via ALB)
# - External API Service: https://[DNS_NAME]/external-api/* (via ALB)
# - Redis Service: NLB (TCP) - accessible via NLB DNS name
# - Transcoding Worker: No load balancer, communicates via SQS
# - External API URL: https://[DNS_NAME]/external-api
# - Redis URL: redis://[NLB_DNS_NAME]:3001  

# 1. API Service Task Definition
resource "aws_ecs_task_definition" "api_service" {
  family                   = "${var.qut_student_id}-api-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]    
  cpu                      = 512  # 0.5 vCPU
  memory                   = 1024 # 1GB
  execution_role_arn       = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/Execution-Role-CAB432-ECS"
  task_role_arn            = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/Task-Role-CAB432-ECS"

  container_definitions = jsonencode([{
    name  = "api-service"
    image = "${aws_ecr_repository.qut_ecr_repository.repository_url}:latest"

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
      name          = "api-service"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "AWS_REGION", value = "ap-southeast-2" }
    ]

  }])

  tags = {
    Name           = "${var.qut_student_id}-api-service"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# 2. Transcoding Worker Task Definition
resource "aws_ecs_task_definition" "transcoding_worker" {
  family                   = "${var.qut_student_id}-transcoding-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 1024 # 1 vCPU
  memory                   = 2048 # 2GB
  execution_role_arn       = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/Execution-Role-CAB432-ECS"
  task_role_arn            = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/Task-Role-CAB432-ECS"

  container_definitions = jsonencode([{
    name  = "transcoding-worker"
    image = "${aws_ecr_repository.qut_ecr_repository.repository_url}:worker-latest"

    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
      name          = "transcoding-worker"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "AWS_REGION", value = "ap-southeast-2" }
    ]

  }])

  tags = {
    Name           = "${var.qut_student_id}-transcoding-worker"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# 3. External API Service Task Definition
resource "aws_ecs_task_definition" "external_api" {
  family                   = "${var.qut_student_id}-external-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256 # 0.25 vCPU
  memory                   = 512 # 0.5GB
  execution_role_arn       = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/Execution-Role-CAB432-ECS"
  task_role_arn            = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/Task-Role-CAB432-ECS"

  container_definitions = jsonencode([{
    name  = "external-api"
    image = "${aws_ecr_repository.qut_ecr_repository.repository_url}:external-latest"

    portMappings = [{
      containerPort = 3001
      protocol      = "tcp"
      name          = "external-api"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3001" },
      { name = "AWS_REGION", value = "ap-southeast-2" }
    ]
  }])

  tags = {
    Name           = "${var.qut_student_id}-external-api"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# 4. Redis Service Task Definition
resource "aws_ecs_task_definition" "redis_service" {
  family                   = "${var.qut_student_id}-redis-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256 # 0.25 vCPU
  memory                   = 512 # 0.5GB
  execution_role_arn       = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/Execution-Role-CAB432-ECS"
  task_role_arn            = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/Task-Role-CAB432-ECS"

  container_definitions = jsonencode([{
    name  = "redis"
    image = "redis:7-alpine"

    portMappings = [{
      containerPort = 3001
      protocol      = "tcp"
      name          = "redis"
    }]

    command = ["redis-server","--port", "3001", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
  }])

  tags = {
    Name           = "${var.qut_student_id}-redis-service"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# 1. Redis Service (Public subnet, with NLB)
resource "aws_ecs_service" "redis_service" {
  name            = "${var.qut_student_id}-redis-service"
  cluster         = aws_ecs_cluster.video_app_cluster.id
  task_definition = aws_ecs_task_definition.redis_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [data.aws_subnet.qut_subnet.id]
    security_groups  = [data.aws_security_group.qut_security_group.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.redis_nlb_tg_v2.arn
    container_name   = "redis"
    container_port   = 3001
  }

  tags = {
    Name           = "${var.qut_student_id}-redis-service"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# 2. External API Service (Public subnet, with public IP)
resource "aws_ecs_service" "external_api" {
  name            = "${var.qut_student_id}-external-api"
  cluster         = aws_ecs_cluster.video_app_cluster.id
  task_definition = aws_ecs_task_definition.external_api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [data.aws_subnet.qut_subnet.id]
    security_groups  = [data.aws_security_group.qut_security_group.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.external_api.arn
    container_name   = "external-api"
    container_port   = 3001
  }

  tags = {
    Name           = "${var.qut_student_id}-external-api"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# 3. API Service (Public subnet, with public IP)
resource "aws_ecs_service" "api_service" {
  name            = "${var.qut_student_id}-api-service"
  cluster         = aws_ecs_cluster.video_app_cluster.id
  task_definition = aws_ecs_task_definition.api_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [data.aws_subnet.qut_subnet.id]
    security_groups  = [data.aws_security_group.qut_security_group.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_service.arn
    container_name   = "api-service"
    container_port   = 3000
  }

  depends_on = [
    aws_ecs_service.redis_service,
    aws_ecs_service.external_api,
    aws_lb_listener.video_app_https
  ]

  tags = {
    Name           = "${var.qut_student_id}-api-service"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# 4. Transcoding Worker Service (Private subnet, no public IP)
resource "aws_ecs_service" "transcoding_worker" {
  name            = "${var.qut_student_id}-transcoding-worker"
  cluster         = aws_ecs_cluster.video_app_cluster.id
  task_definition = aws_ecs_task_definition.transcoding_worker.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [data.aws_subnet.qut_subnet.id]
    security_groups  = [data.aws_security_group.qut_security_group.id]
    assign_public_ip = true
  }

  depends_on = [
    aws_ecs_service.redis_service
  ]

  tags = {
    Name           = "${var.qut_student_id}-transcoding-worker"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# Target: scale DesiredCount for the transcoding worker
resource "aws_appautoscaling_target" "worker_desired_count" {
  max_capacity       = 4
  min_capacity       = 1
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.video_app_cluster.name}/${aws_ecs_service.transcoding_worker.name}"
  scalable_dimension = "ecs:service:DesiredCount"
}

# Policy: keep average CPU ~70%
resource "aws_appautoscaling_policy" "worker_cpu_target" {
  name               = "${var.qut_student_id}-worker-cpu-target"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.worker_desired_count.service_namespace
  resource_id        = aws_appautoscaling_target.worker_desired_count.resource_id
  scalable_dimension = aws_appautoscaling_target.worker_desired_count.scalable_dimension

  target_tracking_scaling_policy_configuration {
    target_value = 70

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "worker_sqs_depth_target" {
  name               = "${var.qut_student_id}-worker-sqs-depth"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.worker_desired_count.service_namespace
  resource_id        = aws_appautoscaling_target.worker_desired_count.resource_id
  scalable_dimension = aws_appautoscaling_target.worker_desired_count.scalable_dimension

  target_tracking_scaling_policy_configuration {
    target_value = 2

    customized_metric_specification {
      metric_name = "ApproximateNumberOfMessagesVisible"
      namespace   = "AWS/SQS"
      statistic   = "Average"
      unit        = "Count"

      dimensions {
        name  = "QueueName"
        value = aws_sqs_queue.transcoding_queue.name
      }
    }

    scale_in_cooldown  = 60
    scale_out_cooldown = 30
  }
}