import { Router, Request, Response } from 'express';
import { Queue } from 'bullmq';
import {
  getAvailableJobs,
  getAvailableJobsWithMatch,
  getAllJobs,
  getJobById,
  getJobsByCompanyName,
  getJobsForApprovedOrganizations,
  searchJobsInApprovedOrganizations,
  createJob,
  updateJob,
  updateJobStatus,
  getApplicationsForJob,
  saveJobForUser,
  getSavedJobs,
  removeSavedJob,
  applyToJob,
  getUserApplications,
  getApplicationsForEmployer,
  updateApplicationStatus,
  getUserInterviews,
  getInterviewsForEmployer,
  createInterview,
} from '../services/job.service.js';
import { extractSkillsFromJobDescription, extractRequirementsFromJobDescription } from '../services/job-ai.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { jobAutopilotSourcingQueue } from '../queues/job-autopilot-sourcing.queue.js';
import { query } from '../database/connection.js';
import {
  listEmployerAutoMatchedCandidatesForJob,
  listEmployerAutoMatchedCandidatesForJobWithProfiles,
} from '../services/employer-auto-matched-candidates.service.js';

const router = Router();

// Get available jobs (not saved or applied to by user)
router.get('/available', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const jobs = await getAvailableJobs(req.user.id);
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error('Get available jobs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get available jobs' });
  }
});

// Get available jobs with match scores (talent only; reads from employer_auto_matched_candidates, worker precomputed)
router.get('/available-with-match', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (req.user.role !== 'talent') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const jobs = await getAvailableJobsWithMatch(String(req.user.id));
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error('Get available jobs with match error:', error);
    res.status(500).json({ error: error.message || 'Failed to get available jobs' });
  }
});

// Get all jobs (for admin/employer)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Only admin and employer can see all jobs
    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const jobs = await getAllJobs();
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error('Get all jobs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get jobs' });
  }
});

// Get jobs by company/organization name (for investors startup profile)
router.get('/by-company', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const company = typeof req.query.company === 'string' ? req.query.company.trim() : '';
    const jobs = await getJobsByCompanyName(company);
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error('Get jobs by company error:', error);
    res.status(500).json({ error: error.message || 'Failed to get jobs' });
  }
});

// Get jobs for approved organizations, with org info (for investors pitch room)
router.get('/pitch-room', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const jobs = await getJobsForApprovedOrganizations();
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error('Get pitch room jobs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get pitch room jobs' });
  }
});

// Search jobs in approved organizations (for investors startups tab)
router.get('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const jobs = await searchJobsInApprovedOrganizations(q);
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error('Search jobs error:', error);
    res.status(500).json({ error: error.message || 'Failed to search jobs' });
  }
});

/**
 * Diagnostics endpoint to debug why autosourcing returns 0 candidates.
 * Admin-only to avoid exposing infrastructure details in production.
 *
 * GET /api/jobs/:id/autopilot-diagnostics
 */
router.get('/:id/autopilot-diagnostics', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const jobId = Number(req.params.id);
    if (!jobId) {
      res.status(400).json({ error: 'Invalid job id' });
      return;
    }

    // DB counts (what UI reads)
    const dbCount = await query(
      `SELECT COUNT(*)::int AS c
       FROM employer_auto_matched_candidates
       WHERE job_id = $1 AND source_type = 'job_post' AND discarded_at IS NULL`,
      [jobId]
    );

    // Redis / queue sanity
    const queue = jobAutopilotSourcingQueue as unknown as Queue;
    let queueCounts: any = null;
    let queueErrors: any = null;

    try {
      queueCounts = await queue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed', 'paused');
    } catch (e: any) {
      queueErrors = { jobCounts: e?.message || String(e) };
    }

    let recentJobs: any[] = [];
    try {
      const jobs = await queue.getJobs(['wait', 'active', 'delayed', 'failed', 'completed'], 0, 20, true);
      recentJobs = jobs
        .filter((j: any) => Number(j.data?.jobId) === jobId)
        .map((j: any) => ({
          id: j.id,
          name: j.name,
          data: j.data,
          timestamp: j.timestamp,
          processedOn: (j as any).processedOn,
          finishedOn: (j as any).finishedOn,
          failedReason: (j as any).failedReason,
        }));
    } catch (e: any) {
      queueErrors = { ...(queueErrors || {}), jobs: e?.message || String(e) };
    }

    res.json({
      success: true,
      data: {
        jobId,
        employerAutoMatchedCandidatesCount: Number(dbCount.rows[0]?.c ?? 0),
        queueCounts,
        recentJobs,
        queueErrors,
        env: {
          REDIS_URL: process.env.REDIS_URL ? 'set' : 'missing',
          REDIS_HOST: process.env.REDIS_HOST || null,
          REDIS_PORT: process.env.REDIS_PORT || null,
          PEOPLE_ES_URL: process.env.PEOPLE_ES_URL ? 'set' : 'missing',
          RESUME_MATCH_URL: process.env.RESUME_MATCH_URL ? 'set' : 'missing',
        },
      },
    });
  } catch (error: any) {
    console.error('Autopilot diagnostics error:', error);
    res.status(500).json({ error: error.message || 'Failed to get diagnostics' });
  }
});

