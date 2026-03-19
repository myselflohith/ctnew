import { query } from '../database/connection.js';
import { extractRequirementsFromJobDescription } from './job-ai.service.js';

// Map jobs table row to Job shape (jobs uses: name, company_name, job_salary, work_type, status int, active bool)
const JOB_SELECT = `
  j.id,
  j.name AS title,
  j.company_name AS company,
  j.location,
  j.work_type::varchar AS type,
  j.job_salary AS salary,
  j.created_at AS posted_at,
  NULL::integer AS match_score,
  CASE WHEN j.skills IS NOT NULL AND j.skills != '' THEN string_to_array(trim(j.skills), ',') ELSE ARRAY[]::text[] END AS skills,
  j.description,
  CASE WHEN j.active = false THEN 'closed' WHEN j.status = 1 THEN 'paused' ELSE 'active' END AS status,
  j.created_at,
  j.updated_at,
  COALESCE(j.autopilot_sourcing, 0) AS autopilot_sourcing,
  j.target_count,
  j.distance,
  j.days_in_office,
  j.add_notes
`;

// Same as JOB_SELECT but also includes creator_id for employer/admin UIs
// (e.g. to distinguish "My Jobs" vs "Org Jobs" views).
const JOB_SELECT_WITH_CREATOR_ID = `
  j.id,
  j.name AS title,
  j.company_name AS company,
  j.location,
  j.work_type::varchar AS type,
  j.job_salary AS salary,
  j.created_at AS posted_at,
  NULL::integer AS match_score,
  CASE WHEN j.skills IS NOT NULL AND j.skills != '' THEN string_to_array(trim(j.skills), ',') ELSE ARRAY[]::text[] END AS skills,
  j.description,
  CASE WHEN j.active = false THEN 'closed' WHEN j.status = 1 THEN 'paused' ELSE 'active' END AS status,
  j.created_at,
  j.updated_at,
  COALESCE(j.autopilot_sourcing, 0) AS autopilot_sourcing,
  j.target_count,
  j.distance,
  j.days_in_office,
  j.add_notes,
  j.creator_id AS creator_id
`;
// Same as JOB_SELECT but with j.id AS job_id for use in application/saved joins
const JOB_SELECT_AS_JOB = `
  j.id AS job_id,
  j.name AS title,
  j.company_name AS company,
  j.location,
  j.work_type::varchar AS type,
  j.job_salary AS salary,
  j.created_at AS posted_at,
  NULL::integer AS match_score,
  CASE WHEN j.skills IS NOT NULL AND j.skills != '' THEN string_to_array(trim(j.skills), ',') ELSE ARRAY[]::text[] END AS skills,
  j.description,
  CASE WHEN j.active = false THEN 'closed' WHEN j.status = 1 THEN 'paused' ELSE 'active' END AS status
`;

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type?: 'remote' | 'hybrid' | 'onsite' | null;
  salary?: string;
  posted_at: Date;
  match_score?: number;
  /** Human-readable explanation (from detail_response.summary / score_summary) */
  match_summary?: string | null;
  /** Full structured match details (detail_response JSON) */
  detail_response?: any | null;
  skills?: string[];
  description?: string;
  status?: 'active' | 'paused' | 'closed';
  status_reason?: string;
  paused_at?: Date;
  created_at: Date;
  updated_at: Date;

  // Autosourcing (autopilot)
  autopilot_sourcing?: boolean;
  target_count?: number | null;

  // Employer ownership (used to show "My Jobs" vs org-wide jobs)
  creator_id?: number | null;

  // Location / office details
  distance?: string | null;
  days_in_office?: number | null;

  // Raw requirements text (for parsing back into requirements UI)
  add_notes?: string | null;
}

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  created_at: Date;
  job?: Job;
}

export interface JobApplication {
  id: string;
  user_id: string;
  job_id: string;
  resume_id?: string;
  status: 'Application Sent' | 'Under Review' | 'Interview Scheduled' | 'Rejected' | 'Accepted';
  applied_at: Date;
  updated_at: Date;
  job?: Job;
  candidate_name?: string;
  candidate_email?: string;
}

export interface Interview {
  id: string;
  user_id: string;
  application_id: string;
  interview_type: 'Video' | 'Phone' | 'Onsite';
  scheduled_date?: Date;
  scheduled_time?: string;
  interviewer?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  notes?: string;
  created_at: Date;
  updated_at: Date;
  application?: JobApplication;
}

// Get all available jobs (not saved by user and not applied to)
export async function getAvailableJobs(userId: string): Promise<Job[]> {
  const result = await query(
    `SELECT ${JOB_SELECT}
     FROM jobs j
     WHERE j.id NOT IN (
       SELECT job_id FROM ct_jobs_saved WHERE user_id = $1
     )
     AND j.id NOT IN (
       SELECT job_id FROM ct_job_applications WHERE user_id = $1
     )
     AND NOT EXISTS (
       SELECT 1
       FROM employer_auto_matched_candidates e
       WHERE e.job_id = j.id
         AND e.source_type = 'talent'
         AND e.person_id = (SELECT COALESCE(u.person_id, u.id) FROM users u WHERE u.id = $1)
         AND COALESCE(e.person_reject_job, 0) = 1
     )
     AND j.active = true
     AND j.discarded_at IS NULL
     ORDER BY j.created_at DESC`,
    [userId]
  );
  return result.rows;
}

const AVAILABLE_JOBS_WITH_MATCH_LIMIT = 100;

/** Used by talent-job-matching worker: returns available job id, description, add_notes for match API. */
export async function getAvailableJobsForMatching(userId: string): Promise<
  { id: number; description: string | null; add_notes: string | null }[]
