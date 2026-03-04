import { Router, Request, Response } from 'express';
import { Multer } from 'multer';
import { authenticateToken } from '../middleware/auth.middleware.js';
import pool from '../database/connection.js';
import {
  createAIInterview,
  getInterviewsForEmployer,
  getInterviewDetails,
  getInterviewQuestions,
  getInterviewByUniqueLink,
  inviteCandidate,
  generateQuestions,
  getCandidateReports,
  getInterviewInvites,
  submitInterviewReport,
  getInterviewReportDetails,
  getTalentInterviewSchedules,
  getTalentReportByInviteId,
  startInterviewReport,
  saveInterviewAnswer,
} from '../services/interview.service.js';
import { generateInterviewFeedback } from '../jobs/interview-feedback.js';
import { interviewVideoQueue, type InterviewVideoJobName } from '../queues/interview-video.queue.js';
import { interviewFeedbackQueue, type ScoreInterviewFeedbackJobName } from '../queues/interview-feedback.queue.js';

const enqueuePartialScoring = async (params: { reportId: number; inviteId: number; reason?: string }) => {
  const delayMs = process.env.PARTIAL_INTERVIEW_FEEDBACK_DELAY_MS
    ? Number(process.env.PARTIAL_INTERVIEW_FEEDBACK_DELAY_MS)
    : 20 * 1000; // debounce: 20s after last answer

  try {
    console.log(
      `🧠 enqueuePartialScoring(${params.reason || 'unknown'}): reportId=${params.reportId} inviteId=${params.inviteId} delay=${delayMs}ms`
    );

    // IMPORTANT:
    // BullMQ "jobId" makes jobs idempotent. If you always use the same jobId and ONLY update the delay,
    // the already-queued job may NOT get rescheduled as expected depending on BullMQ settings/version.
    // For partial interviews we want "latest activity wins", so we *explicitly remove* any existing job
    // with the same id before adding a new delayed one.
    try {
      const existing = await interviewFeedbackQueue.getJob(`score-report-${params.reportId}`);
      if (existing) {
        await existing.remove();
        console.log(`🧹 enqueuePartialScoring: removed existing jobId=score-report-${params.reportId}`);
      }
    } catch (e) {
      console.warn(`⚠️ enqueuePartialScoring: failed to remove existing jobId=score-report-${params.reportId}`, e);
    }

    await interviewFeedbackQueue.add(
      'scoreInterviewFeedback' as ScoreInterviewFeedbackJobName,
      { reportId: params.reportId, inviteId: params.inviteId, force: true },
      { delay: delayMs, jobId: `score-report-${params.reportId}` }
    );

    console.log(`✅ enqueuePartialScoring: queued jobId=score-report-${params.reportId}`);
  } catch (e) {
    console.warn('Failed to enqueue partial scoring job:', e);
  }
};

const createInterviewRoutes = (upload?: Multer) => {
  const router = Router();

// PUBLIC: Get interview by unique link (for email invitations)
router.get('/public/by-link/:uniqueLink', async (req: Request, res: Response) => {
  try {
    const { uniqueLink } = req.params;
    console.log('Received request for interview with uniqueLink:', uniqueLink);

    const interviewData = await getInterviewByUniqueLink(uniqueLink);

    if (!interviewData) {
      console.log('No interview found for uniqueLink:', uniqueLink);
      res.status(404).json({ 
        success: false,
        error: 'Interview invitation not found' 
      });
      return;
    }

    // ch-job-marketplace behavior:
    // - If invite is Pending and user is not logged in:
    //    - If user exists by invited email => force login
    //    - Else => force signup
    // - If logged in, allow only if the logged-in user matches invite email/person_id
    const authHeader = (req.headers.authorization || '').toString();
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : null;

    if (!bearer) {
      // Tell frontend to redirect to signup/login decision screen
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Please create an account or login to start this interview.',
        data: {
          inviteId: interviewData.invite_id,
          interviewId: interviewData.interview_id,
          candidateName: interviewData.candidate_name,
          candidateEmail: interviewData.candidate_email,
          interviewTitle: interviewData.interview_title,
          interviewCategory: interviewData.interview_category,
          interviewType: interviewData.type_of_interview,
          jobName: interviewData.job_name || 'Position',
          company: interviewData.job_name || 'CardinalTalent',
          inviteStatus: interviewData.invite_status,
        },
      });
      return;
    }

    // Validate token and ensure it matches the invite
    let authedUser: any = null;
    try {
      const jwt = await import('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      authedUser = jwt.default.verify(bearer, secret) as any;
    } catch {
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Please create an account or login to start this interview.',
      });
      return;
    }

    // Load user from DB to get canonical email (token may not include email)
    const userRes = await pool.query(`SELECT id, email FROM users WHERE id = $1`, [authedUser?.id]);
    const dbUser = userRes.rows?.[0];

    const authedUserId = dbUser?.id || authedUser?.id;
    const authedEmail = (dbUser?.email || authedUser?.email || '').toString().toLowerCase().trim();

    const invitePersonId = interviewData.invite_person_id;
    const inviteEmail = (interviewData.candidate_email || '').toString().toLowerCase().trim();

    const matchesInvite =
      (invitePersonId && authedUserId && String(invitePersonId) === String(authedUserId)) ||
      (inviteEmail && authedEmail && inviteEmail === authedEmail);

    if (!matchesInvite) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'This interview link is not assigned to your account.',
      });
      return;
    }
    
    // Format questions for frontend
    const formattedQuestions = interviewData.questions.map((q: any, index: number) => ({
      id: q.id,
      text: q.question,
      weight: q.question_weight || 1,
      order: index + 1,
      type: q.type,
    }));

    res.json({
      success: true,
      data: {
        inviteId: interviewData.invite_id,
        interviewId: interviewData.interview_id,
        candidateName: interviewData.candidate_name,
        candidateEmail: interviewData.candidate_email,
        interviewTitle: interviewData.interview_title,
        interviewCategory: interviewData.interview_category,
        interviewType: interviewData.type_of_interview,
        jobName: interviewData.job_name || 'Position',
        jobDescription: interviewData.job_description || '',
        additionalSkills: interviewData.addition_skill || '',
        company: interviewData.job_name || 'CardinalTalent',
        inviteStatus: interviewData.invite_status,
        questions: formattedQuestions,
        guidelines: [
          'Answer questions clearly and concisely',
          'Speak naturally and avoid reading from notes',
          'Take your time to think before answering',
          'Be yourself and show your personality'
        ],
      },
    });
  } catch (error: any) {
    console.error('Get interview by link error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to get interview' 
    });
  }
});

