// API client for making requests to the backend

const API_BASE_URL = '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  user?: any;
  token?: string;
  message?: string;
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error: any) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    organizationId?: string | null;
    role: string;
  }) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // Resume endpoints
  async getResumes() {
    return this.request('/resumes');
  }

  async uploadResume(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  }

  async setDefaultResume(resumeId: string) {
    return this.request(`/resumes/${resumeId}/default`, {
      method: 'PUT',
    });
  }

  async deleteResume(resumeId: string) {
    return this.request(`/resumes/${resumeId}`, {
      method: 'DELETE',
    });
  }

  getResumeDownloadUrl(resumeId: string): string {
    return `${API_BASE_URL}/resumes/${resumeId}/download`;
  }

  // Job endpoints
  async getAvailableJobs() {
    return this.request('/jobs/available');
  }

  async getAllJobs() {
    return this.request('/jobs');
  }

  async getJobById(jobId: string) {
    return this.request(`/jobs/${jobId}`);
  }

  async saveJob(jobId: string) {
    return this.request(`/jobs/${jobId}/save`, {
      method: 'POST',
    });
  }

  async getSavedJobs() {
    return this.request('/jobs/saved/list');
  }

  async removeSavedJob(jobId: string) {
    return this.request(`/jobs/saved/${jobId}`, {
      method: 'DELETE',
    });
  }

  async applyToJob(jobId: string, resumeId: string) {
    return this.request(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ resumeId }),
    });
  }

  async getApplications() {
    return this.request('/jobs/applications/list');
  }

  async getInterviews() {
    return this.request('/interviews/list');
  }

  async createJob(jobData: {
    title: string;
    company: string;
    location: string;
    type: 'remote' | 'hybrid' | 'onsite';
    salary?: string;
    match_score?: number;
    skills?: string[];
    description?: string;
    addNotes?: string;
  }) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  async updateJob(jobId: string, jobData: any) {
    return this.request(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
  }

  async updateJobStatus(jobId: string, status: 'active' | 'paused' | 'closed', statusReason?: string) {
    return this.request(`/jobs/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, status_reason: statusReason }),
    });
  }

  async getJobApplications(jobId: string) {
    return this.request(`/jobs/${jobId}/applications`);
  }

  // Organization endpoints
  /** Public: search organizations for signup autocomplete (no auth required). */
  async searchOrganizations(query: string, limit = 10) {
    const params = new URLSearchParams({ q: query.trim() });
    if (limit !== 10) params.set('limit', String(limit));
    return this.request<{ id: string; name: string | null }[]>(`/organizations/search?${params}`);
  }

  async getOrganization(companyName: string) {
    return this.request(`/organizations/${companyName}`);
  }

  async saveOrganization(orgData: any) {
    return this.request('/organizations', {
      method: 'POST',
      body: JSON.stringify(orgData),
    });
  }

  async getOrganizationRequirements(companyName: string) {
    return this.request(`/organizations/${companyName}/requirements`);
  }

  async addOrganizationRequirement(companyName: string, requirement: { requirement_text: string; requirement_type: string; weight: number }) {
    return this.request(`/organizations/${companyName}/requirements`, {
      method: 'POST',
      body: JSON.stringify(requirement),
    });
  }

  async updateOrganizationRequirement(requirementId: string, requirement: { requirement_text: string; requirement_type: string; weight: number }) {
    return this.request(`/organizations/requirements/${requirementId}`, {
      method: 'PUT',
      body: JSON.stringify(requirement),
    });
  }

  async deleteOrganizationRequirement(requirementId: string) {
    return this.request(`/organizations/requirements/${requirementId}`, {
      method: 'DELETE',
    });
  }

  // Employer onboarding: suggested org by email domain, validate company name, set company
  async getEmployerSuggestedOrg() {
    return this.request<{ id: string; name: string | null } | null>('/auth/employer/suggested-org');
  }
  async validateEmployerCompany(companyName: string) {
    return this.request<{ found: boolean; organization?: { id: string; name: string | null } }>('/auth/employer/validate-company', {
      method: 'POST',
      body: JSON.stringify({ companyName }),
    });
  }
  async setEmployerCompany(organizationId: string, companyName: string) {
    return this.request<{ user: unknown }>('/auth/employer/set-company', {
      method: 'POST',
      body: JSON.stringify({ organizationId, companyName }),
    });
  }

  // Admin endpoints
  async getAllOrganizations() {
    return this.request('/organizations/all');
  }

  async getAllUsers() {
    return this.request('/auth/all');
  }
}

export const apiClient = new ApiClient();