> {
  const result = await query(
    `SELECT j.id, j.description, j.add_notes
     FROM jobs j
     WHERE j.id NOT IN (SELECT job_id FROM ct_jobs_saved WHERE user_id = $1)
     AND j.id NOT IN (SELECT job_id FROM ct_job_applications WHERE user_id = $1)
     AND NOT EXISTS (
       SELECT 1
       FROM employer_auto_matched_candidates e
       WHERE e.job_id = j.id
         AND e.source_type = 'talent'
         AND e.person_id = (SELECT COALESCE(u.person_id, u.id) FROM users u WHERE u.id = $1)
         AND COALESCE(e.person_reject_job, 0) = 1
     )
     AND j.active = true
     AND j.discarded_at IS NULL
     ORDER BY j.created_at DESC
     LIMIT 200`,
    [userId]
  );
  return (result.rows || []).map((r: any) => ({
    id: Number(r.id),
    description: r.description != null ? String(r.description) : null,
    add_notes: r.add_notes != null ? String(r.add_notes) : null,
  }));
}

/**
 * Available jobs with match scores from employer_auto_matched_candidates (worker precomputed; same table as Ruby).
 * Uses person_id from users; sorts by match_score DESC NULLS LAST, then created_at DESC.
 */
export async function getAvailableJobsWithMatch(userId: string): Promise<Job[]> {
  const result = await query(
    `SELECT
       j.id,
       j.name AS title,
       j.company_name AS company,
       j.location,
       j.work_type::varchar AS type,
       j.job_salary AS salary,
       j.created_at AS posted_at,
       m.match_score,
       m.score_summary AS match_score_summary,
       m.detail_response,
       CASE WHEN j.skills IS NOT NULL AND j.skills != '' THEN string_to_array(trim(j.skills), ',') ELSE ARRAY[]::text[] END AS skills,
       j.description,
       CASE WHEN j.active = false THEN 'closed' WHEN j.status = 1 THEN 'paused' ELSE 'active' END AS status,
       j.created_at,
       j.updated_at
     FROM jobs j
     LEFT JOIN LATERAL (
       SELECT m.*
       FROM employer_auto_matched_candidates m
       WHERE m.job_id = j.id
         AND m.person_id = (SELECT COALESCE(u.person_id, u.id) FROM users u WHERE u.id = $1)
         AND m.source_type = 'talent'
       ORDER BY m.created_at DESC
       LIMIT 1
     ) m ON TRUE
     WHERE j.id NOT IN (SELECT job_id FROM ct_jobs_saved WHERE user_id = $1)
     AND j.id NOT IN (SELECT job_id FROM ct_job_applications WHERE user_id = $1)
     AND j.active = true
     AND j.discarded_at IS NULL
     AND COALESCE(m.person_reject_job, 0) = 0
     ORDER BY m.match_score DESC NULLS LAST, j.created_at DESC
     LIMIT $2`,
    [userId, AVAILABLE_JOBS_WITH_MATCH_LIMIT]
  );
  const rows = (result.rows || []) as (Job & { add_notes?: string | null })[];
  const withScore = rows.filter((r) => r.match_score != null).length;
  console.log('[getAvailableJobsWithMatch]', { userId, total: rows.length, withMatchScore: withScore });
  return rows;
}

// Get all jobs (for admin/employer)
export async function getAllJobs(): Promise<Job[]> {
  const result = await query(
    `SELECT ${JOB_SELECT_WITH_CREATOR_ID}
     FROM jobs j
     WHERE j.discarded_at IS NULL
     ORDER BY j.created_at DESC`
  );
  return result.rows;
}

// Employer: return all jobs for the employee's organization.
// Match: same company_name (case-insensitive trim) OR same organization_id OR jobs created by this user.
// Jobs are usually created with company_name only (organization_id often null), so company_name match is primary.
export async function getJobsForEmployer(userId: number): Promise<Job[]> {
  const userResult = await query(
    'SELECT company_name, organization_id FROM users WHERE id = $1',
    [userId]
  );
  const row = userResult.rows[0];
  const companyName = row?.company_name != null ? String(row.company_name).trim() : null;
  const organizationId = row?.organization_id ?? null;

  const result = await query(
    `SELECT ${JOB_SELECT_WITH_CREATOR_ID}
     FROM jobs j
     WHERE j.discarded_at IS NULL
       AND (
         j.creator_id = $1
         OR ($2::text IS NOT NULL AND $2 != '' AND LOWER(TRIM(COALESCE(j.company_name, ''))) = LOWER(TRIM($2)))
         OR ($3::uuid IS NOT NULL AND j.organization_id = $3::uuid)
       )
     ORDER BY j.created_at DESC`,
    [userId, companyName || null, organizationId]
  );
  return result.rows;
}

// Get job by ID
export async function getJobById(jobId: string): Promise<Job | null> {
  const result = await query(
    `SELECT ${JOB_SELECT} FROM jobs j WHERE j.id = $1 AND j.discarded_at IS NULL`,
    [jobId]
  );
  return result.rows[0] || null;
}

// Get jobs by company/organization name (for investors viewing a startup's jobs).
// Uses jobs.organization_id when set; falls back to company_name match.
export async function getJobsByCompanyName(companyName: string): Promise<Job[]> {
  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    return [];
  }
  const name = companyName.trim();
  const result = await query(
    `SELECT ${JOB_SELECT} FROM jobs j
     WHERE j.discarded_at IS NULL
       AND (
         j.organization_id = (SELECT id FROM organizations WHERE discarded_at IS NULL AND status = 'approved' AND TRIM(name) = $1 LIMIT 1)
         OR TRIM(COALESCE(j.company_name, '')) = $1
       )
     ORDER BY j.created_at DESC`,
    [name]
  );
  return result.rows;
}

