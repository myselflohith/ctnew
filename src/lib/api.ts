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

    // Always read the latest token from localStorage to avoid stale in-memory token
    // (fixes cases where some pages call APIs and get 401 even though user is logged in)
    const liveToken = localStorage.getItem('auth_token');
    if (liveToken) {
      this.token = liveToken;
      headers['Authorization'] = `Bearer ${liveToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      // Some endpoints (or error pages) may return plain text/HTML.
      // Try JSON first, then fall back to text for a clearer error.
      const rawText = await response.text();
      let data: any = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          (data && (data.error || data.message)) ||
          rawText ||
          'Request failed';
        throw new Error(message);
      }

      if (!data) {
        throw new Error(rawText || 'Invalid JSON response from server');
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
    username?: string | null;
    location?: string | null;
    linkedinUrl?: string | null;
    twitterUrl?: string | null;
    bio?: string | null;
    investmentInterests?: string | null;
    priorInvestments?: string | null;
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

  /** Talent signup with optional resume (saved to account after creation). */
  async registerTalent(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }, resumeFile?: File | null) {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (data.firstName != null) formData.append('firstName', data.firstName);
    if (data.lastName != null) formData.append('lastName', data.lastName);
    if (resumeFile) formData.append('resume', resumeFile);

    const response = await fetch(`${API_BASE_URL}/auth/register-talent`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error || 'Registration failed');
    }
    return json as { success: boolean; user: any; message?: string };
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

  async loginWithGoogle(idToken: string, role?: string) {
    const response = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken, role }),
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

  async updateCurrentUser(data: { firstName?: string; lastName?: string }) {
    return this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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

  async resendVerification(email: string) {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
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

  async extractResumeSkills(resumeId?: string) {
    return this.request<{ skills: string[] }>('/resumes/extract-skills', {
      method: 'POST',
      body: JSON.stringify({ resumeId }),
    });
  }

  /** Employer: get top-ranked talent candidates for Resume Database (rankScore >= minRank, default 80). */
  async getEmployerResumeDatabase(params?: { minRank?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.minRank !== undefined) search.set('minRank', String(params.minRank));
    if (params?.limit !== undefined) search.set('limit', String(params.limit));
    const qs = search.toString();
    return this.request('/resumes/employer/resume-database' + (qs ? `?${qs}` : ''));
  }

  /** Employer: search talent candidates in Resume Database using RESUME_MATCH_API (matchScore & rankScore >= 80 by default). */
  async searchEmployerResumeDatabase(params: { q: string; minRank?: number; minMatch?: number; limit?: number }) {
    const search = new URLSearchParams();
    search.set('q', params.q ?? '');
    if (params.minRank !== undefined) search.set('minRank', String(params.minRank));
    if (params.minMatch !== undefined) search.set('minMatch', String(params.minMatch));
    if (params.limit !== undefined) search.set('limit', String(params.limit));
    const qs = search.toString();
    return this.request('/resumes/employer/resume-database/search' + (qs ? `?${qs}` : ''));
  }

  /** Call RESUME_PARSER_API /upload_resume and return raw parsed output (for console logging). */
  async parseResumeWithParser(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/resumes/parse-resume`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Parse failed');
    }
    return data as { success: boolean; data: { parse?: unknown; rank?: unknown } };
  }

  /** Employer/Admin: get full candidate profile for a user (people + rank scores + resume summary). */
  async getEmployerCandidateProfile(userId: string) {
    return this.request(`/resumes/employer/candidate-profile/${userId}`);
  }

  // Profile endpoints
  async updateTalentProfile(data: {
    first_name?: string | null;
    last_name?: string | null;
    phone_number?: string | null;
    location?: string | null;
    linkedin_profile_url?: string | null;
    picture_url?: string | null;
    remote_interest?: string | boolean | null;
    salary_expectations?: string | null;
    skills?: string[] | null;
  }) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadTalentPhoto(file: File) {
    const formData = new FormData();
    formData.append('photo', file);

    const headers: HeadersInit = {};
    const liveToken = localStorage.getItem('auth_token');
    if (liveToken) headers['Authorization'] = `Bearer ${liveToken}`;

    const response = await fetch(`${API_BASE_URL}/uploads/profile-photo`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data as { success: boolean; url: string; user: any };
  }

  async uploadCompanyLogo(file: File, organizationId: string) {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('organizationId', organizationId);

    const headers: HeadersInit = {};
    const liveToken = localStorage.getItem('auth_token');
    if (liveToken) headers['Authorization'] = `Bearer ${liveToken}`;

    const response = await fetch(`${API_BASE_URL}/uploads/company-logo`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data as { success: boolean; url: string };
  }

  // Job endpoints
  async getAvailableJobs() {
    return this.request('/jobs/available');
  }

  /** Available jobs with match scores (talent only). Falls back to getAvailableJobs on 403. */
  async getAvailableJobsWithMatch() {
    return this.request('/jobs/available-with-match');
  }

  async getAllJobs() {
    return this.request('/jobs');
  }

  async getJobById(jobId: string) {
    return this.request(`/jobs/${jobId}`);
  }

  /** Get jobs for a company/organization (for investors startup profile). */
  async getJobsByCompany(companyName: string) {
    const params = new URLSearchParams({ company: companyName });
    return this.request(`/jobs/by-company?${params}`);
  }

  /** Search jobs in approved organizations (for investors startups tab). Returns jobs with company; open accordions for those companies. */
  async searchJobsInStartups(q: string) {
    const params = new URLSearchParams({ q: q.trim() });
    return this.request<{ id: string; title: string; company: string; location: string; type: string; salary?: string; posted_at: string; description?: string; status?: string }[]>(`/jobs/search?${params}`);
  }

  /** Get jobs for approved organizations with org info (for investors pitch room). */
  async getPitchRoomJobs() {
    return this.request('/jobs/pitch-room');
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

  /** Employer/Admin: update application status (e.g. Reject / Cancel rejection). */
  async updateApplicationStatus(applicationId: string, status: string) {
    return this.request(`/jobs/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getInterviews(filters?: { status?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString();
    return this.request(`/interviews/list${qs ? `?${qs}` : ''}`);
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

  async extractJobSkills(jobDescription: string) {
    return this.request<{ skills: string[] }>('/jobs/extract-skills', {
      method: 'POST',
      body: JSON.stringify({ jobDescription }),
    });
  }

  async extractJobRequirements(jobDescription: string) {
    return this.request<{ must_have: { requirement: string; weightage: number }[]; nice_to_have: { requirement: string; weightage: number }[] }>(
      '/jobs/extract-requirements',
      {
        method: 'POST',
        body: JSON.stringify({ jobDescription }),
      }
    );
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
  async requestCompanyApproval(displayName: string, userEmail: string, companyName: string) {
    return this.request<{ success: boolean }>('/auth/employer/request-company-approval', {
      method: 'POST',
      body: JSON.stringify({ displayName, userEmail, companyName }),
    });
  }

  /** Get approved organization names (for investors startups list). Auth required. */
  async getApprovedOrganizationNames() {
    return this.request<{ name: string | null }[]>('/organizations/approved-names');
  }

  // Admin endpoints
  async getAllOrganizations() {
    return this.request('/organizations/all');
  }

  /** Verify (approve) a pending organization. Admin only. */
  async verifyOrganization(organizationId: string) {
    return this.request<{ success: boolean; data: any }>(`/organizations/verify/${organizationId}`, {
      method: 'PUT',
    });
  }

  async getAllUsers() {
    return this.request('/auth/all');
  }
}

export const apiClient = new ApiClient();
