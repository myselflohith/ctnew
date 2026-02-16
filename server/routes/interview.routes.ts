import { Router, Request, Response } from 'express';
import { Multer } from 'multer';
import { authenticateToken } from '../middleware/auth.middleware.js';
import pool from '../database/connection.js';
import {
  createAIInterview,
  getInterviewsForEmployer,
  getInterviewDetails,
  inviteCandidate,
  generateQuestions,
  getCandidateReports,
  submitInterviewReport,
  getInterviewReportDetails,
  getTalentInterviewSchedules,
} from '../services/interview.service.js';

const createInterviewRoutes = (upload?: Multer) => {
  const router = Router();

// PUBLIC: Get interview by unique link (for email invitations)
router.get('/public/by-link/:uniqueLink', async (req: Request, res: Response) => {
  try {
    const { uniqueLink } = req.params;
    console.log('Received request for interview with uniqueLink:', uniqueLink);

    const result = await pool.query(
      `SELECT 
        aiv.id as invite_id,
        aiv.interview_id,
        aiv.candidate_name,
        aiv.candidate_email,
        aiv.phone_num,
        aiv.status,
        ai.interview_title,
        ai.interview_category,
        ai.type_of_interview,
        ai.job_id
      FROM ai_interview_invites aiv
      LEFT JOIN ai_interviews ai ON aiv.interview_id = ai.id
      WHERE aiv.unique_interview_link = $1 AND aiv.discarded_at IS NULL`,
      [uniqueLink]
    );

    console.log('Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('No interview found for uniqueLink:', uniqueLink);
      res.status(404).json({ error: 'Interview invitation not found' });
      return;
    }

    const invite = result.rows[0];
    res.json({
      success: true,
      data: {
        inviteId: invite.invite_id,
        interviewId: invite.interview_id,
        candidateName: invite.candidate_name,
        candidateEmail: invite.candidate_email,
        phoneNum: invite.phone_num,
        status: invite.status,
        interviewTitle: invite.interview_title || 'Interview',
        interviewCategory: invite.interview_category || 'General',
        interviewType: invite.type_of_interview || 'Practice',
        jobTitle: invite.job_title || invite.interview_title || 'Interview',
        company: invite.company || 'Company',
        location: invite.location || 'Remote',
        jobType: invite.job_type || 'Full-time',
        description: invite.job_description || invite.description || '',
      },
    });
  } catch (error: any) {
    console.error('Get interview by link error:', error);
    res.status(500).json({ error: error.message || 'Failed to get interview' });
  }
});

// DEV: Check database connectivity and list all invites
router.get('/dev/check-invites', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, interview_id, candidate_name, candidate_email, unique_interview_link, created_at 
       FROM ai_interview_invites 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    res.json({ 
      success: true, 
      count: result.rows.length,
      invites: result.rows 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DEV: Seed questions for first interview for testing
router.get('/dev/seed-first-interview', async (req: Request, res: Response) => {
  try {
    // Get first interview
    const interviewResult = await pool.query(
      `SELECT id FROM ai_interviews LIMIT 1`
    );

    if (interviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'No interviews found' });
    }

    const interviewId = interviewResult.rows[0].id;

    // Sample interview questions
    const sampleQuestions = [
      'Tell us about your most recent project and your role in it.',
      'What are your strengths and how do they relate to this position?',
      'Can you describe a challenging situation you faced at work and how you handled it?',
      'What motivated you to apply for this position?',
      'Where do you see yourself in 5 years?',
      'How do you handle conflicts with team members?',
      'Tell us about a time you showed leadership.',
      'What is your experience with the technologies listed in the job description?',
    ];

    // Insert questions
    let insertedCount = 0;
    for (const question of sampleQuestions) {
      try {
        await pool.query(
          `INSERT INTO ai_interview_custom_questions (ai_interview_id, question, question_weight, created_at, updated_at)
           VALUES ($1, $2, 1, NOW(), NOW())`,
          [interviewId, question]
        );
        insertedCount++;
      } catch (e) {
        // Question might already exist
      }
    }

    res.json({ 
      success: true, 
      message: `Seeded ${insertedCount} questions for interview ${interviewId}`,
      interview_id: interviewId,
      questions_added: insertedCount,
      sample_questions: sampleQuestions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    const { ai_interview_invite_id, interview_start_at, transcript_text, rating, score, ai_feedback, interview_video_url, report_details } = req.body;

    if (!ai_interview_invite_id) {
      res.status(400).json({ error: 'ai_interview_invite_id is required' });
      return;
    }

    const report = await submitInterviewReport(parseInt(id), ai_interview_invite_id, {
      interview_start_at,
      transcript_text,
      rating,
      score,
      ai_feedback,
      interview_video_url,
      report_details,
    });

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Submit report error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit report' });
  }
});

// Get interview report details
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

// OpenAI Text-to-Speech endpoint
router.post('/openai_speak', authenticateToken, async (req: Request, res: Response) => {
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
router.post('/transcribe', authenticateToken, async (req: Request, res: Response) => {
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

    // Try to get interview-specific custom questions first
    let questionsResult = await pool.query(
      `SELECT id, question as question_text, question_weight, 'custom' as source
       FROM ai_interview_custom_questions 
       WHERE ai_interview_id = $1 AND discarded_at IS NULL
       ORDER BY created_at ASC`,
      [interviewId]
    );

    // If no custom questions, fall back to job-level questions
    if (questionsResult.rows.length === 0) {
      questionsResult = await pool.query(
        `SELECT id, question as question_text, question_weight, 'job' as source
         FROM ai_interview_questions 
         WHERE job_id = $1 AND discarded_at IS NULL
         ORDER BY question_weight DESC, created_at ASC`,
        [jobId]
      );
    }

    // If still no questions, try ai_generated_questions
    if (questionsResult.rows.length === 0) {
      questionsResult = await pool.query(
        `SELECT id, question as question_text, question_weight, 'generated' as source
         FROM ai_generated_questions 
         WHERE interview_id = $1 AND discarded_at IS NULL
         ORDER BY created_at ASC`,
        [interviewId]
      );
    }

    if (questionsResult.rows.length === 0) {
      return res.json({ success: false, questions: [], message: 'No questions found for this interview' });
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
router.post('/upload_video', upload ? upload.single('file') : (req, res, next) => next(), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { interview_id, ai_interview_invite_id, question, que_type, is_completed, transcript } = req.body;
    const questionIndex = req.body.question_index || 0;

    if (!interview_id || !ai_interview_invite_id) {
      return res.status(400).json({ error: 'interview_id and ai_interview_invite_id are required' });
    }

    // Store file path or use cloud storage
    const videoPath = `/uploads/interviews/${(req.file as Express.Multer.File).filename}`;

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
         VALUES ($1, $2, CURRENT_DATE, NOW(), NOW())
         RETURNING id`,
        [interview_id, ai_interview_invite_id]
      );
      reportId = createResult.rows[0].id;
    } else {
      reportId = reportResult.rows[0].id;
    }

    // Store response details
    await pool.query(
      `INSERT INTO ai_interview_report_details (ai_interview_report_id, ai_interview_invite_id, question, transcript_text, video_url, que_type, question_weight, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), NOW())`,
      [reportId, ai_interview_invite_id, question || '', transcript || '', videoPath, que_type || 'general']
    );

    // If interview is completed, update report status
    if (is_completed === '1') {
      await pool.query(
        `UPDATE ai_interview_reports 
         SET interview_end_at = NOW(), completed = true, updated_at = NOW()
         WHERE id = $1`,
        [reportId]
      );
    }

    res.json({ 
      success: true, 
      message: 'Video uploaded',
      report_id: reportId,
      video_path: videoPath
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

// TEST: Seed interview questions for testing
router.post('/seed/create-test-questions/:interviewId', async (req: Request, res: Response) => {
  try {
    const { interviewId } = req.params;

    // Sample interview questions based on common technical interview topics
    const sampleQuestions = [
      'Tell us about your most recent project and your role in it.',
      'What are your strengths and how do they relate to this position?',
      'Can you describe a challenging situation you faced at work and how you handled it?',
      'What motivated you to apply for this position?',
      'Where do you see yourself in 5 years?',
      'What are your salary expectations?',
      'How do you handle conflicts with team members?',
      'Tell us about a time you showed leadership.',
    ];

    // Insert questions for the interview
    let insertedCount = 0;
    for (const question of sampleQuestions) {
      try {
        await pool.query(
          `INSERT INTO ai_interview_custom_questions (ai_interview_id, question, question_weight, created_at, updated_at)
           VALUES ($1, $2, 1, NOW(), NOW())`,
          [interviewId, question]
        );
        insertedCount++;
      } catch (e) {
        console.error('Error inserting question:', e);
      }
    }

    res.json({ 
      success: true, 
      message: `Created ${insertedCount} test questions`,
      count: insertedCount,
      questions: sampleQuestions
    });
  } catch (error: any) {
    console.error('Seed questions error:', error);
    res.status(500).json({ error: error.message || 'Failed to seed questions' });
  }
});

  return router;
};

export default createInterviewRoutes;