// Create a new AI interview
router.post('/store', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Handle nested interview_param structure from frontend
    const payload = req.body.interview_param || req.body;
    const { 
      job_id, 
      job_list, 
      status, 
      question_type, 
      type_of_interview, 
      interview_category, 
      interview_title,
      addition_skill,
      questions, 
      ai_question 
    } = payload;

    const finalJobId = job_id || job_list;
    if (!finalJobId) {
      res.status(400).json({ error: 'job_id is required' });
      return;
    }

    // Combine custom and AI questions
    const allQuestions = [
      ...(questions || []).map((q: any) => ({ ...q, type: 'custom' })),
      ...(ai_question ? (typeof ai_question === 'string' ? JSON.parse(ai_question) : ai_question) : []).map((q: any) => ({ ...q, type: 'generated' })),
    ];

    const interview = await createAIInterview(
      req.user.id,
      finalJobId,
      status || 'pending',
      question_type || '',
      type_of_interview || 'Practice',
      interview_category || '',
      interview_title || '',
      addition_skill || '',
      allQuestions
    );

    res.json({ success: true, interview });
  } catch (error: any) {
    console.error('Create interview error:', error);
    res.status(500).json({ error: error.message || 'Failed to create interview' });
  }
});

/**
 * Get all interviews for employer
 *
 * Query params (feature parity with ch-job-marketplace):
 *  - status: "active" | "archieved" | "archived"  (default: active)
 *  - search: string (matches interview_title, type_of_interview, job title)
 */
router.get('/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const status = (req.query.status || '').toString().toLowerCase().trim();
    const search = (req.query.search || '').toString().trim();

    const interviews = await getInterviewsForEmployer(req.user.id, { status, search });
    res.json({ success: true, data: interviews });
  } catch (error: any) {
    console.error('Get interviews error:', error);
    res.status(500).json({ error: error.message || 'Failed to get interviews' });
  }
});

/**
 * Get interview invites (candidates) for an interview
 *
 * Query params (feature parity with ch-job-marketplace):
 *  - status: "active" | "archieved" | "archived" (default: active)
 *  - interview_status: "Pending" | "In Progress" | "Completed" | "Partially Completed"
 *  - search: string (candidate name/email/status)
 *  - start_date/end_date: YYYY-MM-DD (filters by DATE(created_at))
 *  - sortField: created_at|updated_at|candidate_name|candidate_email|status
 *  - sortDirection: ASC|DESC
 */
router.get('/:id/invites', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Debug: helps diagnose "Candidates (0)" issues quickly
    // (safe to keep; does not log tokens)
    console.log('[invites] user:', req.user?.id, 'interview:', req.params.id, 'query:', req.query);

    const { id } = req.params;

    const page = Math.max(1, Number(req.query.page) || 1);
    const perPageRaw = Number(req.query.per_page) || 10;
    const perPage = Math.min(Math.max(perPageRaw, 1), 50);

    const list = await getInterviewInvites(parseInt(id), {
      status: (req.query.status || '').toString(),
      interview_status: (req.query.interview_status || '').toString(),
      search: (req.query.search || '').toString(),
      start_date: (req.query.start_date || '').toString(),
      end_date: (req.query.end_date || '').toString(),
      sortField: (req.query.sortField || '').toString(),
      sortDirection: (req.query.sortDirection || '').toString(),
    });

    const totalCount = list.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
    const start = (page - 1) * perPage;
    const pagedList = list.slice(start, start + perPage);

    res.json({
      success: true,
      data: {
        list: pagedList,
        total_count: totalCount,
        total_pages: totalPages,
        current_counts: pagedList.length,
        per_page: perPage,
      },
    });
  } catch (error: any) {
    console.error('Get interview invites error:', error);
    res.status(500).json({ error: error.message || 'Failed to get invites' });
  }
});

// Get interview details
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const interview = await getInterviewDetails(parseInt(id));

    if (!interview) {
      res.status(404).json({ error: 'Interview not found' });
      return;
    }

    res.json({ success: true, data: interview });
  } catch (error: any) {
    console.error('Get interview details error:', error);
    res.status(500).json({ error: error.message || 'Failed to get interview' });
  }
});

// Invite candidate to interview
router.post('/:id/candidate_invite', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { candidate_name, candidate_email, phone_num } = req.body;

    if (!candidate_name || !candidate_email) {
      res.status(400).json({ error: 'candidate_name and candidate_email are required' });
      return;
    }

    const invite = await inviteCandidate(
      parseInt(id),
      candidate_name,
      candidate_email,
      phone_num
    );

    res.json({ success: true, data: invite });
  } catch (error: any) {
    console.error('Invite candidate error:', error);
    res.status(500).json({ error: error.message || 'Failed to invite candidate' });
  }
});

