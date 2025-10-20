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
    Name           = "${var.qut_student_id}-video-app-alb"
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
