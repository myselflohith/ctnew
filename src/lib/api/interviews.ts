import { apiClient } from "../api";

export interface AIInterviewQuestion {
  id?: string;
  question: string;
  category?: string;
  questionWeight: number;
  type: "custom" | "generated";
}

export interface AIInterviewPayload {
  interview_title: string;
  interview_description?: string;
  job_id: string;
  job_list: string;
  interview_duration: number;
  number_of_questions: number;
  interview_type: string;
  type_of_interview: string;
  question_type: string;
  questions: Array<{
    question: string;
    question_weight: number;
    category?: string;
  }>;
  ai_question?: string;
}

export interface AIInterviewResponse {
  id: string;
  interview_title: string;
  interview_description?: string;
  job_id: string;
  interview_duration: number;
  number_of_questions: number;
  interview_type: string;
  type_of_interview: string;
  created_at: string;
  updated_at: string;
  unique_token?: string;
}

export interface AIInterviewInvite {
  id: string;
  interview_id: string;
  candidate_name: string;
  candidate_email: string;
  status: "Pending" | "Completed" | "Archived";
  unique_interview_link: string;
  created_at: string;
  updated_at: string;
}

export interface AIInterviewReport {
  id: string;
  ai_interview_invite_id: string;
  rating?: string;
  ai_feedback?: string;
  score?: number;
  int_start_at?: string;
  int_end_at?: string;
  updated_at: string;
}

export interface InterviewListResponse {
  interviews: AIInterviewResponse[];
  total_count: number;
  total_pages: number;
  current_counts: number;
  per_page: number;
}

export interface CandidateInvitePayload {
  candidate_email: string;
  candidate_name: string;
  interview_id: string;
}

export interface CandidateInviteResponse {
  invite: AIInterviewInvite;
  success: boolean;
}

