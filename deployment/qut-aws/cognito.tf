# Cognito User Pool
resource "aws_cognito_user_pool" "qut_cognito_user_pool" {
  name                     = "${var.qut_student_id}-video-app-user-pool"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length    = 12
    require_numbers   = true
    require_symbols   = true
    require_uppercase  = true
    require_lowercase = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  email_configuration {
    email_sending_account = var.cognito_email_sending_account
    from_email_address    = var.cognito_from_email_address
    source_arn            = var.cognito_ses_source_arn
  }

  tags = {
    Name            = "${var.qut_student_id}-video-app-user-pool"
    "qut-username"  = var.qut_upn
    "qut-username2" = var.qut_upn2
    purpose         = "assessment 2"
  }
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "qut_cognito_user_pool_domain" {
  user_pool_id = aws_cognito_user_pool.qut_cognito_user_pool.id
  domain       = "${var.qut_student_id}-video-app-user-pool-domain"
}

resource "aws_cognito_identity_provider" "qut_cognito_identity_provider" {
  count         = var.cognito_identity_provider_count
  user_pool_id  = aws_cognito_user_pool.qut_cognito_user_pool.id
  provider_name = "Google"
  provider_type = "Google"
  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
    authorize_url    = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url        = "https://www.googleapis.com/oauth2/v4/token"
    attributes_url   = "https://www.googleapis.com/oauth2/v2/userinfo"
    oidc_issuer      = "https://accounts.google.com"
  }
  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "qut_cognito_user_pool_client" {
  name                                 = "${var.qut_student_id}-video-app-user-pool-client"
  user_pool_id                         = aws_cognito_user_pool.qut_cognito_user_pool.id
  generate_secret                      = true
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation              = true
  explicit_auth_flows                  = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH", "ALLOW_CUSTOM_AUTH", "ALLOW_USER_PASSWORD_AUTH"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  callback_urls                        = [var.cognito_callback_url]
  logout_urls                          = [var.cognito_logout_url]
  supported_identity_providers          = ["Google", "COGNITO"]
  depends_on                           = [aws_cognito_user_pool_domain.qut_cognito_user_pool_domain]
  token_validity_units {
    refresh_token = "days"
    access_token  = "minutes"
    id_token      = "minutes"
  }
}

# Cognito User Group
resource "aws_cognito_user_group" "admin" {
  name         = "Admin"
  user_pool_id = aws_cognito_user_pool.qut_cognito_user_pool.id
  description  = "Admin group"
  precedence   = 1
}

resource "aws_cognito_user_group" "user" {
  name         = "User"
  user_pool_id = aws_cognito_user_pool.qut_cognito_user_pool.id
  description  = "User group"
  precedence   = 2
}
