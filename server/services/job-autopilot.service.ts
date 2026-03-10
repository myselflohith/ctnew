import { query } from '../database/connection.js';

export type AutopilotCandidate = {
  id: number;
  job_id: number;
  candidate_user_id: number;
  source_type: string;
  match_score: number | null;
  score_summary: string | null;
  detail_response: any | null;
  created_at: Date;
  updated_at: Date;

  // denormalized user fields
  candidate_email?: string | null;
  candidate_first_name?: string | null;
  candidate_last_name?: string | null;
};

export async function listAutopilotCandidatesForJob(jobId: string): Promise<AutopilotCandidate[]> {
  const result = await query(
    `SELECT
       jac.*,
       u.email AS candidate_email,
       u.first_name AS candidate_first_name,
       u.last_name AS candidate_last_name
     FROM job_autopilot_candidates jac
     JOIN users u ON u.id = jac.candidate_user_id
     WHERE jac.job_id = $1
     ORDER BY COALESCE(jac.match_score, 0) DESC, jac.created_at DESC`,
    [jobId]
  );

  return result.rows;
}
