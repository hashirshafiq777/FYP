import { request } from "./client";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface SignUpPayload {
  full_name: string;
  email: string;
  password: string;
}

export function signUp(payload: SignUpPayload): Promise<User> {
  return request<User>("/auth/signup", { method: "POST", body: payload });
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function fetchMe(signal?: AbortSignal): Promise<User> {
  return request<User>("/auth/me", { auth: true, signal });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST", auth: true });
}
