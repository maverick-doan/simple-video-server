export type Role = "admin" | "user";

export interface JwtUser {
    sub: string;
    username: string;
    email: string;
    role: Role;
}
  
export interface LoginRequest {
    username: string;
    password: string;
}