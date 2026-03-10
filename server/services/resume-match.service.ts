export type ResumeMatchRequest = {
  job_description: string;
  notes: string;
  resume_service_urls: Array<{
    id: string;
    url: string | null;
    resume_text: string;
  }>;
};

export type ResumeMatchResultRow = {
  id: string | number;
  score?: number | null;
  summary?: string | null;
  checklist?: any;
  [k: string]: any;
};

export type ResumeMatchResponse = {
  results?: ResumeMatchResultRow[];
  [k: string]: any;
};

function getResumeMatchApiUrl(): string {
  const url = (process.env.RESUME_MATCH_API || '').trim();
  if (!url) throw new Error('RESUME_MATCH_API not configured');
  return url;
}

/**
 * Equivalent to ch-job-marketplace ParseResumeService.get_match_score_data(...)
 * - Sends JSON to RESUME_MATCH_API
 * - Expects JSON response with { results: [...] }
 */
export async function getMatchScoreData(payload: ResumeMatchRequest): Promise<ResumeMatchResponse> {
  const url = getResumeMatchApiUrl();

  const controller = new AbortController();
  // The resume-match service can be slow, especially when it needs to fetch/parse resumes.
  // Default to 2 minutes unless overridden.
  const timeoutMs = Number(process.env.RESUME_MATCH_TIMEOUT_MS || 120000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // FastAPI often 307-redirects `/match` -> `/match/`.
    // Ensure fetch follows redirects (and we keep POST semantics).
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: 'follow',
    });

    const raw = await response.text().catch(() => '');
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const detail =
        (data && (data.error || data.message || data.detail)) ||
        raw ||
        `Resume match API failed (${response.status})`;

      // Keep HTTP status + response body in the error message so the worker logs show root cause.
      throw new Error(`Resume match API failed (${response.status}): ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }

    return (data || {}) as ResumeMatchResponse;
  } finally {
    clearTimeout(timeout);
  }
}
