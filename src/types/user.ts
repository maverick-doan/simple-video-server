export type Role = "admin" | "user";
export type AuthProvider = "local" | "cognito";

export interface JwtUser {
    sub: string;
    username: string;
    email: string;
    role: Role;
    authProvider: AuthProvider;
}
  
export interface LoginRequest {
    username: string;
    password: string;
}

export interface CognitoLoginRequest {
    username: string;
    password: string;
    mfaCode?: string;
}

export interface CognitoMFASetupRequest {
    accessToken: string;
}

export interface CognitoMFAVerifyRequest {
    accessToken: string;
    userCode: string;
}