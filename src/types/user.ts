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