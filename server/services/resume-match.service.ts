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
export async function getMatchScoreData(
  payload: ResumeMatchRequest
): Promise<ResumeMatchResponse> {
  const url = getResumeMatchApiUrl();

  // Retry transient network errors from undici/node fetch (ECONNRESET, ETIMEDOUT, etc.)
  // This is especially common when the upstream (FastAPI / LLM / proxy) is under load.
  const maxAttempts = Number(process.env.RESUME_MATCH_MAX_ATTEMPTS || 3);
  const baseBackoffMs = Number(process.env.RESUME_MATCH_RETRY_BACKOFF_MS || 750);

  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    // The resume-match service can be slow, especially when it needs to fetch/parse resumes.
    // Default to 2 minutes unless overridden.
    const timeoutMs = Number(process.env.RESUME_MATCH_TIMEOUT_MS || 120000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // FastAPI often 307-redirects `/match` -> `/match/`.
      // Ensure fetch follows redirects (and we keep POST semantics).
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: "follow",
      });

      const raw = await response.text().catch(() => "");
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

        // 429/5xx can be transient; retry them.
        const retriableStatus =
          response.status === 408 ||
          response.status === 409 ||
          response.status === 425 ||
          response.status === 429 ||
          (response.status >= 500 && response.status <= 599);

        const err = new Error(
          `Resume match API failed (${response.status}): ${
            typeof detail === "string" ? detail : JSON.stringify(detail)
          }`
        );

        if (!retriableStatus || attempt === maxAttempts) throw err;

        lastErr = err;
      } else {
        return (data || {}) as ResumeMatchResponse;
      }
    } catch (e: any) {
      lastErr = e;

      const msg = String(e?.message || e);

      // AbortController timeout
      const aborted =
        e?.name === "AbortError" ||
        msg.toLowerCase().includes("aborted") ||
        msg.toLowerCase().includes("abort");

      // undici / network style failures often bubble as "fetch failed" with a nested cause
      const causeCode =
        (e?.cause && (e.cause.code || e.cause.errno)) ||
        e?.code ||
        e?.errno ||
        null;

      const retriableNetwork =
        aborted ||
        msg.includes("fetch failed") ||
        causeCode === "ECONNRESET" ||
        causeCode === "ETIMEDOUT" ||
        causeCode === "EAI_AGAIN" ||
        causeCode === "ENOTFOUND" ||
        causeCode === "ECONNREFUSED";

      if (!retriableNetwork || attempt === maxAttempts) throw e;
    } finally {
      clearTimeout(timeout);
    }

    // Exponential backoff (with a little jitter)
    const sleepMs = Math.round(
      baseBackoffMs * Math.pow(2, attempt - 1) +
        Math.random() * Math.min(250, baseBackoffMs)
    );
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, sleepMs));
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("Resume match API failed after retries");
}