// Archive / unarchive interview invite (candidate)
// Mirrors ch-job-marketplace:
//  - archive: sets discarded_at (soft delete)
//  - restore: clears discarded_at
router.post('/invites/:inviteId/archive', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const inviteId = parseInt(req.params.inviteId);
    if (isNaN(inviteId)) {
      res.status(400).json({ success: false, error: 'inviteId must be a valid number' });
      return;
    }

    // Match ch-job-marketplace behavior:
    // - Archive requires a reason.
    // - If reason is "Other", a note is required.
    const reason = (req.body?.reason || '').toString().trim();
    const reason_note = (req.body?.reason_note || '').toString().trim();

    if (!reason) {
      res.status(400).json({ success: false, error: 'reason is required' });
      return;
    }

    if (reason.toLowerCase() === 'other' && !reason_note) {
      res.status(400).json({ success: false, error: 'reason_note is required when reason is Other' });
      return;
    }

    await pool.query(
      `UPDATE ai_interview_invites
       SET discarded_at = COALESCE(discarded_at, NOW()),
           reason = $2,
           reason_note = NULLIF($3, ''),
           updated_at = NOW()
       WHERE id = $1`,
      [inviteId, reason, reason_note]
    );

    res.json({ success: true, message: 'Candidate archived successfully' });
  } catch (error: any) {
    console.error('Archive invite error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to archive invite' });
  }
});

router.post('/invites/:inviteId/unarchive', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const inviteId = parseInt(req.params.inviteId);
    if (isNaN(inviteId)) {
      res.status(400).json({ success: false, error: 'inviteId must be a valid number' });
      return;
    }

    await pool.query(
      `UPDATE ai_interview_invites
       SET discarded_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [inviteId]
    );

    res.json({ success: true, message: 'Candidate unarchived successfully' });
  } catch (error: any) {
    console.error('Unarchive invite error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to unarchive invite' });
  }
});

// Generate questions using AI
router.post('/:id/generate_questions', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { job_description, num_questions } = req.body;

    const questions = await generateQuestions(
      parseInt(id),
      job_description,
      num_questions || 5
    );

    res.json({ success: true, data: questions });
  } catch (error: any) {
    console.error('Generate questions error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate questions' });
  }
});

// Get candidate reports for an interview
router.get('/:id/reports', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const reports = await getCandidateReports(parseInt(id));

    res.json({ success: true, data: reports });
  } catch (error: any) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: error.message || 'Failed to get reports' });
  }
});

// Submit interview report
router.post('/:id/submit_report', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    let { ai_interview_invite_id, interview_start_at, transcript_text, rating, score, ai_feedback, interview_video_url, report_details } = req.body;

    if (!ai_interview_invite_id) {
      res.status(400).json({ error: 'ai_interview_invite_id is required' });
      return;
    }

    // Ensure invite ID is a number
    const inviteIdNum = parseInt(ai_interview_invite_id);
    if (isNaN(inviteIdNum)) {
      res.status(400).json({ error: 'ai_interview_invite_id must be a valid number' });
      return;
    }

    console.log('\n========== SUBMIT REPORT DEBUG ==========');
    console.log('📤 Received submit_report request');
    console.log('Interview ID:', id);
    console.log('Invite ID:', inviteIdNum, '(type: number)');
    console.log('Transcript length:', transcript_text?.length || 0);
    console.log('Report details count:', report_details?.length || 0);
    
    if (report_details && report_details.length > 0) {
      console.log('\n📋 Report Details Breakdown:');
      report_details.forEach((detail: any, idx: number) => {
        console.log(`\n  [Detail #${idx + 1}]`);
        console.log(`    Question: "${detail.question?.substring(0, 80) || 'N/A'}..."`);
        console.log(`    Answer: "${detail.transcript_text?.substring(0, 80) || 'N/A'}..."`);
        console.log(`    Weight: ${detail.question_weight || 1}`);
        console.log(`    Type: ${detail.que_type}`);
      });
    } else {
      console.log('⚠️  WARNING: No report_details received!');
    }
    console.log('=========================================\n');

    const report = await submitInterviewReport(parseInt(id), inviteIdNum, {
      interview_start_at,
      transcript_text,
      rating,
      score,
      ai_feedback,
      interview_video_url,
      report_details,
    });

    // IMPORTANT:
    // Only enqueue scoring when there is at least 1 answered question.
    // Otherwise the worker will (correctly) skip, and employer UI will show N/A.
    let answeredCount = 0;
    try {
      const answeredCountRes = await pool.query(
        `SELECT COUNT(*)::int as answered_count
         FROM ai_interview_report_details
         WHERE ai_interview_report_id = $1
           AND LENGTH(TRIM(COALESCE(transcript_text, ''))) > 0`,
        [report.id]
      );
      answeredCount = Number(answeredCountRes.rows?.[0]?.answered_count ?? 0);
    } catch (e) {
      console.warn('Failed to count answered questions on submit_report:', e);
    }

    if (answeredCount > 0) {
      // Mark Completed
      try {
        await pool.query(
          `UPDATE ai_interview_invites SET status = $1, updated_at = NOW() WHERE id = $2`,
          ['Completed', inviteIdNum]
        );
      } catch (e) {
        console.warn('Failed to set invite status Completed:', e);
      }

      // Enqueue scoring + feedback asynchronously (do NOT block the submit_report response).
      // This keeps the "finish interview" UX fast.
      try {
        await interviewFeedbackQueue.add(
          'scoreInterviewFeedback' as ScoreInterviewFeedbackJobName,
          { reportId: report.id, inviteId: inviteIdNum },
          { jobId: `score-report-${report.id}` }
        );
      } catch (e) {
        console.warn('Failed to enqueue scoring job (will rely on cron fallback):', e);
      }
    } else {
      console.warn(
        `⚠️ submit_report: not enqueuing scoring and not marking Completed for invite ${inviteIdNum} (0 answered questions)`
      );
    }

    console.log('✅ Report saved successfully:', report.id);
    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Submit report error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit report' });
  }
});

// Get interview report details by reportId
router.get('/reports/:reportId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { reportId } = req.params;
    const report = await getInterviewReportDetails(parseInt(reportId));

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Get report details error:', error);
    res.status(500).json({ error: error.message || 'Failed to get report' });
  }
});