// Select for pitch room: same as JOB_SELECT plus organization_id and organization_name for grouping
const PITCH_ROOM_SELECT = `
  j.id,
  j.name AS title,
  j.company_name AS company,
  j.location,
  j.work_type::varchar AS type,
  j.job_salary AS salary,
  j.created_at AS posted_at,
  NULL::integer AS match_score,
  CASE WHEN j.skills IS NOT NULL AND j.skills != '' THEN string_to_array(trim(j.skills), ',') ELSE ARRAY[]::text[] END AS skills,
  j.description,
  CASE WHEN j.active = false THEN 'closed' WHEN j.status = 1 THEN 'paused' ELSE 'active' END AS status,
  j.created_at,
  j.updated_at,
  j.organization_id,
  (SELECT o.name FROM organizations o WHERE (o.id = j.organization_id OR (j.organization_id IS NULL AND TRIM(o.name) = TRIM(COALESCE(j.company_name, '')))) AND o.discarded_at IS NULL AND o.status = 'approved' LIMIT 1) AS organization_name
`;

export interface JobWithOrg extends Job {
  organization_id?: string | null;
  organization_name?: string | null;
}

// Get all jobs for approved organizations (for investors pitch room), with org info for grouping.
export async function getJobsForApprovedOrganizations(): Promise<JobWithOrg[]> {
  const result = await query(
    `SELECT ${PITCH_ROOM_SELECT} FROM jobs j
     WHERE j.discarded_at IS NULL
       AND (
         j.organization_id IN (SELECT id FROM organizations WHERE discarded_at IS NULL AND status = 'approved')
         OR TRIM(COALESCE(j.company_name, '')) IN (SELECT TRIM(name) FROM organizations WHERE discarded_at IS NULL AND status = 'approved')
       )
     ORDER BY COALESCE((SELECT o.name FROM organizations o WHERE (o.id = j.organization_id OR (j.organization_id IS NULL AND TRIM(o.name) = TRIM(COALESCE(j.company_name, '')))) AND o.discarded_at IS NULL AND o.status = 'approved' LIMIT 1), j.company_name), j.created_at DESC`
  );
  return result.rows;
}