// Get autopilot recommended candidates for a job (employer/admin only)
router.get('/:id/autopilot-candidates', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Employer/admin only (these candidates can include contact + sourcing actions)
    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const job = await getJobById(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (!job.autopilot_sourcing) {
      res.status(400).json({ error: 'Autosourcing is not enabled for this job' });
      return;
    }

    const sourceType = typeof req.query.sourceType === 'string' ? req.query.sourceType : 'job_post';
    const candidates = await listEmployerAutoMatchedCandidatesForJobWithProfiles({
      jobId: req.params.id,
      sourceType,
    });

    res.json({ success: true, data: candidates });
  } catch (error: any) {
    console.error('Get autopilot candidates error:', error);
    res.status(500).json({ error: error.message || 'Failed to get autopilot candidates' });
  }
});

// Get job by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const job = await getJobById(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json({ success: true, data: job });
  } catch (error: any) {
    console.error('Get job error:', error);
    res.status(500).json({ error: error.message || 'Failed to get job' });
  }
});

// Create a new job (admin/employer only)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const {
      title,
      company,
      location,
      type,
      salary,
      match_score,
      skills,
      description,
      addNotes,
      autopilot_sourcing,
      target_count,
    } = req.body;

    if (!title || !company || !location || !type) {
      res.status(400).json({ error: 'Title, company, location, and type are required' });
      return;
    }

    const job = await createJob(
      {
        title,
        company,
        location,
        type,
        salary,
        match_score,
        skills,
        description,
        addNotes,
        autopilot_sourcing: Boolean(autopilot_sourcing),
        target_count:
          target_count === undefined || target_count === null || target_count === ''
            ? null
            : Number(target_count),
      },
      req.user?.id
    );

    // Enqueue autosourcing worker (parity with ch-job-marketplace)
    if (job.autopilot_sourcing) {
      await jobAutopilotSourcingQueue.add('jobAutopilotSourcing', {
        jobId: Number(job.id),
        targetCount: job.target_count ?? undefined,
      });
    }

    res.status(201).json({ success: true, data: job });
  } catch (error: any) {
    console.error('Create job error:', error);
    res.status(500).json({ error: error.message || 'Failed to create job' });
  }
});

// Save a job
router.post('/:id/save', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const savedJob = await saveJobForUser(req.user.id, req.params.id);
    res.json({ success: true, data: savedJob });
  } catch (error: any) {
    console.error('Save job error:', error);
    res.status(500).json({ error: error.message || 'Failed to save job' });
  }
});

// Save multiple jobs for the current user
router.post('/save-bulk', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { jobIds } = req.body as { jobIds?: string[] };
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      res.status(400).json({ error: 'jobIds array is required' });
      return;
    }

    const uniqueJobIds = Array.from(new Set(jobIds.map((id) => String(id))));
    const savedResults = [];
    for (const jobId of uniqueJobIds) {
      // Reuse single save logic for consistency
      // eslint-disable-next-line no-await-in-loop
      const saved = await saveJobForUser(req.user.id, jobId);
      savedResults.push(saved);
    }

    res.json({ success: true, data: savedResults });
  } catch (error: any) {
    console.error('Save jobs (bulk) error:', error);
    res.status(500).json({ error: error.message || 'Failed to save jobs' });
  }
});

