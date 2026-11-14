import { api } from './client'

export interface AuthUser {
  username: string
  role: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export const authApi = {
  login: (body: { username: string; password: string }) => api.post<LoginResponse>('/auth/login', body),
}