// Search jobs in approved organizations by query (title, description, skills, location, company).
export async function searchJobsInApprovedOrganizations(searchQuery: string): Promise<JobWithOrg[]> {
  if (!searchQuery || typeof searchQuery !== 'string' || !searchQuery.trim()) {
    return [];
  }
  const pattern = `%${searchQuery.trim().replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
  const result = await query(
    `SELECT ${PITCH_ROOM_SELECT} FROM jobs j
     WHERE j.discarded_at IS NULL
       AND (
         j.organization_id IN (SELECT id FROM organizations WHERE discarded_at IS NULL AND status = 'approved')
         OR TRIM(COALESCE(j.company_name, '')) IN (SELECT TRIM(name) FROM organizations WHERE discarded_at IS NULL AND status = 'approved')
       )
       AND (
         j.name ILIKE $1 OR j.description ILIKE $1 OR j.skills ILIKE $1
         OR j.location ILIKE $1 OR j.company_name ILIKE $1
       )
     ORDER BY COALESCE((SELECT o.name FROM organizations o WHERE (o.id = j.organization_id OR (j.organization_id IS NULL AND TRIM(o.name) = TRIM(COALESCE(j.company_name, '')))) AND o.discarded_at IS NULL AND o.status = 'approved' LIMIT 1), j.company_name), j.created_at DESC`,
    [pattern]
  );
  return result.rows;
}

// Create a new job (creatorId = logged-in user creating the job)
export async function createJob(
  jobData: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'posted_at'> & {
    addNotes?: string | null;
    autopilot_sourcing?: boolean;
    target_count?: number | null;

    // Extended employer fields (parity with legacy Rails wizard)
    distance?: string | null;
    days_in_office?: number | string | null;
    linkedin_url?: string | null;
    rate?: string | null;
    is_original_job?: number | boolean | null;
    is_automation?: number | boolean | null;
    automation_limit?: number | null;

    in_mail_message?: string | null;
    in_mail_message_2?: string | null;
    in_mail_message_3?: string | null;
    in_mail_message_day_2?: number | null;
    in_mail_message_day_3?: number | null;

    company_names?: string[] | string | null;
  },
  creatorId?: string
): Promise<Job> {
  const skillsStr = Array.isArray(jobData.skills) ? jobData.skills.join(', ') : (jobData.skills ?? '') || null;
  const addNotesVal = typeof jobData.addNotes === 'string' ? jobData.addNotes : null;

  // DB column is INTEGER (0/1). Accept boolean/number/string inputs safely.
  const autopilotRaw = (jobData as any)?.autopilot_sourcing;
  const autopilot =
    typeof autopilotRaw === 'boolean'
      ? (autopilotRaw ? 1 : 0)
      : autopilotRaw == null || autopilotRaw === ''
        ? 0
        : Number(autopilotRaw) ? 1 : 0;
  const targetCount =
    (jobData as any)?.target_count === undefined || (jobData as any)?.target_count === null || (jobData as any)?.target_count === ''
      ? null
      : Number((jobData as any)?.target_count);

  const distanceVal =
    jobData.distance != null && String(jobData.distance).trim() !== ''
      ? String(jobData.distance).trim()
      : null;
  const daysInOfficeValRaw =
    jobData.days_in_office != null && String(jobData.days_in_office).trim() !== ''
      ? Number(jobData.days_in_office)
      : null;
  const daysInOfficeVal =
    daysInOfficeValRaw != null && Number.isFinite(daysInOfficeValRaw) ? daysInOfficeValRaw : null;
  const linkedinUrlVal =
    jobData.linkedin_url != null && String(jobData.linkedin_url).trim() !== ''
      ? String(jobData.linkedin_url).trim()
      : null;
  const rateVal =
    jobData.rate != null && String(jobData.rate).trim() !== ''
      ? String(jobData.rate).trim()
      : null;
  const isOriginalJobVal =
    typeof jobData.is_original_job === 'boolean'
      ? (jobData.is_original_job ? 1 : 0)
      : jobData.is_original_job != null
        ? Number(jobData.is_original_job)
        : 0;
  const isAutomationVal =
    typeof jobData.is_automation === 'boolean'
      ? (jobData.is_automation ? 1 : 0)
      : jobData.is_automation != null
        ? Number(jobData.is_automation)
        : 0;
  const automationLimitVal =
    jobData.automation_limit != null && Number.isFinite(jobData.automation_limit as any)
      ? Number(jobData.automation_limit)
      : null;

  const inMailMessageVal =
    jobData.in_mail_message != null && String(jobData.in_mail_message).trim() !== ''
      ? String(jobData.in_mail_message)
      : null;
  const inMailMessage2Val =
    jobData.in_mail_message_2 != null && String(jobData.in_mail_message_2).trim() !== ''
      ? String(jobData.in_mail_message_2)
      : null;
  const inMailMessage3Val =
    jobData.in_mail_message_3 != null && String(jobData.in_mail_message_3).trim() !== ''
      ? String(jobData.in_mail_message_3)
      : null;
  const inMailDay2Val =
    jobData.in_mail_message_day_2 != null && Number.isFinite(jobData.in_mail_message_day_2 as any)
      ? Number(jobData.in_mail_message_day_2)
      : null;
  const inMailDay3Val =
    jobData.in_mail_message_day_3 != null && Number.isFinite(jobData.in_mail_message_day_3 as any)
      ? Number(jobData.in_mail_message_day_3)
      : null;

  const companyNamesVal = Array.isArray(jobData.company_names)
    ? jobData.company_names.join(', ')
    : (jobData.company_names ?? '') || null;

  const result = await query(
    `INSERT INTO jobs (
       name,
       company_name,
       location,
       work_type,
       job_salary,
       skills,
       description,
       add_notes,
       active,
       status,
       creator_id,
       autopilot_sourcing,
       target_count,
       distance,
       days_in_office,
       linkedin_url,
       rate,
       is_original_job,
       is_automation,
       automation_limit,
       in_mail_message,
       in_mail_message_2,
       in_mail_message_3,
       in_mail_message_day_2,
       in_mail_message_day_3,
       company_names
     )
     VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8,
       true, 0, $9,
       $10, $11,
       $12, $13, $14, $15,
       $16, $17, $18,
       $19, $20, $21, $22, $23,
       $24
     )
     RETURNING id`,
    [
      jobData.title,
      jobData.company,
      jobData.location,
      jobData.type,
      jobData.salary || null,
      skillsStr,
      jobData.description || null,
      addNotesVal,
      creatorId ? parseInt(creatorId, 10) : null,
      autopilot,
      Number.isFinite(targetCount as any) ? targetCount : null,
      distanceVal,
      daysInOfficeVal,
      linkedinUrlVal,
      rateVal,
      isOriginalJobVal,
      isAutomationVal,
      automationLimitVal,
      inMailMessageVal,
      inMailMessage2Val,
      inMailMessage3Val,
      inMailDay2Val,
      inMailDay3Val,
      companyNamesVal,
    ]
  );

  const job = await getJobById(String(result.rows[0].id));
  if (!job) throw new Error('Failed to load created job');
  return job;
}

// Update job
export async function updateJob(
  jobId: string,
  jobData: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at' | 'posted_at'>>
): Promise<Job> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (jobData.title !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(jobData.title);
  }
  if (jobData.company !== undefined) {
    updates.push(`company_name = $${paramCount++}`);
    values.push(jobData.company);
  }
  if (jobData.location !== undefined) {
    updates.push(`location = $${paramCount++}`);
    values.push(jobData.location);
  }
  if (jobData.type !== undefined) {
    updates.push(`work_type = $${paramCount++}`);
    values.push(jobData.type);
  }
  if (jobData.salary !== undefined) {
    updates.push(`job_salary = $${paramCount++}`);
    values.push(jobData.salary);
  }
  if (jobData.skills !== undefined) {
    updates.push(`skills = $${paramCount++}`);
    values.push(Array.isArray(jobData.skills) ? jobData.skills.join(', ') : jobData.skills);
  }
  if (jobData.description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(jobData.description);
  }

  // Keep schema parity: jobs.autopilot_sourcing is INTEGER (0/1)
  if ((jobData as any).autopilot_sourcing !== undefined) {
    const raw = (jobData as any).autopilot_sourcing;
    const val =
      typeof raw === 'boolean'
        ? (raw ? 1 : 0)
        : raw == null || raw === ''
          ? 0
          : Number(raw) ? 1 : 0;
    updates.push(`autopilot_sourcing = $${paramCount++}`);
    values.push(val);
  }

  if ((jobData as any).target_count !== undefined) {
    const raw = (jobData as any).target_count;
    const val = raw == null || raw === '' ? null : Number(raw);
    updates.push(`target_count = $${paramCount++}`);
    values.push(Number.isFinite(val as any) ? val : null);
  }

  if ((jobData as any).distance !== undefined) {
    const raw = (jobData as any).distance;
    updates.push(`distance = $${paramCount++}`);
    values.push(raw != null && String(raw).trim() !== '' ? String(raw).trim() : null);
  }

  if ((jobData as any).days_in_office !== undefined) {
    const raw = (jobData as any).days_in_office;
    const num = raw == null || raw === '' ? null : Number(raw);
    updates.push(`days_in_office = $${paramCount++}`);
    values.push(num != null && Number.isFinite(num) ? num : null);
  }

  if ((jobData as any).linkedin_url !== undefined) {
    const raw = (jobData as any).linkedin_url;
    updates.push(`linkedin_url = $${paramCount++}`);
    values.push(raw != null && String(raw).trim() !== '' ? String(raw).trim() : null);
  }

  if ((jobData as any).rate !== undefined) {
    const raw = (jobData as any).rate;
    updates.push(`rate = $${paramCount++}`);
    values.push(raw != null && String(raw).trim() !== '' ? String(raw).trim() : null);
  }

  if ((jobData as any).addNotes !== undefined) {
    const raw = (jobData as any).addNotes;
    updates.push(`add_notes = $${paramCount++}`);
    values.push(typeof raw === 'string' && raw.trim() !== '' ? raw : null);
  }

  if ((jobData as any).in_mail_message !== undefined) {
    const raw = (jobData as any).in_mail_message;
    updates.push(`in_mail_message = $${paramCount++}`);
    values.push(raw != null && String(raw).trim() !== '' ? String(raw) : null);
  }
  if ((jobData as any).in_mail_message_2 !== undefined) {
    const raw = (jobData as any).in_mail_message_2;
    updates.push(`in_mail_message_2 = $${paramCount++}`);
    values.push(raw != null && String(raw).trim() !== '' ? String(raw) : null);
  }
  if ((jobData as any).in_mail_message_3 !== undefined) {
    const raw = (jobData as any).in_mail_message_3;
    updates.push(`in_mail_message_3 = $${paramCount++}`);
    values.push(raw != null && String(raw).trim() !== '' ? String(raw) : null);
  }
  if ((jobData as any).in_mail_message_day_2 !== undefined) {
    const raw = (jobData as any).in_mail_message_day_2;
    const num = raw == null || raw === '' ? null : Number(raw);
    updates.push(`in_mail_message_day_2 = $${paramCount++}`);
    values.push(num != null && Number.isFinite(num) ? num : null);
  }
  if ((jobData as any).in_mail_message_day_3 !== undefined) {
    const raw = (jobData as any).in_mail_message_day_3;
    const num = raw == null || raw === '' ? null : Number(raw);
    updates.push(`in_mail_message_day_3 = $${paramCount++}`);
    values.push(num != null && Number.isFinite(num) ? num : null);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(jobId);
  await query(
    `UPDATE jobs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
    values
  );
  const job = await getJobById(jobId);
  if (!job) throw new Error('Job not found after update');
  return job;
}

