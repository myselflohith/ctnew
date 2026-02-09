// Auth context and utilities
import { apiClient } from './api';

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  role: 'talent' | 'employer' | 'recruiter' | 'admin';
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Auth helper functions
export async function login(email: string, password: string): Promise<User> {
  const response = await apiClient.login(email, password);
  return response.user;
}

export async function register(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  role: string;
}): Promise<User> {
  const response = await apiClient.register(data);
  return response.user;
}

export async function logout(): Promise<void> {
  await apiClient.logout();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiClient.getCurrentUser();
    return response.user;
  } catch (error) {
    return null;
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.forgotPassword(email);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiClient.resetPassword(token, password);
}
