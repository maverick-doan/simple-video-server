# EC2 Instance (For development)
resource "aws_key_pair" "ssh_key" {
  key_name   = "${var.qut_student_id}-video-app-key"
  public_key = file(var.public_key_path)
  tags = {
    "qut-username" = var.qut_upn
    purpose        = "assessment 1"
  }
}

resource "aws_instance" "qut_instance" {
  ami                         = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnet.qut_subnet.id
  vpc_security_group_ids      = [data.aws_security_group.qut_security_group.id]
  key_name                    = aws_key_pair.ssh_key.key_name
  iam_instance_profile        = var.instance_profile_name
  associate_public_ip_address = true

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size_gb
  }

  tags = {
    Name            = "${var.qut_student_id}-video-app-ec2"
    "qut-username"  = var.qut_upn
    "qut-username2" = var.qut_upn2
    purpose         = "assessment 1"
  }
}