// Update job status (jobs table: active bool, status int 0=active 1=paused)
export async function updateJobStatus(
  jobId: string,
  status: 'active' | 'paused' | 'closed',
  _statusReason?: string
): Promise<Job> {
  const active = status !== 'closed';
  const statusNum = status === 'paused' ? 1 : 0;
  await query(
    `UPDATE jobs SET active = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
    [active, statusNum, jobId]
  );
  const job = await getJobById(jobId);
  if (!job) throw new Error('Job not found after status update');
  return job;
}

// Get applications for a specific job (same payload shape as getApplicationsForEmployer: match + rank + profile hints)
export async function getApplicationsForJob(jobId: string): Promise<
  (JobApplication & {
    candidate_name?: string;
    candidate_email?: string;
    rank_score?: number | null;
    score_edu?: number | null;
    score_company?: number | null;
    latest_company?: string | null;
    latest_school?: string | null;
  })[]
> {
  const result = await query(
    `SELECT 
       a.id as application_id,
       a.user_id,
       a.job_id,
       a.resume_id,
       a.status as application_status,
       a.applied_at,
       a.updated_at as application_updated_at,
       j.id AS job_id,
       j.name AS title,
       j.company_name AS company,
       j.location,
       j.work_type::varchar AS type,
       j.job_salary AS salary,
       j.created_at AS posted_at,
       COALESCE(m.match_score, 0)::integer AS match_score,
       (m.detail_response::jsonb ->> 'summary') AS match_summary,
       m.detail_response AS detail_response,
       CASE 
         WHEN j.skills IS NOT NULL AND j.skills != '' 
         THEN string_to_array(trim(j.skills), ',') 
         ELSE ARRAY[]::text[] 
       END AS skills,
       j.description,
       j.created_at as job_created_at,
       j.updated_at as job_updated_at,
       u.first_name,
       u.last_name,
       u.email,
       p.rank_score as candidate_rank_score,
       p.score_edu as candidate_score_edu,
       p.score_company as candidate_score_company,
       p.latest_company as candidate_latest_company,
       p.latest_school as candidate_latest_school
     FROM ct_job_applications a
     JOIN jobs j ON a.job_id = j.id
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN people p ON u.person_id = p.id
     LEFT JOIN employer_auto_matched_candidates m
       ON m.person_id = COALESCE(u.person_id, u.id)
      AND m.job_id = j.id
      AND m.source_type = 'talent'
     WHERE a.job_id = $1
     ORDER BY a.applied_at DESC`,
    [jobId]
  );
  return result.rows.map((row) => {
    const candidateName =
      row.first_name != null || row.last_name != null
        ? [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
        : row.email || 'Unknown';
    return {
      id: row.application_id,
      user_id: row.user_id,
      job_id: row.job_id,
      resume_id: row.resume_id,
      status: row.application_status,
      applied_at: row.applied_at,
      updated_at: row.application_updated_at,
      candidate_name: candidateName || undefined,
      candidate_email: row.email ?? undefined,
      rank_score: row.candidate_rank_score != null ? Number(row.candidate_rank_score) : null,
      score_edu: row.candidate_score_edu != null ? Number(row.candidate_score_edu) : null,
      score_company: row.candidate_score_company != null ? Number(row.candidate_score_company) : null,
      latest_company: row.candidate_latest_company != null ? String(row.candidate_latest_company) : null,
      latest_school: row.candidate_latest_school != null ? String(row.candidate_latest_school) : null,
      job: {
        id: row.job_id,
        title: row.title,
        company: row.company,
        location: row.location,
        type: row.type,
        salary: row.salary,
        posted_at: row.posted_at,
        match_score: row.match_score,
        match_summary: row.match_summary ?? null,
        detail_response: row.detail_response ?? null,
        skills: row.skills,
        description: row.description,
        created_at: row.job_created_at,
        updated_at: row.job_updated_at,
      },
    };
  });
}

// Save a job for a user
export async function saveJobForUser(userId: string, jobId: string): Promise<SavedJob> {
  const result = await query(
    `INSERT INTO ct_jobs_saved (user_id, job_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, job_id) DO NOTHING
     RETURNING *`,
    [userId, jobId]
  );
  return result.rows[0];
}

// Get saved jobs for a user
export async function getSavedJobs(userId: string): Promise<SavedJob[]> {
  const result = await query(
    `SELECT 
       js.id as saved_job_id,
       js.user_id,
       js.job_id,
       js.created_at as saved_at,
       ${JOB_SELECT_AS_JOB},
       j.created_at as job_created_at,
       j.updated_at as job_updated_at
     FROM ct_jobs_saved js
     JOIN jobs j ON js.job_id = j.id
     JOIN users u ON js.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT e.*
       FROM employer_auto_matched_candidates e
       WHERE e.job_id = j.id
         AND e.person_id = COALESCE(u.person_id, u.id)
         AND e.source_type = 'talent'
       ORDER BY e.created_at DESC
       LIMIT 1
     ) m ON TRUE
     WHERE js.user_id = $1 
       AND j.discarded_at IS NULL
       AND COALESCE(m.person_reject_job, 0) = 0
     ORDER BY js.created_at DESC`,
    [userId]
  );
  return result.rows.map(row => ({
    id: row.saved_job_id,
    user_id: row.user_id,
    job_id: row.job_id,
    created_at: row.saved_at,
    job: {
      id: row.job_id,
      title: row.title,
      company: row.company,
      location: row.location,
      type: row.type,
      salary: row.salary,
      posted_at: row.posted_at,
      match_score: row.match_score,
      skills: row.skills,
      description: row.description,
      created_at: row.job_created_at,
      updated_at: row.job_updated_at,
    },
  }));
}

// Remove a saved job (move back to available)
export async function removeSavedJob(userId: string, jobId: string): Promise<void> {
  await query(
    'DELETE FROM ct_jobs_saved WHERE user_id = $1 AND job_id = $2',
    [userId, jobId]
  );
}

// Apply to a job
export async function applyToJob(
  userId: string,
  jobId: string,
  resumeId: string
): Promise<JobApplication> {
  // Remove from saved jobs if exists
  await query(
    'DELETE FROM ct_jobs_saved WHERE user_id = $1 AND job_id = $2',
    [userId, jobId]
  );

  // Create application
  const result = await query(
    `INSERT INTO ct_job_applications (user_id, job_id, resume_id, status)
     VALUES ($1, $2, $3, 'Application Sent')
     ON CONFLICT (user_id, job_id) DO UPDATE
     SET resume_id = EXCLUDED.resume_id, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, jobId, resumeId]
  );
  return result.rows[0];
}