export const interviewsAPI = {
  // Create a new AI interview
  async createAIInterview(payload: {
    interview_param: AIInterviewPayload;
  }): Promise<{ interview: AIInterviewResponse; success: boolean }> {
    return apiClient.request<{ interview: AIInterviewResponse; success: boolean }>("/interviews/store", {
      method: "POST",
      body: JSON.stringify(payload),
    }) as Promise<{ interview: AIInterviewResponse; success: boolean }>;
  },

  // Get all interviews for the current user
  async getInterviews(
    page: number = 1,
    perPage: number = 25
  ): Promise<InterviewListResponse> {
    return apiClient.request<InterviewListResponse>("/interviews/list", {
      method: "GET",
    }) as unknown as Promise<InterviewListResponse>;
  },

  // Get interview details
  async getInterviewDetail(id: string): Promise<any> {
    const response = await apiClient.request<any>(`/interviews/${id}`, {
      method: "GET",
    });
    
    // Transform the response to match expected format
    return {
      interview: response.data || response,
      success: response.success || true,
    };
  },

  // Get interview invites/candidates
  async getInterviewCandidates(
    interviewId: string,
    page: number = 1,
    filters?: {
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      sortField?: string;
      sortDirection?: string;
    }
  ): Promise<{
    list: AIInterviewInvite[];
    total_count: number;
    total_pages: number;
    current_counts: number;
    per_page: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      status: filters?.status || "",
      search: filters?.search || "",
      start_date: filters?.startDate || "",
      end_date: filters?.endDate || "",
      sortField: filters?.sortField || "created_at",
      sortDirection: filters?.sortDirection || "DESC",
    });

    return apiClient.request<{
      list: AIInterviewInvite[];
      total_count: number;
      total_pages: number;
      current_counts: number;
      per_page: number;
    }>(`/interviews/${interviewId}/invites?${params}`, {
      method: "GET",
    }) as unknown as Promise<{
      list: AIInterviewInvite[];
      total_count: number;
      total_pages: number;
      current_counts: number;
      per_page: number;
    }>;
  },

  // Invite candidate to interview
  async inviteCandidate(
    interviewId: number,
    candidateName: string,
    candidateEmail: string,
    phoneNum?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return apiClient.request<{ success: boolean; data?: any; error?: string }>(
      `/interviews/${interviewId}/candidate_invite`,
      {
        method: "POST",
        body: JSON.stringify({
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          phone_num: phoneNum,
        }),
      }
    ) as Promise<{ success: boolean; data?: any; error?: string }>;
  },

  // Get candidate reports
  async getCandidateReports(
    interviewId: string,
    page: number = 1,
    filters?: {
      rating?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    list: (AIInterviewInvite & { ai_interview_report: AIInterviewReport })[];
    total_count: number;
    total_pages: number;
    current_counts: number;
    per_page: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      rating: filters?.rating || "",
      search: filters?.search || "",
      start_date: filters?.startDate || "",
      end_date: filters?.endDate || "",
    });

    return apiClient.request<{
      list: (AIInterviewInvite & { ai_interview_report: AIInterviewReport })[];
      total_count: number;
      total_pages: number;
      current_counts: number;
      per_page: number;
    }>(`/interviews/${interviewId}/reports?${params}`, {
      method: "GET",
    }) as unknown as Promise<{
      list: (AIInterviewInvite & { ai_interview_report: AIInterviewReport })[];
      total_count: number;
      total_pages: number;
      current_counts: number;
      per_page: number;
    }>;
  },

  // Generate AI questions
  async generateQuestions(
    interviewId: string
  ): Promise<{ questions: AIInterviewQuestion[]; success: boolean }> {
    return apiClient.request<{ questions: AIInterviewQuestion[]; success: boolean }>(`/interviews/${interviewId}/generate_questions`, {
      method: "POST",
    }) as Promise<{ questions: AIInterviewQuestion[]; success: boolean }>;
  },

  // Delete interview
  async deleteInterview(id: string): Promise<{ success: boolean }> {
    return apiClient.request<{ success: boolean }>(`/interviews/${id}`, {
      method: "DELETE",
    }) as Promise<{ success: boolean }>;
  },

  // Delete candidate invite
  async deleteInvite(interviewId: string, inviteId: string): Promise<{
    success: boolean;
  }> {
    return apiClient.request<{ success: boolean }>(`/interviews/${interviewId}/invites/${inviteId}`, {
      method: "DELETE",
    }) as Promise<{ success: boolean }>;
  },

  // Copy interview
  async copyInterview(id: string): Promise<{
    interview: AIInterviewResponse;
    success: boolean;
  }> {
    return apiClient.request<{ interview: AIInterviewResponse; success: boolean }>(`/interviews/${id}/copy`, {
      method: "POST",
    }) as Promise<{ interview: AIInterviewResponse; success: boolean }>;
  },

  // Get dashboard data
  async getDashboard(): Promise<{
    total: number;
    completed: number;
    pending: number;
    recent_completed: any[];
    recent_pending: any[];
    success: boolean;
  }> {
    return apiClient.request<{
      total: number;
      completed: number;
      pending: number;
      recent_completed: any[];
      recent_pending: any[];
      success: boolean;
    }>("/interviews/dashboard", {
      method: "GET",
    }) as Promise<{
      total: number;
      completed: number;
      pending: number;
      recent_completed: any[];
      recent_pending: any[];
      success: boolean;
    }>;
  },

  // Submit interview report
  async submitInterviewReport(
    interviewId: string | number,
    reportData: {
      ai_interview_invite_id: string | number;
      interview_start_at: string;
      transcript_text: string;
      rating?: string;
      score?: string;
      ai_feedback?: string;
      interview_video_url?: string;
      report_details?: Array<{
        question: string;
        transcript_text: string;
        video_url?: string;
        score?: string;
        rating?: string;
        ai_feedback?: string;
        que_type?: string;
      }>;
    }
  ): Promise<{ success: boolean; data?: any }> {
    return apiClient.request<{ success: boolean; data?: any }>(
      `/interviews/${interviewId}/submit_report`,
      {
        method: "POST",
        body: JSON.stringify(reportData),
      }
    ) as Promise<{ success: boolean; data?: any }>;
  },

  // Get talent interview schedules
  async getTalentInterviews(): Promise<{ success: boolean; data: any[] }> {
    return apiClient.request<{ success: boolean; data: any[] }>(
      "/interviews/talent/scheduled",
      {
        method: "GET",
      }
    ) as Promise<{ success: boolean; data: any[] }>;
  },

  // Get interview report details
  async getInterviewReportDetails(reportId: string | number): Promise<{ success: boolean; data: any }> {
    return apiClient.request<{ success: boolean; data: any }>(
      `/interviews/reports/${reportId}`,
      {
        method: "GET",
      }
    ) as Promise<{ success: boolean; data: any }>;
  },
};

export default interviewsAPI;