// Get interview report by inviteId (for employer candidate reports)
router.get('/employer/report-by-invite/:inviteId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { inviteId } = req.params;

    // IMPORTANT:
    // Allow fetching report even if the invite is archived (discarded_at set).
    // Poor interviews are auto-archived after scoring, but the report + rating must remain visible.
    const result = await pool.query(
      `SELECT 
        air.*,
        aii.candidate_name,
        aii.candidate_email,
        aii.interview_id,
        ai.interview_title,
        ai.interview_category
       FROM ai_interview_reports air
       INNER JOIN ai_interview_invites aii ON air.ai_interview_invite_id = aii.id
       INNER JOIN ai_interviews ai ON air.interview_id = ai.id
       WHERE air.ai_interview_invite_id = $1
         AND air.discarded_at IS NULL
       ORDER BY air.created_at DESC
       LIMIT 1`,
      [parseInt(inviteId)]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Report not found for this invite' });
      return;
    }

    const report = result.rows[0];
    
    // Fetch report details
    const detailsResult = await pool.query(
      `SELECT * FROM ai_interview_report_details 
       WHERE ai_interview_report_id = $1 
       ORDER BY id ASC`,
      [report.id]
    );

    const safeJsonParse = (value: any) => {
      if (!value) return null;
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        // Some rows may contain plain text like "Awaiting processing" instead of JSON.
        return value;
      }
    };

    // Completion metrics
    // IMPORTANT: answered_count should count only answered questions (non-empty transcript_text).
    // Otherwise partially completed interviews can show 100% completion and confuse report logic.
    const answeredCount = (detailsResult.rows || []).filter(
      (r: any) => (r?.transcript_text || '').toString().trim().length > 0
    ).length;

    const totalQuestionsRes = await pool.query(
      `SELECT
         (
           (SELECT COUNT(*) FROM ai_interview_custom_questions WHERE ai_interview_id = $1 AND discarded_at IS NULL)
           +
           (SELECT COUNT(*) FROM ai_generated_questions WHERE interview_id = $1 AND discarded_at IS NULL)
         )::int as total_questions`,
      [report.interview_id]
    );
    const totalQuestions = Number(totalQuestionsRes.rows?.[0]?.total_questions ?? 0);

    const completionPercentage =
      totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    // Fallback for partial interviews:
    // If overall rating is missing but we have at least one answered question, do not show "N/A".
    // This fixes employer UI candidate list/report showing N/A + "Pending overall rating" forever.
    const detailRatings = (detailsResult.rows || [])
      .map((r: any) => (r?.rating || '').toString().trim())
      .filter((r: string) => r.length > 0 && r.toLowerCase() !== 'practice');

    const hasAnyScoredDetail = detailRatings.length > 0 || !!report.score || !!report.ai_feedback;

    // If OpenAI scoring hasn't run yet, employer should still see an overall rating for partial interviews.
    // Derive a simple "Great/Average/Poor" from already-scored detail ratings.
    // This avoids "Pending forever" when the worker isn't running or API key isn't configured.
    const deriveOverallFromDetails = () => {
      if (!detailRatings.length) return null;

      const norm = detailRatings.map(r => r.toLowerCase());
      const counts = norm.reduce(
        (acc: Record<string, number>, r: string) => {
          acc[r] = (acc[r] || 0) + 1;
          return acc;
        },
        {}
      );

      // Prefer majority vote.
      const top = (Object.entries(counts) as Array<[string, number]>).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      if (top.includes('great')) return 'Great';
      if (top.includes('poor')) return 'Poor';
      if (top.includes('average')) return 'Average';

      // Fallback: if any poor and no great => Poor; else Average.
      if (norm.some(r => r.includes('poor')) && !norm.some(r => r.includes('great'))) return 'Poor';
      return 'Average';
    };

    const derivedRating = deriveOverallFromDetails();

    // IMPORTANT:
    // Never use "Partial" as an overall rating label. Rating should always be:
    // - Great/Average/Poor (when we can derive it)
    // - null (so UI shows "Pending"/"Generating..." while worker runs)
    //
    // "Partial/Partially Completed" is an interview *status*, not a rating.
    const fallbackRating =
      !report.rating || String(report.rating).trim().length === 0
        ? answeredCount > 0
          ? derivedRating || null
          : null
        : report.rating;

    const formattedReport = {
      id: report.id,
      interview_id: report.interview_id,
      ai_interview_invite_id: report.ai_interview_invite_id,
      interview_start_at: report.interview_start_at,
      transcript_text: report.transcript_text,
      interview_video_url: report.interview_video_url,
      rating: fallbackRating,
      score: safeJsonParse(report.score),
      ai_feedback: safeJsonParse(report.ai_feedback),
      candidate_name: report.candidate_name,
      candidate_email: report.candidate_email,
      interview_title: report.interview_title,
      interview_category: report.interview_category,
      answered_count: answeredCount,
      total_questions: totalQuestions,
      completion_percentage: completionPercentage,
      is_processing: answeredCount > 0 && !hasAnyScoredDetail && (!report.rating || !report.score || !report.ai_feedback),
      processing_status:
        answeredCount === 0
          ? 'no_answers'
          : hasAnyScoredDetail
            ? 'partial_scored'
            : 'generating_feedback',
      details: detailsResult.rows.map((row: any) => ({
        id: row.id,
        question: row.question,
        transcript_text: row.transcript_text,
        video_url: row.video_url,
        score: safeJsonParse(row.score),
        rating: row.rating,
        ai_feedback: safeJsonParse(row.ai_feedback),
        que_type: row.que_type,
        created_at: row.created_at,
      })),
      created_at: report.created_at,
      updated_at: report.updated_at,
    };

    res.json({ success: true, data: formattedReport });
  } catch (error: any) {
    console.error('Get report by invite error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get report' });
  }
});