// Get applications for all jobs visible to this employer user — same scope as getJobsForEmployer:
// own created jobs, same company name (case-insensitive), or same organization_id (teammates' postings).
export async function getApplicationsForEmployer(employerUserId: number): Promise<(JobApplication & { candidate_name?: string; candidate_email?: string; rank_score?: number | null; score_edu?: number | null; score_company?: number | null; latest_company?: string | null; latest_school?: string | null })[]> {
  const userResult = await query(
    'SELECT company_name, organization_id FROM users WHERE id = $1',
    [employerUserId]
  );
  const urow = userResult.rows[0];
  if (!urow) return [];
  const companyName = urow.company_name != null ? String(urow.company_name).trim() : null;
  const organizationId = urow.organization_id ?? null;

  const result = await query(
    `SELECT 
       a.id as application_id,
       a.user_id,
       a.job_id,
       a.resume_id,
       a.status as application_status,
       a.applied_at,
       a.updated_at as application_updated_at,
       j.id AS job_id,
       j.name AS title,
       j.company_name AS company,
       j.location,
       j.work_type::varchar AS type,
       j.job_salary AS salary,
       j.created_at AS posted_at,
       COALESCE(m.match_score, 0)::integer AS match_score,
       (m.detail_response::jsonb ->> 'summary') AS match_summary,
       m.detail_response AS detail_response,
       CASE 
         WHEN j.skills IS NOT NULL AND j.skills != '' 
         THEN string_to_array(trim(j.skills), ',') 
         ELSE ARRAY[]::text[] 
       END AS skills,
       j.description,
       CASE 
         WHEN j.active = false THEN 'closed' 
         WHEN j.status = 1 THEN 'paused' 
         ELSE 'active' 
       END AS job_status,
       j.created_at as job_created_at,
       j.updated_at as job_updated_at,
      u.first_name,
      u.last_name,
      u.email,
      p.rank_score as candidate_rank_score,
      p.score_edu   as candidate_score_edu,
      p.score_company as candidate_score_company,
      p.latest_company as candidate_latest_company,
      p.latest_school  as candidate_latest_school
     FROM ct_job_applications a
     JOIN jobs j ON a.job_id = j.id
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN people p ON u.person_id = p.id
     LEFT JOIN employer_auto_matched_candidates m
       ON m.person_id = COALESCE(u.person_id, u.id)
      AND m.job_id    = j.id
      AND m.source_type = 'talent'
     WHERE j.discarded_at IS NULL
       AND (
         j.creator_id = $1
         OR ($2::text IS NOT NULL AND $2 != '' AND LOWER(TRIM(COALESCE(j.company_name, ''))) = LOWER(TRIM($2)))
         OR ($3::uuid IS NOT NULL AND j.organization_id = $3::uuid)
       )
     ORDER BY a.applied_at DESC`,
    [employerUserId, companyName || null, organizationId]
  );
  return result.rows.map(row => {
    const candidateName = row.first_name != null || row.last_name != null
      ? [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
      : row.email || 'Unknown';
    return {
      id: row.application_id,
      user_id: row.user_id,
      job_id: row.job_id,
      resume_id: row.resume_id,
      status: row.application_status,
      applied_at: row.applied_at,
      updated_at: row.application_updated_at,
      candidate_name: candidateName || undefined,
      candidate_email: row.email ?? undefined,
      rank_score: row.candidate_rank_score != null ? Number(row.candidate_rank_score) : null,
      score_edu: row.candidate_score_edu != null ? Number(row.candidate_score_edu) : null,
      score_company: row.candidate_score_company != null ? Number(row.candidate_score_company) : null,
      latest_company: row.candidate_latest_company != null ? String(row.candidate_latest_company) : null,
      latest_school: row.candidate_latest_school != null ? String(row.candidate_latest_school) : null,
      job: {
        id: row.job_id,
        title: row.title,
        company: row.company,
        location: row.location,
        type: row.type,
        salary: row.salary,
        posted_at: row.posted_at,
        match_score: row.match_score,
        match_summary: row.match_summary ?? null,
        detail_response: row.detail_response ?? null,
        skills: row.skills,
        description: row.description,
        created_at: row.job_created_at,
        updated_at: row.job_updated_at,
      },
    };
  });
}

// Update application status (employer only; application must belong to a job owned by employer)
export async function updateApplicationStatus(
  applicationId: string,
  status: 'Application Sent' | 'Under Review' | 'Interview Scheduled' | 'Rejected' | 'Accepted',
  employerUserId: number
): Promise<JobApplication | null> {
  const appId = parseInt(applicationId, 10);
  if (Number.isNaN(appId)) return null;
  // Verify employer can update this application.
  // Prefer creator_id check (most reliable). For company_name matching, do case-insensitive compare.
  const check = await query(
    `SELECT a.id
     FROM ct_job_applications a
     JOIN jobs j ON a.job_id = j.id
     CROSS JOIN LATERAL (
       SELECT company_name, organization_id FROM users WHERE id = $2 LIMIT 1
     ) em
     WHERE a.id = $1
       AND (
         j.creator_id = $2
         OR (em.company_name IS NOT NULL AND TRIM(em.company_name) != ''
             AND LOWER(TRIM(COALESCE(j.company_name, ''))) = LOWER(TRIM(em.company_name)))
         OR (em.organization_id IS NOT NULL AND j.organization_id = em.organization_id)
       )`,
    [appId, employerUserId]
  );
  if (!check.rows.length) return null;
  await query(
    'UPDATE ct_job_applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [status, appId]
  );
  const updated = await query(
    'SELECT id, user_id, job_id, resume_id, status, applied_at, updated_at FROM ct_job_applications WHERE id = $1',
    [appId]
  );
  const row = updated.rows[0];
  return row ? { id: row.id, user_id: row.user_id, job_id: row.job_id, resume_id: row.resume_id, status: row.status, applied_at: row.applied_at, updated_at: row.updated_at } : null;
}

// Get applications for a user (includes match_score via employer_auto_matched_candidates using person_id + job_id).
// Optional keyword filters by job title or company name (server-side).
export async function getUserApplications(userId: string, keyword?: string): Promise<JobApplication[]> {
  const hasKeyword = typeof keyword === 'string' && keyword.trim().length > 0;
  const pattern = hasKeyword ? `%${keyword.trim()}%` : null;

  const sql = `SELECT 
       a.id as application_id,
       a.user_id,
       a.job_id,
       a.resume_id,
       a.status,
       a.applied_at,
       a.updated_at as application_updated_at,
       j.id AS job_id,
       j.name AS title,
       j.company_name AS company,
       j.location,
       j.work_type::varchar AS type,
      j.job_salary AS salary,
      j.created_at AS posted_at,
      COALESCE(m.match_score, 0)::integer AS match_score,
      (m.detail_response::jsonb ->> 'summary') AS match_summary,
      m.detail_response AS detail_response,
      CASE 
         WHEN j.skills IS NOT NULL AND j.skills != '' 
         THEN string_to_array(trim(j.skills), ',') 
         ELSE ARRAY[]::text[] 
       END AS skills,
       j.description,
       CASE 
         WHEN j.active = false THEN 'closed' 
         WHEN j.status = 1 THEN 'paused' 
         ELSE 'active' 
       END AS status,
       j.created_at as job_created_at,
       j.updated_at as job_updated_at
     FROM ct_job_applications a
     JOIN users u ON a.user_id = u.id
     JOIN jobs j ON a.job_id = j.id
     LEFT JOIN employer_auto_matched_candidates m
       ON m.person_id = u.person_id
      AND m.job_id    = j.id
      AND m.source_type = 'talent'
     WHERE a.user_id = $1
     ${hasKeyword ? 'AND (j.name ILIKE $2 OR j.company_name ILIKE $2)' : ''}
     ORDER BY a.applied_at DESC`;

  const params = hasKeyword ? [userId, pattern] : [userId];
  const runnableQuery = sql
    .replace(/\$1/g, `'${String(userId).replace(/'/g, "''")}'`)
    .replace(/\$2/g, pattern ? `'${String(pattern).replace(/'/g, "''")}'` : '');
  console.log('[applications/list] Query run:\n', runnableQuery);

  const result = await query(sql, params);
  return result.rows.map(row => ({
    id: row.application_id,
    user_id: row.user_id,
    job_id: row.job_id,
    resume_id: row.resume_id,
    status: row.status,
    applied_at: row.applied_at,
    updated_at: row.application_updated_at,
    job: {
      id: row.job_id,
      title: row.title,
      company: row.company,
      location: row.location,
      type: row.type,
      salary: row.salary,
      posted_at: row.posted_at,
      match_score: row.match_score,
      match_summary: row.match_summary ?? null,
      detail_response: row.detail_response ?? null,
      skills: row.skills,
      description: row.description,
      created_at: row.job_created_at,
      updated_at: row.job_updated_at,
    },
  }));
}

// Get interviews for a user
export async function getUserInterviews(userId: string): Promise<Interview[]> {
  const result = await query(
    `SELECT 
       i.id as interview_id,
       i.user_id,
       i.application_id,
       i.interview_type,
       i.scheduled_date,
       i.scheduled_time,
       i.interviewer,
       i.status as interview_status,
       i.notes,
       i.created_at as interview_created_at,
       i.updated_at as interview_updated_at,
       a.id as application_id,
       a.user_id as application_user_id,
       a.job_id,
       a.resume_id,
       a.status as application_status,
       a.applied_at,
       a.updated_at as application_updated_at,
       ${JOB_SELECT_AS_JOB},
       j.created_at as job_created_at,
       j.updated_at as job_updated_at
     FROM ct_interviews i
     JOIN ct_job_applications a ON i.application_id = a.id
     JOIN jobs j ON a.job_id = j.id
     WHERE i.user_id = $1
     ORDER BY i.scheduled_date DESC, i.scheduled_time DESC`,
    [userId]
  );
  return result.rows.map(row => ({
    id: row.interview_id,
    user_id: row.user_id,
    application_id: row.application_id,
    interview_type: row.interview_type,
    scheduled_date: row.scheduled_date,
    scheduled_time: row.scheduled_time,
    interviewer: row.interviewer,
    status: row.interview_status,
    notes: row.notes,
    created_at: row.interview_created_at,
    updated_at: row.interview_updated_at,
    application: {
      id: row.application_id,
      user_id: row.application_user_id,
      job_id: row.job_id,
      resume_id: row.resume_id,
      status: row.application_status,
      applied_at: row.applied_at,
      updated_at: row.application_updated_at,
      job: {
        id: row.job_id,
        title: row.title,
        company: row.company,
        location: row.location,
        type: row.type,
        salary: row.salary,
        posted_at: row.posted_at,
        match_score: row.match_score,
        skills: row.skills,
        description: row.description,
        created_at: row.job_created_at,
        updated_at: row.job_updated_at,
      },
    },
  }));
}

// Get interviews for an employer (interviews for candidates who applied to their jobs)
export async function getInterviewsForEmployer(companyName: string): Promise<Interview[]> {
  const result = await query(
    `SELECT 
       i.id as interview_id,
       i.user_id,
       i.application_id,
       i.interview_type,
       i.scheduled_date,
       i.scheduled_time,
       i.interviewer,
       i.status as interview_status,
       i.notes,
       i.created_at as interview_created_at,
       i.updated_at as interview_updated_at,
       a.id as application_id,
       a.user_id as application_user_id,
       a.job_id,
       a.resume_id,
       a.status as application_status,
       a.applied_at,
       a.updated_at as application_updated_at,
       ${JOB_SELECT_AS_JOB},
       j.created_at as job_created_at,
       j.updated_at as job_updated_at,
       u.first_name,
       u.last_name,
       u.email
     FROM ct_interviews i
     JOIN ct_job_applications a ON i.application_id = a.id
     JOIN jobs j ON a.job_id = j.id
     LEFT JOIN users u ON a.user_id = u.id
     WHERE j.company_name = $1
     ORDER BY i.scheduled_date DESC, i.scheduled_time DESC`,
    [companyName]
  );
  return result.rows.map(row => ({
    id: row.interview_id,
    user_id: row.user_id,
    application_id: row.application_id,
    interview_type: row.interview_type,
    scheduled_date: row.scheduled_date,
    scheduled_time: row.scheduled_time,
    interviewer: row.interviewer,
    status: row.interview_status,
    notes: row.notes,
    created_at: row.interview_created_at,
    updated_at: row.interview_updated_at,
    application: {
      id: row.application_id,
      user_id: row.application_user_id,
      job_id: row.job_id,
      resume_id: row.resume_id,
      status: row.application_status,
      applied_at: row.applied_at,
      updated_at: row.application_updated_at,
      job: {
        id: row.job_id,
        title: row.title,
        company: row.company,
        location: row.location,
        type: row.type,
        salary: row.salary,
        posted_at: row.posted_at,
        match_score: row.match_score,
        skills: row.skills,
        description: row.description,
        created_at: row.job_created_at,
        updated_at: row.job_updated_at,
      },
      candidate_name: row.first_name && row.last_name 
        ? `${row.first_name} ${row.last_name}` 
        : row.email || 'Unknown',
      candidate_email: row.email,
    },
  }));
}

// Create interview
export async function createInterview(
  userId: string,
  applicationId: string,
  interviewData: Omit<Interview, 'id' | 'user_id' | 'application_id' | 'created_at' | 'updated_at'>
): Promise<Interview> {
  const result = await query(
    `INSERT INTO ct_interviews (user_id, application_id, interview_type, scheduled_date, scheduled_time, interviewer, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      applicationId,
      interviewData.interview_type,
      interviewData.scheduled_date || null,
      interviewData.scheduled_time || null,
      interviewData.interviewer || null,
      interviewData.status,
      interviewData.notes || null,
    ]
  );
  return result.rows[0];
}
