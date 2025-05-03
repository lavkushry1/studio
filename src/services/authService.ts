'use client'; // Required for potential client-side usage, although primarily used by hooks

import request from './api';
import type { LoginFormValues, RegisterFormValues } from '@/lib/validation/auth';

// Define types based on backend responses (align with swagger.yaml)
interface User {
  id: string;
  email: string;
  name?: string | null;
  role: 'USER' | 'ADMIN';
  // Add other fields as needed
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenResponse {
  accessToken: string;
}

// Login function
export const login = async (credentials: LoginFormValues): Promise<AuthResponse> => {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });
};

// Registration function
export const register = async (userData: RegisterFormValues): Promise<AuthResponse> => {
   // Backend expects optional role, let's omit it for standard user signup
  const { name, email, password } = userData;
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { name, email, password }, // Explicitly send only expected fields
  });
};

// Refresh token function
export const refreshAccessToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  return request<RefreshTokenResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
};

// Logout function
export const logout = async (refreshToken: string): Promise<{ message: string }> => {
  // The backend expects the refresh token to invalidate it
  return request<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
  });
};

// Get current user profile function
export const getMe = async (token: string): Promise<User> => {
    return request<User>('/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
};
