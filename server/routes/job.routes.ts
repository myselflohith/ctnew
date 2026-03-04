import { Router, Request, Response } from 'express';
import {
  getAvailableJobs,
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
  getUserInterviews,
  getInterviewsForEmployer,
  createInterview,
} from '../services/job.service.js';
import { extractSkillsFromJobDescription, extractRequirementsFromJobDescription } from '../services/job-ai.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

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

    const { title, company, location, type, salary, match_score, skills, description, addNotes } = req.body;

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
      },
      req.user?.id
    );

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

// Get user applications (for talent)
router.get('/applications/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // If employer, get applications for their company's jobs
    if (req.user.role === 'employer' && req.user.company_name) {
      const applications = await getApplicationsForEmployer(req.user.company_name);
      res.json({ success: true, data: applications });
      return;
    }

    // Otherwise, get applications for the logged-in user (talent)
    const applications = await getUserApplications(req.user.id);
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
