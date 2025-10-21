# Network Load Balancer for Redis (TCP service)
resource "aws_lb" "redis_nlb_v2" {
  name               = "${var.qut_student_id}-redis-nlb-v2"
  internal           = false
  load_balancer_type = "network"
  subnets            = [
    "subnet-075811427d5564cf9",  # aws-controltower-PublicSubnet2 (ap-southeast-2b)
    "subnet-05a3b8177138c8b14"   # aws-controltower-PublicSubnet1 (ap-southeast-2a)
  ]

  enable_deletion_protection = false

  tags = {
    Name           = "${var.qut_student_id}-redis-nlb-v2"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# NLB Target Group for Redis
resource "aws_lb_target_group" "redis_nlb_tg_v2" {
  name        = "${var.qut_student_id}-redis-nlb-tg-v2"
  port        = 3001
  protocol    = "TCP"
  vpc_id      = data.aws_vpc.qut_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    port                = "traffic-port"
    protocol            = "TCP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name           = "${var.qut_student_id}-redis-nlb-tg-v2"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

# NLB Listener for Redis
resource "aws_lb_listener" "redis_nlb_listener" {
  load_balancer_arn = aws_lb.redis_nlb_v2.arn
  port              = "3001"
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.redis_nlb_tg_v2.arn
  }

  tags = {
    Name           = "${var.qut_student_id}-redis-nlb-listener-v2"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

resource "aws_lb" "video_app_alb" {
  name               = "${var.qut_student_id}-video-app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [data.aws_security_group.qut_security_group.id]
  subnets            = [
    "subnet-075811427d5564cf9",  # aws-controltower-PublicSubnet2 (ap-southeast-2b)
    "subnet-05a3b8177138c8b14"   # aws-controltower-PublicSubnet1 (ap-southeast-2a)
  ]

  enable_deletion_protection = false

  tags = {
    Name           = "${var.qut_student_id}-video-app-alb-v2"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

resource "aws_lb_target_group" "external_api" {
  name        = "${var.qut_student_id}-external-api"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.qut_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name           = "${var.qut_student_id}-external-api-tg"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

resource "aws_lb_target_group" "api_service" {
  name        = "${var.qut_student_id}-api-service"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.qut_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name           = "${var.qut_student_id}-api-service-tg"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

resource "aws_lb_listener_rule" "external_api" {
  listener_arn = aws_lb_listener.video_app_https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.external_api.arn
  }

  condition {
    path_pattern {
      values = ["/external-api/*"]
    }
  }
}

resource "aws_lb_listener" "video_app_https" {
  load_balancer_arn = aws_lb.video_app_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.alb_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_service.arn
  }

  tags = {
    Name           = "${var.qut_student_id}-video-app-https-listener"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}

resource "aws_lb_listener" "video_app_http" {
  load_balancer_arn = aws_lb.video_app_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = {
    Name           = "${var.qut_student_id}-video-app-http-listener"
    "qut-username" = var.qut_upn
    purpose        = "assessment 3"
  }
}