// Get scheduled interviews for talent
router.get('/talent/scheduled', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const interviews = await getTalentInterviewSchedules(req.user.id);
    res.json({ success: true, data: interviews });
  } catch (error: any) {
    console.error('Get talent interviews error:', error);
    res.status(500).json({ error: error.message || 'Failed to get interviews' });
  }
});

// Get interview report for talent by invite ID
router.get('/talent/report/:inviteId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { inviteId } = req.params;
    const report = await getTalentReportByInviteId(parseInt(inviteId));

    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Get talent report error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get report' });
  }
});

// Get interview reports for employer (by job_id)
router.get('/employer/reports/:jobId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { jobId } = req.params;
    const { interviewId } = req.query;

    let query = `SELECT 
        aii.id as invite_id,
        aii.candidate_name,
        aii.candidate_email,
        aii.status,
        aii.created_at as invited_at,
        air.id as report_id,
        air.rating,
        air.score,
        air.ai_feedback,
        ai.interview_title,
        ai.id as interview_id
       FROM ai_interview_invites aii
       INNER JOIN ai_interviews ai ON aii.interview_id = ai.id
       LEFT JOIN ai_interview_reports air ON aii.id = air.ai_interview_invite_id
       WHERE `;

    let params: any[] = [];

    if (interviewId) {
      // Filter by specific interview
      query += `ai.id = $1`;
      params = [interviewId];
    } else {
      // Filter by job_id
      query += `ai.job_id = $1`;
      params = [jobId];
    }

    query += ` ORDER BY aii.created_at DESC`;

    // Get all completed interviews for this job/interview with reports
    const result = await pool.query(query, params);

    const reports = result.rows.map((row: any) => {
      let parsedScore = null;
      let parsedFeedback = null;

      // Safely parse score
      if (row.score) {
        try {
          parsedScore = typeof row.score === 'string' ? JSON.parse(row.score) : row.score;
        } catch (e) {
          console.warn('Failed to parse score:', row.score);
          parsedScore = null;
        }
      }

      // Safely parse feedback
      if (row.ai_feedback) {
        try {
          parsedFeedback = typeof row.ai_feedback === 'string' ? JSON.parse(row.ai_feedback) : row.ai_feedback;
        } catch (e) {
          console.warn('Failed to parse feedback:', row.ai_feedback);
          parsedFeedback = null;
        }
      }

      return {
        inviteId: row.invite_id,
        candidateName: row.candidate_name,
        candidateEmail: row.candidate_email,
        status: row.status,
        invitedAt: row.invited_at,
        reportId: row.report_id,
        rating: row.rating,
        score: parsedScore,
        aiFeedback: parsedFeedback,
        interviewTitle: row.interview_title,
        interviewId: row.interview_id,
      };
    });

    res.json({ success: true, data: reports });
  } catch (error: any) {
    console.error('Get employer reports error:', error);
    res.status(500).json({ error: error.message || 'Failed to get reports' });
  }
});

// Get interview reports by interview ID (for employer)
router.get('/employer/interview-reports/:interviewId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { interviewId } = req.params;

    // IMPORTANT:
    // When listing ARCHIVED invites, still return their report (rating/score/ai_feedback).
    // Previously this endpoint always joined only "non-discarded reports", which made
    // archived poor interviews show N/A even though report data exists.
    const isArchived =
      (req.query.status || '').toString().toLowerCase().trim() === 'archieved' ||
      (req.query.status || '').toString().toLowerCase().trim() === 'archived' ||
      (req.query.status || '').toString().toLowerCase().trim() === 'archive';

    const result = await pool.query(
      `SELECT 
        aii.id as invite_id,
        aii.candidate_name,
        aii.candidate_email,
        aii.status,
        aii.created_at as invited_at,
        air.id as report_id,
        air.rating,
        air.score,
        air.ai_feedback,
        ai.interview_title
       FROM ai_interview_invites aii
       INNER JOIN ai_interviews ai ON aii.interview_id = ai.id
       LEFT JOIN ai_interview_reports air
         ON aii.id = air.ai_interview_invite_id
        AND air.discarded_at IS NULL
        AND air.created_at = (
          SELECT MAX(air2.created_at)
          FROM ai_interview_reports air2
          WHERE air2.ai_interview_invite_id = aii.id
            AND air2.discarded_at IS NULL
        )
       WHERE ai.id = $1
         AND (
           -- Active list (default): invite not archived
           ($2::boolean = false AND aii.discarded_at IS NULL)
           OR
           -- Archived list: invite archived
           ($2::boolean = true AND aii.discarded_at IS NOT NULL)
         )
         AND aii.status IN ('Completed','Partially Completed')
       ORDER BY aii.created_at DESC`,
      [interviewId, isArchived]
    );

    // If archived list & report join returned NULL (older data / bad join), fall back and fetch latest report anyway.
    // This ensures archived candidates still show rating/report.
    let rows = result.rows;
    if (isArchived && rows.some((r: any) => !r.report_id)) {
      try {
        const fallback = await pool.query(
          `SELECT 
            aii.id as invite_id,
            aii.candidate_name,
            aii.candidate_email,
            aii.status,
            aii.created_at as invited_at,
            air.id as report_id,
            air.rating,
            air.score,
            air.ai_feedback,
            ai.interview_title
           FROM ai_interview_invites aii
           INNER JOIN ai_interviews ai ON aii.interview_id = ai.id
           LEFT JOIN ai_interview_reports air
             ON aii.id = air.ai_interview_invite_id
            AND air.discarded_at IS NULL
            AND air.created_at = (
              SELECT MAX(air2.created_at)
              FROM ai_interview_reports air2
              WHERE air2.ai_interview_invite_id = aii.id
                AND air2.discarded_at IS NULL
            )
           WHERE ai.id = $1
             AND aii.discarded_at IS NOT NULL
             AND aii.status IN ('Completed','Partially Completed')
           ORDER BY aii.created_at DESC`,
          [interviewId]
        );
        rows = fallback.rows;
      } catch (e) {
        console.warn('Archived report fallback query failed:', e);
      }
    }

    const reports = rows.map((row: any) => {
      let parsedScore = null;
      let parsedFeedback = null;

      if (row.score) {
        try {
          parsedScore = typeof row.score === 'string' ? JSON.parse(row.score) : row.score;
        } catch (e) {
          parsedScore = null;
        }
      }

      if (row.ai_feedback) {
        try {
          parsedFeedback = typeof row.ai_feedback === 'string' ? JSON.parse(row.ai_feedback) : row.ai_feedback;
        } catch (e) {
          parsedFeedback = null;
        }
      }

      return {
        inviteId: row.invite_id,
        candidateName: row.candidate_name,
        candidateEmail: row.candidate_email,
        status: row.status,
        invitedAt: row.invited_at,
        reportId: row.report_id,
        rating: row.rating,
        score: parsedScore,
        aiFeedback: parsedFeedback,
        interviewTitle: row.interview_title,
      };
    });

    console.log(`📊 Fetched ${reports.length} reports for interview ${interviewId}`);
    res.json({ success: true, data: reports });
  } catch (error: any) {
    console.error('Get interview reports error:', error);
    res.status(500).json({ error: error.message || 'Failed to get reports' });
  }
});

