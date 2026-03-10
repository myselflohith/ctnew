// Auth context and utilities
import { apiClient } from './api';

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  organization_id: string | null;
  role: 'talent' | 'employer' | 'recruiter' | 'admin' | 'investor';
  email_verified: boolean;

  // Talent profile fields (may be null)
  phone_number?: string | null;
  location?: string | null;
  linkedin_profile_url?: string | null;
  picture_url?: string | null;
  remote_interest?: string | null;
  salary_expectations?: string | null;
  skills?: string[];

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

export async function loginWithGoogle(idToken: string, role?: string): Promise<User> {
  const response = await apiClient.loginWithGoogle(idToken, role);
  return response.user;
}

export async function register(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  organizationId?: string | null;
  role: string;
  username?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  bio?: string | null;
  investmentInterests?: string | null;
  priorInvestments?: string | null;
}): Promise<User> {
  const response = await apiClient.register(data);
  return response.user;
}

export async function logout(): Promise<void> {
  await apiClient.logout();
}

export async function getCurrentUser(opts?: { force?: boolean }): Promise<User | null> {
  // Fast-path cache to prevent name flicker during navigation.
  // Allow callers (Profile page) to force-refresh after updates.
  if (!opts?.force) {
    try {
      const cached = sessionStorage.getItem("ct.currentUser");
      if (cached) return JSON.parse(cached) as User;
    } catch {
      // ignore cache errors
    }
  }

  try {
    const response = await apiClient.getCurrentUser();
    const user = response.user as User | null;

    try {
      if (user) sessionStorage.setItem("ct.currentUser", JSON.stringify(user));
    } catch {
      // ignore cache errors
    }

    return user;
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

export async function resendVerification(email: string): Promise<void> {
  await apiClient.resendVerification(email);
}
