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
  submitInterviewReport,
  getInterviewReportDetails,
  getTalentInterviewSchedules,
  getTalentReportByInviteId,
  startInterviewReport,
  saveInterviewAnswer,
} from '../services/interview.service.js';

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

// Get all interviews for employer
router.get('/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const interviews = await getInterviewsForEmployer(req.user.id);
    res.json({ success: true, data: interviews });
  } catch (error: any) {
    console.error('Get interviews error:', error);
    res.status(500).json({ error: error.message || 'Failed to get interviews' });
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

    // Extra safety: ensure invite status is Completed even if downstream logic changes.
    // (submitInterviewReport already does this, but we enforce it here too.)
    try {
      await pool.query(
        `UPDATE ai_interview_invites SET status = $1, updated_at = NOW() WHERE id = $2`,
        ['Completed', inviteIdNum]
      );
    } catch (e) {
      console.warn('Failed to force invite status Completed:', e);
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

    const formattedReport = {
      id: report.id,
      interview_id: report.interview_id,
      ai_interview_invite_id: report.ai_interview_invite_id,
      interview_start_at: report.interview_start_at,
      transcript_text: report.transcript_text,
      interview_video_url: report.interview_video_url,
      rating: report.rating,
      score: safeJsonParse(report.score),
      ai_feedback: safeJsonParse(report.ai_feedback),
      candidate_name: report.candidate_name,
      candidate_email: report.candidate_email,
      interview_title: report.interview_title,
      interview_category: report.interview_category,
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
       LEFT JOIN ai_interview_reports air ON aii.id = air.ai_interview_invite_id
       WHERE ai.id = $1
       ORDER BY aii.created_at DESC`,
      [interviewId]
    );

    const reports = result.rows.map((row: any) => {
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

    // Get already answered questions for this invite
    const answeredResult = await pool.query(
      `SELECT LOWER(COALESCE(transcript_text, '')) as answered_text FROM ai_interview_report_details 
       WHERE ai_interview_invite_id = $1`,
      [inviteId]
    );

    const answeredQuestions = answeredResult.rows.map(r => r.answered_text).filter(t => t);

    // Filter out already answered questions
    const unansweredQuestions = questionsResult.rows.filter((row: any) => {
      if (answeredQuestions.length === 0) return true;
      const questionLower = row.question_text.toLowerCase();
      return !answeredQuestions.some(ans => ans && ans.includes(questionLower));
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
router.post('/:id/start', authenticateToken, async (req: Request, res: Response) => {
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

    const report = await startInterviewReport(parseInt(id), parseInt(ai_interview_invite_id));
    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Start interview report error:', error);
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

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Save interview answer error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save answer' });
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

    // Store file path or use cloud storage
    const videoPath = `/uploads/interviews/${(req.file as Express.Multer.File).filename}`;

    // Get question weight if question_id provided
    let questionWeight = 1;
    if (question_id) {
      // Try custom questions first
      let weightResult = await pool.query(
        `SELECT question_weight FROM ai_interview_custom_questions WHERE id = $1`,
        [question_id]
      );

      // If not found, try generated questions
      if (weightResult.rows.length === 0) {
        weightResult = await pool.query(
          `SELECT question_weight FROM ai_generated_questions WHERE id = $1`,
          [question_id]
        );
      }

      if (weightResult.rows.length > 0) {
        questionWeight = weightResult.rows[0].question_weight || 1;
      }
    }

    // Create or update interview report
    let reportResult = await pool.query(
      `SELECT id FROM ai_interview_reports 
       WHERE interview_id = $1 AND ai_interview_invite_id = $2`,
      [interview_id, ai_interview_invite_id]
    );

    let reportId: number;
    if (reportResult.rows.length === 0) {
      const createResult = await pool.query(
        `INSERT INTO ai_interview_reports (interview_id, ai_interview_invite_id, interview_start_at, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW(), NOW())
         RETURNING id`,
        [interview_id, ai_interview_invite_id]
      );
      reportId = createResult.rows[0].id;
    } else {
      reportId = reportResult.rows[0].id;
    }

    // Store response details with proper question weight
    await pool.query(
      `INSERT INTO ai_interview_report_details (ai_interview_report_id, ai_interview_invite_id, question, transcript_text, video_url, que_type, question_weight, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [reportId, ai_interview_invite_id, question || '', transcript || '', videoPath, que_type || 'general', questionWeight]
    );

    // If interview is completed, update report status
    if (is_completed === '1') {
      await pool.query(
        `UPDATE ai_interview_reports 
         SET interview_end_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [reportId]
      );

      // Also update interview invite status
      await pool.query(
        `UPDATE ai_interview_invites SET status = $1, updated_at = NOW() WHERE id = $2`,
        ['Completed', ai_interview_invite_id]
      );
    }

    res.json({ 
      success: true, 
      message: 'Video uploaded',
      report_id: reportId,
      video_path: videoPath,
      question_weight: questionWeight
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