// OpenAI Text-to-Speech endpoint
router.post('/openai_speak', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: Return error but don't crash - frontend will use Web Speech API
      res.status(500).json({ error: 'OpenAI API key not configured. Using browser TTS.' });
      return;
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.substring(0, 4096), // API limit
        voice: 'nova',
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI TTS failed');
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error: any) {
    console.error('OpenAI TTS error:', error);
    // Return empty response so frontend can gracefully handle
    res.status(500).json({ error: error.message || 'Text-to-speech failed' });
  }
});

// Transcription endpoint using OpenAI Whisper
router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const file = req.file;
    
    if (!file) {
      res.status(400).json({ error: 'Audio file is required' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    const formData = new FormData();
    formData.append('file', new Blob([Buffer.from(file.buffer)], { type: 'audio/webm' }), 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Transcription failed');
    }

    const result = await response.json();
    res.json({ text: result.text || '' });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Transcription failed' });
  }
});

// GPT Chat endpoint for interview questions
router.post('/chat', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { model, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Chat failed');
    }

    const result = await response.json();
    res.json({
      choices: result.choices || [],
      usage: result.usage,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Chat failed' });
  }
});

// Fetch questions for interview
router.get('/fetch_questions/:interviewId/:inviteId', async (req: Request, res: Response) => {
  try {
    const { interviewId, inviteId } = req.params;

    // First, get the interview to find job_id
    const interviewResult = await pool.query(
      `SELECT id, job_id FROM ai_interviews WHERE id = $1`,
      [interviewId]
    );

    if (interviewResult.rows.length === 0) {
      return res.json({ success: false, questions: [], message: 'Interview not found' });
    }

    const interview = interviewResult.rows[0];
    const jobId = interview.job_id;

    // Fetch questions in the same way as /public/by-link:
    // include BOTH custom + generated (and only fall back to job-level if both are empty)
    let questionsResult = await pool.query(
      `
      (SELECT id, question as question_text, question_weight, 'custom' as source
       FROM ai_interview_custom_questions
       WHERE ai_interview_id = $1 AND discarded_at IS NULL
       ORDER BY created_at ASC)
      UNION ALL
      (SELECT id, question as question_text, question_weight, 'generated' as source
       FROM ai_generated_questions
       WHERE interview_id = $1 AND discarded_at IS NULL
       ORDER BY created_at ASC)
      `,
      [interviewId]
    );

    // If still no questions, fall back to job-level questions
    if (questionsResult.rows.length === 0) {
      questionsResult = await pool.query(
        `SELECT id, question as question_text, question_weight, 'job' as source
         FROM ai_interview_questions
         WHERE job_id = $1 AND discarded_at IS NULL
         ORDER BY question_weight DESC, created_at ASC`,
        [jobId]
      );
    }

    // If still empty, return a debug payload so we can see what's wrong in prod/dev quickly
    if (questionsResult.rows.length === 0) {
      const debugCustom = await pool.query(
        `SELECT COUNT(*)::int as count FROM ai_interview_custom_questions WHERE ai_interview_id = $1 AND discarded_at IS NULL`,
        [interviewId]
      );
      const debugGenerated = await pool.query(
        `SELECT COUNT(*)::int as count FROM ai_generated_questions WHERE interview_id = $1 AND discarded_at IS NULL`,
        [interviewId]
      );
      const debugJob = await pool.query(
        `SELECT COUNT(*)::int as count FROM ai_interview_questions WHERE job_id = $1 AND discarded_at IS NULL`,
        [jobId]
      );

      return res.json({
        success: false,
        questions: [],
        message: 'No questions found for this interview',
        debug: {
          interviewId,
          inviteId,
          jobId,
          counts: {
            custom: debugCustom.rows?.[0]?.count ?? null,
            generated: debugGenerated.rows?.[0]?.count ?? null,
            job: debugJob.rows?.[0]?.count ?? null,
          },
        },
      });
    }

    // Get already answered questions for this invite.
    // IMPORTANT: We must compare question->question, not answer(transcript)->question.
    // Otherwise we end up repeating questions and the UI can appear to "autofill" the last answer.
    const answeredResult = await pool.query(
      `SELECT LOWER(TRIM(COALESCE(question, ''))) as answered_question
       FROM ai_interview_report_details
       WHERE ai_interview_invite_id = $1`,
      [inviteId]
    );

    const answeredQuestions = answeredResult.rows
      .map((r: any) => r.answered_question)
      .filter((t: any) => t && typeof t === 'string');

    // Filter out already answered questions (case-insensitive exact match)
    const unansweredQuestions = questionsResult.rows.filter((row: any) => {
      if (answeredQuestions.length === 0) return true;
      const questionLower = (row.question_text || '').toString().trim().toLowerCase();
      if (!questionLower) return true;
      return !answeredQuestions.includes(questionLower);
    });

    const questions = (unansweredQuestions.length > 0 ? unansweredQuestions : questionsResult.rows).map((row: any, index: number) => ({
      id: row.id,
      label: row.question_text,
      type: 'general',
      index: index,
    }));

    res.json({ success: true, questions });
  } catch (error: any) {
    console.error('Fetch questions error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch questions' });
  }
});