// Get saved jobs
router.get('/saved/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const savedJobs = await getSavedJobs(req.user.id);
    res.json({ success: true, data: savedJobs });
  } catch (error: any) {
    console.error('Get saved jobs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get saved jobs' });
  }
});

// Remove saved job
router.delete('/saved/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    await removeSavedJob(req.user.id, req.params.id);
    res.json({ success: true, message: 'Job removed from saved' });
  } catch (error: any) {
    console.error('Remove saved job error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove saved job' });
  }
});

// Apply to a job
router.post('/:id/apply', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { resumeId } = req.body;

    if (!resumeId) {
      res.status(400).json({ error: 'Resume ID is required' });
      return;
    }

    const application = await applyToJob(req.user.id, req.params.id, resumeId);
    res.json({ success: true, data: application });
  } catch (error: any) {
    console.error('Apply to job error:', error);
    res.status(500).json({ error: error.message || 'Failed to apply to job' });
  }
});

// Apply to multiple jobs in one request
router.post('/apply-bulk', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { jobIds, resumeId } = req.body as { jobIds?: string[]; resumeId?: string };

    if (!resumeId) {
      res.status(400).json({ error: 'Resume ID is required' });
      return;
    }
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      res.status(400).json({ error: 'jobIds array is required' });
      return;
    }

    const uniqueJobIds = Array.from(new Set(jobIds.map((id) => String(id))));

    const applications = [];
    for (const jobId of uniqueJobIds) {
      // Reuse single-apply logic server-side so we keep DB behaviour consistent
      // eslint-disable-next-line no-await-in-loop
      const app = await applyToJob(req.user.id, jobId, resumeId);
      applications.push(app);
    }

    res.json({ success: true, data: applications });
  } catch (error: any) {
    console.error('Apply to jobs (bulk) error:', error);
    res.status(500).json({ error: error.message || 'Failed to apply to jobs' });
  }
});

