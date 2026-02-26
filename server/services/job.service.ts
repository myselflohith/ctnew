import { query } from '../database/connection.js';

// Map jobs table row to Job shape (jobs uses: name, company_name, job_salary, employment_type, status int, active bool)
const JOB_SELECT = `
  j.id,
  j.name AS title,
  j.company_name AS company,
  j.location,
  COALESCE(j.employment_type[1], 'onsite')::varchar AS type,
  j.job_salary AS salary,
  j.created_at AS posted_at,
  NULL::integer AS match_score,
  CASE WHEN j.skills IS NOT NULL AND j.skills != '' THEN string_to_array(trim(j.skills), ',') ELSE ARRAY[]::text[] END AS skills,
  j.description,
  CASE WHEN j.active = false THEN 'closed' WHEN j.status = 1 THEN 'paused' ELSE 'active' END AS status,
  j.created_at,
  j.updated_at
`;
// Same as JOB_SELECT but with j.id AS job_id for use in application/saved joins
const JOB_SELECT_AS_JOB = `
  j.id AS job_id,
  j.name AS title,
  j.company_name AS company,
  j.location,
  COALESCE(j.employment_type[1], 'onsite')::varchar AS type,
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
  type: 'remote' | 'hybrid' | 'onsite';
  salary?: string;
  posted_at: Date;
  match_score?: number;
  skills?: string[];
  description?: string;
  status?: 'active' | 'paused' | 'closed';
  status_reason?: string;
  paused_at?: Date;
  created_at: Date;
  updated_at: Date;
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
     AND j.discarded_at IS NULL
     ORDER BY j.created_at DESC`,
    [userId]
  );
  return result.rows;
}

// Get all jobs (for admin/employer)
export async function getAllJobs(): Promise<Job[]> {
  const result = await query(
    `SELECT ${JOB_SELECT} FROM jobs j WHERE j.discarded_at IS NULL ORDER BY j.created_at DESC`
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
  COALESCE(j.employment_type[1], 'onsite')::varchar AS type,
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
  jobData: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'posted_at'> & { addNotes?: string | null },
  creatorId?: string
): Promise<Job> {
  const skillsStr = Array.isArray(jobData.skills) ? jobData.skills.join(', ') : (jobData.skills ?? '') || null;
  const addNotesVal = typeof jobData.addNotes === 'string' ? jobData.addNotes : null;
  const result = await query(
    `INSERT INTO jobs (name, company_name, location, employment_type, job_salary, skills, description, add_notes, active, status, creator_id)
     VALUES ($1, $2, $3, ARRAY[$4]::varchar[], $5, $6, $7, $8, true, 0, $9)
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
    updates.push(`employment_type = ARRAY[$${paramCount++}]::varchar[]`);
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

// Get applications for a specific job
export async function getApplicationsForJob(jobId: string): Promise<JobApplication[]> {
  const result = await query(
    `SELECT 
       a.id as application_id,
       a.user_id,
       a.job_id,
       a.resume_id,
       a.status,
       a.applied_at,
       a.updated_at as application_updated_at,
       ${JOB_SELECT_AS_JOB},
       j.created_at as job_created_at,
       j.updated_at as job_updated_at,
       u.first_name,
       u.last_name,
       u.email
     FROM ct_job_applications a
     JOIN jobs j ON a.job_id = j.id
     LEFT JOIN users u ON a.user_id = u.id
     WHERE a.job_id = $1
     ORDER BY a.applied_at DESC`,
    [jobId]
  );
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
      skills: row.skills,
      description: row.description,
      created_at: row.job_created_at,
      updated_at: row.job_updated_at,
    },
    candidate_name: row.first_name && row.last_name 
      ? `${row.first_name} ${row.last_name}` 
      : row.email || 'Unknown',
    candidate_email: row.email,
  }));
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
     WHERE js.user_id = $1 AND j.discarded_at IS NULL
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

// Get applications for jobs created by an employer (by company name)
export async function getApplicationsForEmployer(companyName: string): Promise<JobApplication[]> {
  const result = await query(
    `SELECT 
       a.id as application_id,
       a.user_id,
       a.job_id,
       a.resume_id,
       a.status,
       a.applied_at,
       a.updated_at as application_updated_at,
       ${JOB_SELECT_AS_JOB},
       j.created_at as job_created_at,
       j.updated_at as job_updated_at
     FROM ct_job_applications a
     JOIN jobs j ON a.job_id = j.id
     WHERE j.company_name = $1
     ORDER BY a.applied_at DESC`,
    [companyName]
  );
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
      skills: row.skills,
      description: row.description,
      created_at: row.job_created_at,
      updated_at: row.job_updated_at,
    },
  }));
}

// Get applications for a user
export async function getUserApplications(userId: string): Promise<JobApplication[]> {
  const result = await query(
    `SELECT 
       a.id as application_id,
       a.user_id,
       a.job_id,
       a.resume_id,
       a.status,
       a.applied_at,
       a.updated_at as application_updated_at,
       ${JOB_SELECT_AS_JOB},
       j.created_at as job_created_at,
       j.updated_at as job_updated_at
     FROM ct_job_applications a
     JOIN jobs j ON a.job_id = j.id
     WHERE a.user_id = $1
     ORDER BY a.applied_at DESC`,
    [userId]
  );
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
