# ================================================
# ECS Cluster
# ================================================

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

# CAB432SG (sg-032bd1ff8cf77dbb9) for all ECS services
# This security group has ports 3000-3010 open for our API services
# Redis (6379) will be accessible within the same security group for inter-service communication
# All services can communicate with each other since they're in the same security group
#
# Subnet Architecture:
# - Public Subnets: API Service (3000), External API Service (3001) - with public IPs
# - Private Subnets: Redis Service (6379), Transcoding Worker - no public IPs
# - Uses existing subnet data to avoid duplication

# ================================================
# ECS Task Definitions
# ================================================

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
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" }
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

    environment = [
      { name = "NODE_ENV", value = "production" }
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
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3001" }
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
      containerPort = 6379
      protocol      = "tcp"
    }]

    command = ["redis-server", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
  }])

  tags = {
    Name           = "${var.qut_student_id}-redis-service"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# ================================================
# ECS Services
# ================================================

# 1. Redis Service (Private subnet, no public IP)
resource "aws_ecs_service" "redis_service" {
  name            = "${var.qut_student_id}-redis-service"
  cluster         = aws_ecs_cluster.video_app_cluster.id
  task_definition = aws_ecs_task_definition.redis_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private_subnets.ids
    security_groups  = [data.aws_security_group.qut_security_group.id]
    assign_public_ip = false
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
    subnets          = data.aws_subnets.private_subnets.ids
    security_groups  = [data.aws_security_group.qut_security_group.id]
    assign_public_ip = false
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