/**
 * Create (or fetch) an interview report at the start of a REAL interview.
 * Practice interviews should not create reports.
 *
 * Body:
 *  - ai_interview_invite_id: number
 */
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ai_interview_invite_id } = req.body;

    if (!ai_interview_invite_id) {
      res.status(400).json({ success: false, error: 'ai_interview_invite_id is required' });
      return;
    }

    // Public start:
    // - This endpoint is called when the user clicks "Start Interview"
    // - It expires the link immediately (status -> In Progress + unique_interview_link -> expired_*)
    // - It is safe without auth because it requires the invite_id and interview_id to match
    //   (validated inside startInterviewReport).
    const report = await startInterviewReport(parseInt(id), parseInt(ai_interview_invite_id));
    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Start interview report error:', error);

    // If the invite was already used, return a clear 410 Gone so frontend can show "expired".
    const msg = (error?.message || '').toString();
    if (msg.toLowerCase().includes('already used')) {
      res.status(410).json({ success: false, error: 'LINK_EXPIRED', message: msg });
      return;
    }

    res.status(500).json({ success: false, error: error.message || 'Failed to start interview report' });
  }
});

/**
 * Save a single answer (upsert) for a REAL interview.
 * Practice interviews should not save answers.
 *
 * Body:
 *  - ai_interview_invite_id: number
 *  - question_id?: number
 *  - question: string
 *  - transcript_text: string
 *  - question_weight?: number
 *  - que_type?: string
 */
router.post('/:id/answer', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { ai_interview_invite_id, question_id, question, transcript_text, question_weight, que_type } = req.body;

    if (!ai_interview_invite_id) {
      res.status(400).json({ success: false, error: 'ai_interview_invite_id is required' });
      return;
    }

    if (!question || !transcript_text) {
      res.status(400).json({ success: false, error: 'question and transcript_text are required' });
      return;
    }

    const result = await saveInterviewAnswer(parseInt(id), parseInt(ai_interview_invite_id), {
      question_id: question_id ? parseInt(question_id) : undefined,
      question,
      transcript_text,
      question_weight: question_weight ? parseInt(question_weight) : undefined,
      que_type,
    });

    // Enqueue partial scoring on every saved answer (debounced by reportId jobId).
    // This enables partial AI feedback + partial score based on answered questions so far.
    try {
      const reportId = Number((result as any)?.report?.id);
      const inviteId = parseInt(ai_interview_invite_id);
      if (reportId && inviteId) {
        await enqueuePartialScoring({ reportId, inviteId, reason: 'answer' });
      } else {
        console.warn(
          `⚠️ enqueuePartialScoring(answer) skipped: reportId=${String(reportId)} inviteId=${String(inviteId)}`
        );
      }
    } catch (e) {
      console.warn('Failed to enqueue scoring after answer:', e);
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Save interview answer error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save answer' });
  }
});

/**
 * Mark an interview as ended early (talent skipped/left).
 * This should:
 *  - set invite status = 'Partially Completed' (if not already Completed)
 *  - ensure a report exists
 *  - trigger AI feedback generation asynchronously (fast response)
 *
 * Body:
 *  - ai_interview_invite_id: number
 */