// Mark multiple jobs as rejected/removed for the current talent user
router.post('/reject-bulk', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { jobIds } = req.body as { jobIds?: string[] };
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      res.status(400).json({ error: 'jobIds array is required' });
      return;
    }

    // Resolve person_id used in employer_auto_matched_candidates for this user
    const personResult = await query(
      'SELECT COALESCE(person_id, id)::integer AS person_id FROM users WHERE id = $1',
      [req.user.id]
    );
    const personRow = personResult.rows[0];
    if (!personRow) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const personId = personRow.person_id as number;

    const uniqueJobIds = Array.from(new Set(jobIds.map((id) => Number(id))));

    for (const jobId of uniqueJobIds) {
      if (!Number.isFinite(jobId)) continue;
      // First try to update existing match row for this person + job (source_type = 'talent').
      // If none exists, insert a new \"rejected\" record.
      // eslint-disable-next-line no-await-in-loop
      const updateResult = await query(
        `UPDATE employer_auto_matched_candidates
           SET person_reject_job = 1,
               match = FALSE,
               updated_at = CURRENT_TIMESTAMP
         WHERE person_id = $1
           AND job_id = $2
           AND source_type = 'talent'
         RETURNING id`,
        [personId, jobId]
      );

      if (updateResult.rows.length === 0) {
        // eslint-disable-next-line no-await-in-loop
        await query(
          `INSERT INTO employer_auto_matched_candidates
             (person_id, job_id, match_score, score_summary, detail_response, source_type,
              person_reject_job, match, created_at, updated_at)
           VALUES ($1, $2, NULL, NULL, NULL, 'talent', 1, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [personId, jobId]
        );
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Reject jobs (bulk) error:', error);
    res.status(500).json({ error: error.message || 'Failed to reject jobs' });
  }
});

// Get user applications (for talent)
router.get('/applications/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // If employer, get applications for their company's jobs (match by company_name or creator_id so all their jobs' applications show)
    if (req.user.role === 'employer') {
      const companyName = req.user.company_name && String(req.user.company_name).trim() ? String(req.user.company_name).trim() : null;
      const creatorId = req.user.id != null ? Number(req.user.id) : null;
      const applications = await getApplicationsForEmployer(companyName, creatorId);
      res.json({ success: true, data: applications });
      return;
    }

    // Otherwise, get applications for the logged-in user (talent). Optional ?keyword= for search by job title or company.
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : undefined;
    const applications = await getUserApplications(req.user.id, keyword);
    res.json({ success: true, data: applications });
  } catch (error: any) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: error.message || 'Failed to get applications' });
  }
});

// Get user interviews
router.get('/interviews/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Check if user is employer - if so, get interviews for their company
    if (req.user.role === 'employer' || req.user.role === 'admin') {
      // Get company name from user
      const { query } = await import('../database/connection.js');
      const userResult = await query('SELECT company_name FROM users WHERE id = $1', [req.user.id]);
      const companyName = userResult.rows[0]?.company_name;
      if (companyName) {
        const interviews = await getInterviewsForEmployer(companyName);
        res.json({ success: true, data: interviews });
        return;
      }
    }

    // Otherwise, get interviews for the user (talent)
    const interviews = await getUserInterviews(req.user.id);
    res.json({ success: true, data: interviews });
  } catch (error: any) {
    console.error('Get interviews error:', error);
    res.status(500).json({ error: error.message || 'Failed to get interviews' });
  }
});

// Update job
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { title, company, location, type, salary, match_score, skills, description } = req.body;
    const job = await updateJob(req.params.id, {
      title,
      company,
      location,
      type,
      salary,
      match_score,
      skills,
      description,
    });

    res.json({ success: true, data: job });
  } catch (error: any) {
    console.error('Update job error:', error);
    res.status(500).json({ error: error.message || 'Failed to update job' });
  }
});

// Update job status (pause/close)
router.put('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { status, status_reason } = req.body;

    if (!status || !['active', 'paused', 'closed'].includes(status)) {
      res.status(400).json({ error: 'Valid status is required' });
      return;
    }

    const job = await updateJobStatus(req.params.id, status, status_reason);
    res.json({ success: true, data: job });
  } catch (error: any) {
    console.error('Update job status error:', error);
    res.status(500).json({ error: error.message || 'Failed to update job status' });
  }
});

// Update application status (employer: Reject / Cancel Rejection)
router.patch('/applications/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { status } = req.body;
    const allowed = ['Application Sent', 'Under Review', 'Interview Scheduled', 'Rejected', 'Accepted'];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: 'Invalid status. Use one of: ' + allowed.join(', ') });
      return;
    }
    const employerId = Number(req.user.id);
    const updated = await updateApplicationStatus(req.params.id, status, employerId);
    if (!updated) {
      res.status(404).json({ error: 'Application not found or access denied' });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update application status error:', error);
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
});

// Get applications for a specific job
router.get('/:id/applications', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const applications = await getApplicationsForJob(req.params.id);
    res.json({ success: true, data: applications });
  } catch (error: any) {
    console.error('Get job applications error:', error);
    res.status(500).json({ error: error.message || 'Failed to get job applications' });
  }
});

router.post('/extract-skills', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { jobDescription } = req.body;
    if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
      res.status(400).json({ error: 'jobDescription is required' });
      return;
    }
    const skills = await extractSkillsFromJobDescription(jobDescription);
    res.json({ success: true, data: { skills } });
  } catch (error: any) {
    console.error('Extract skills error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract skills' });
  }
});

router.post('/extract-requirements', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (req.user.role !== 'admin' && req.user.role !== 'employer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { jobDescription } = req.body;
    if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
      res.status(400).json({ error: 'jobDescription is required' });
      return;
    }
    const extracted = await extractRequirementsFromJobDescription(jobDescription);
    res.json({ success: true, data: extracted });
  } catch (error: any) {
    console.error('Extract requirements error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract requirements' });
  }
});

// Create interview
router.post('/interviews', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { applicationId, interview_type, scheduled_date, scheduled_time, interviewer, status, notes } = req.body;

    if (!applicationId || !interview_type) {
      res.status(400).json({ error: 'Application ID and interview type are required' });
      return;
    }

    const interview = await createInterview(req.user.id, applicationId, {
      interview_type,
      scheduled_date: scheduled_date ? new Date(scheduled_date) : undefined,
      scheduled_time,
      interviewer,
      status: status || 'Scheduled',
      notes,
    });

    res.status(201).json({ success: true, data: interview });
  } catch (error: any) {
    console.error('Create interview error:', error);
    res.status(500).json({ error: error.message || 'Failed to create interview' });
  }
});

export default router;
