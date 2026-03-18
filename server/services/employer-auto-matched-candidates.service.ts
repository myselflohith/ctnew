import { query } from '../database/connection.js';

export type EmployerAutoMatchedCandidate = {
  id: number;
  person_id: number;
  job_id: number;
  match_score: number | null;
  detail_response: string | null;
  interested: number | null;
  email_sent_at: Date | null;
  discarded_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CandidateProfileForRecommendation = {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  location: string | null;
  linkedin_profile_url: string | null;
  picture_url: string | null;
  skills: string[] | null;
  phone_number: string | null;

  // Extra fields for employer recommended candidates table
  current_company: string | null;
  current_position: string | null;

  created_at: Date;
  updated_at: Date;

  // Public URL to resume file (if present)
  resume_url: string | null;
};

export type EmployerAutoMatchedCandidateWithProfile = EmployerAutoMatchedCandidate & {
  candidate: CandidateProfileForRecommendation | null;
};

export async function listEmployerAutoMatchedCandidatesForJob(params: {
  jobId: string;
}): Promise<EmployerAutoMatchedCandidate[]> {
  const result = await query(
    `SELECT *
     FROM employer_auto_matched_candidates
     WHERE job_id = $1
       AND discarded_at IS NULL
     ORDER BY COALESCE(match_score, 0) DESC, created_at DESC`,
    [params.jobId]
  );

  return result.rows;
}

/**
 * Parity with ch-job-marketplace recommended candidates: return the recommendation rows plus
 * "who the person is" (basic profile fields) so UI can render a usable list (name, email, etc).
 *
 * NOTE: In ctnew, "candidate profiles" live in `users` table (talent users).
 * We join `employer_auto_matched_candidates.person_id` -> `users.id`.
 */
export async function listEmployerAutoMatchedCandidatesForJobWithProfiles(params: {
  jobId: string;
}): Promise<EmployerAutoMatchedCandidateWithProfile[]> {
  const result = await query(
    `SELECT
        e.*,
        u.id AS u_id,
        u.email AS u_email,
        u.first_name AS u_first_name,
        u.last_name AS u_last_name,
        u.company_name AS u_company_name,
        u.location AS u_location,
        u.linkedin_profile_url AS u_linkedin_profile_url,
        u.picture_url AS u_picture_url,
        u.skills AS u_skills,
        u.phone_number AS u_phone_number,
        u.current_employer AS u_current_employer,
        u.current_position AS u_current_position,
        u.created_at AS u_created_at,
        u.updated_at AS u_updated_at,
        r.file_path AS r_file_path
     FROM employer_auto_matched_candidates e
     LEFT JOIN users u ON u.id = e.person_id
     LEFT JOIN LATERAL (
       SELECT r1.*
       FROM resumes r1
       WHERE r1.user_id = u.id
       ORDER BY r1.is_default DESC, r1.created_at DESC
       LIMIT 1
     ) r ON true
     WHERE e.job_id = $1
       AND e.discarded_at IS NULL
     ORDER BY COALESCE(e.match_score, 0) DESC, e.created_at DESC`,
    [params.jobId]
  );

  return (result.rows as any[]).map((r) => {
    const candidate =
      r.u_id == null
        ? null
        : ({
            id: Number(r.u_id),
            email: r.u_email ?? null,
            first_name: r.u_first_name ?? null,
            last_name: r.u_last_name ?? null,
            company_name: r.u_company_name ?? null,
            location: r.u_location ?? null,
            linkedin_profile_url: r.u_linkedin_profile_url ?? null,
            picture_url:
              r.u_picture_url == null
                ? null
                : typeof r.u_picture_url === 'string'
                  ? r.u_picture_url
                  : JSON.stringify(r.u_picture_url),
            skills: Array.isArray(r.u_skills) ? r.u_skills : null,
            phone_number: r.u_phone_number ?? null,
            current_company: r.u_current_employer ?? null,
            current_position: r.u_current_position ?? null,
            created_at: r.u_created_at,
            updated_at: r.u_updated_at,
            resume_url: r.r_file_path ?? null,
          } satisfies CandidateProfileForRecommendation);

    // Strip join helper cols from base row
    const {
      u_id,
      u_email,
      u_first_name,
      u_last_name,
      u_company_name,
      u_location,
      u_linkedin_profile_url,
      u_picture_url,
      u_skills,
      u_created_at,
      u_updated_at,
      u_phone_number,
      u_current_employer,
      u_current_position,
      r_file_path,
      ...base
    } = r;

    return { ...(base as EmployerAutoMatchedCandidate), candidate };
  });
}