router.post('/:id/end', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { ai_interview_invite_id } = req.body;

    if (!ai_interview_invite_id) {
      res.status(400).json({ success: false, error: 'ai_interview_invite_id is required' });
      return;
    }

    const interviewId = parseInt(id);
    const inviteId = parseInt(ai_interview_invite_id);

    // Ensure report exists (do NOT call startInterviewReport here)
    const existing = await pool.query(
      `SELECT * FROM ai_interview_reports
       WHERE interview_id = $1 AND ai_interview_invite_id = $2 AND discarded_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [interviewId, inviteId]
    );

    let reportId: number;
    if (existing.rows.length > 0) {
      reportId = existing.rows[0].id;
    } else {
      const created = await pool.query(
        `INSERT INTO ai_interview_reports
         (interview_id, ai_interview_invite_id, interview_start_at, transcript_text, created_at, updated_at)
         VALUES ($1, $2, NOW()::date, '', NOW(), NOW())
         RETURNING id`,
        [interviewId, inviteId]
      );
      reportId = created.rows[0].id;
    }

    // Mark invite as Partially Completed (unless already Completed)
    await pool.query(
      `UPDATE ai_interview_invites
       SET status = CASE
         WHEN LOWER(status) IN ('completed','complete') THEN status
         ELSE 'Partially Completed'
       END,
       updated_at = NOW()
       WHERE id = $1`,
      [inviteId]
    );

    // Ensure report is eligible for scoring worker:
    // generateInterviewFeedback requires air.interview_start_at IS NOT NULL
    try {
      await pool.query(
        `UPDATE ai_interview_reports
         SET interview_start_at = COALESCE(interview_start_at, NOW()::date),
             updated_at = NOW()
         WHERE id = $1`,
        [reportId]
      );
    } catch (e) {
      console.warn('Failed to ensure interview_start_at for partial report:', e);
    }

    // Enqueue scoring in worker.
    // When user exits, we want the report ASAP based on last saved answers.
    // Still keep debounced scoring on each answer/upload for "in progress" partial feedback.
    //
    // IMPORTANT:
    // Only enqueue scoring when there is at least 1 answered question.
    // If 0 answered questions, we still keep the status as Partially Completed,
    // but we should not generate an AI report/rating (prevents hallucinated ratings).
    try {
      const answeredCountRes = await pool.query(
        `SELECT COUNT(*)::int as answered_count
         FROM ai_interview_report_details
         WHERE ai_interview_report_id = $1
           AND LENGTH(TRIM(COALESCE(transcript_text, ''))) > 0`,
        [reportId]
      );
      const answeredCount = Number(answeredCountRes.rows?.[0]?.answered_count ?? 0);

      if (answeredCount > 0) {
        // On end we want the same debounce semantics, but typically immediate.
        // If you want to delay on end specifically, set PARTIAL_INTERVIEW_FEEDBACK_DELAY_MS accordingly.
        await enqueuePartialScoring({ reportId, inviteId, reason: 'end' });
      } else {
        console.log(
          `⚠️ end: not enqueuing scoring for report ${reportId} (0 answered questions); status remains Partially Completed`
        );
      }
    } catch (e) {
      console.warn('Failed to enqueue feedback scoring job for partial interview:', e);
    }

    res.json({ success: true, data: { report_id: reportId, invite_id: inviteId, status: 'Partially Completed' } });
  } catch (error: any) {
    console.error('End interview early error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to end interview' });
  }
});

// Store interview logs
router.post('/store_interview_logs', async (req: Request, res: Response) => {
  try {
    const { invite_id, detail, question } = req.body;

    if (!invite_id || !detail) {
      return res.status(400).json({ error: 'invite_id and detail are required' });
    }

    await pool.query(
      `INSERT INTO ai_interview_logs (ai_interview_invite_id, details, log_type, created_at, updated_at)
       VALUES ($1, $2, 'event', NOW(), NOW())`,
      [invite_id, detail]
    );

    res.json({ success: true, message: 'Log stored' });
  } catch (error: any) {
    console.error('Store logs error:', error);
    res.status(500).json({ error: error.message || 'Failed to store logs' });
  }
});

// Upload interview response video
const uploadMiddleware = upload ? upload.single('file') : (_req: any, _res: any, next: any) => next();

router.post('/upload_video', uploadMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { interview_id, ai_interview_invite_id, question, que_type, is_completed, transcript, question_id } = req.body;
    const questionIndex = req.body.question_index || 0;

    if (!interview_id || !ai_interview_invite_id) {
      return res.status(400).json({ error: 'interview_id and ai_interview_invite_id are required' });
    }

    // Public URL path for the uploaded file
    const videoPath = `/uploads/interviews/${(req.file as Express.Multer.File).filename}`;

    // IMPORTANT:
    // Store a FULL URL in DB so report pages can render video without guessing host.
    // (If you later move uploads to S3/CDN, this is the field to update.)
    const baseUrl =
      (process.env.PUBLIC_BASE_URL || '').trim() ||
      `http://172.17.252.184:${process.env.PORT || 3001}`;

    const videoUrl = `${baseUrl}${videoPath}`;

    // Absolute path on disk (multer stored it here)
    const filePath = (req.file as Express.Multer.File).path;

    // Enqueue background job (Sidekiq-like). Do NOT block request on DB writes.
    const job = await interviewVideoQueue.add('processInterviewVideo' as InterviewVideoJobName, {
      filePath,
      videoPath: videoUrl,
      interviewId: Number(interview_id),
      inviteId: Number(ai_interview_invite_id),
      question: question || '',
      queType: que_type || 'general',
      transcript: transcript || '',
      questionId: question_id ? Number(question_id) : undefined,
      questionIndex: questionIndex ? Number(questionIndex) : undefined,
      isCompleted: is_completed === '1',
    });

    // Also enqueue delayed scoring on any activity.
    // If the candidate abandons the interview, this job will eventually run and score the partial report.
    // If they keep answering, the same jobId will be reused (dedupe) and the latest delay wins.
    try {
      const interviewIdNum = Number(interview_id);
      const inviteIdNum = Number(ai_interview_invite_id);

      const reportRes = await pool.query(
        `SELECT id FROM ai_interview_reports
         WHERE interview_id = $1 AND ai_interview_invite_id = $2 AND discarded_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [interviewIdNum, inviteIdNum]
      );

      if (reportRes.rows.length > 0) {
        const reportId = Number(reportRes.rows[0].id);

        const delayMs = process.env.PARTIAL_INTERVIEW_FEEDBACK_DELAY_MS
          ? Number(process.env.PARTIAL_INTERVIEW_FEEDBACK_DELAY_MS)
          : 2 * 60 * 1000;

        console.log(
          `🧠 enqueuePartialScoring(upload_activity): reportId=${reportId} inviteId=${inviteIdNum} delay=${delayMs}ms`
        );

        await enqueuePartialScoring({ reportId, inviteId: inviteIdNum, reason: 'upload_activity' });
      }
    } catch (e) {
      console.warn('Failed to enqueue delayed scoring on upload activity:', e);
    }

    // Return immediately so UI never "sticks" on upload.
    res.status(202).json({
      success: true,
      message: 'Video accepted for processing',
      job_id: job.id,
      video_path: videoUrl,
    });
  } catch (error: any) {
    console.error('Upload video error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload video' });
  }
});

// Text-to-speech endpoint
router.post('/speak', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Use browser's native speech synthesis
    // This endpoint can return audio blob or just trigger client-side synthesis
    res.json({ 
      success: true, 
      message: 'Use browser speech synthesis API',
      text 
    });
  } catch (error: any) {
    console.error('Speak error:', error);
    res.status(500).json({ error: error.message || 'Failed to process speech' });
  }
});

  return router;
};

export default createInterviewRoutes;
