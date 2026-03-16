import pool from '../database/connection.js';
import crypto from 'crypto';
import { sendInterviewInviteEmail } from './email.service.js';

export async function createAIInterview(
  userId: string,
  jobId: string | number,
  status: string = 'Pending',
  questionType: string = '',
  typeOfInterview: string = 'Practice',
  interviewCategory: string = '',
  interviewTitle: string = '',
  additionSkill: string = '',
  questions: any[] = []
) {
  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create interview record
      const interviewResult = await client.query(
        `INSERT INTO ai_interviews (person_id, job_id, status, question_type, type_of_interview, interview_category, interview_title, addition_skill, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [userId, jobId, status, questionType, typeOfInterview, interviewCategory, interviewTitle, additionSkill]
      );

      const interview = interviewResult.rows[0];

      // Add questions if provided
      // We store into:
      //  - ai_interview_custom_questions (custom)
      //  - ai_generated_questions (AI generated)
      //  - ai_interview_questions (canonical table used by ch-job-marketplace style flows)
      if (questions && questions.length > 0) {
        for (const q of questions) {
          const questionText = q.question || q.text || q.label;
          const weight = q.weight || q.question_weight || 3;

          if (!questionText) continue;

          if (q.type === 'custom') {
            await client.query(
              `INSERT INTO ai_interview_custom_questions (ai_interview_id, question, question_weight, created_by, created_at, updated_at)
               VALUES ($1, $2, $3, $4, NOW(), NOW())`,
              [interview.id, questionText, weight, userId]
            );
          } else if (q.type === 'generated') {
            await client.query(
              `INSERT INTO ai_generated_questions (interview_id, job_id, question, question_weight, created_at, updated_at)
               VALUES ($1, $2, $3, $4, NOW(), NOW())`,
              [interview.id, jobId, questionText, weight]
            );
          }

          // Also store into ai_interview_questions so interviews can load from one place.
          // NOTE: In production, ai_interview_questions.ai_interview_id has an FK to ai_interviews(id),
          // so we MUST insert with the created interview.id (omitting it may default to 0 and violate FK).
          await client.query(
            `INSERT INTO ai_interview_questions (job_id, ai_interview_id, category, question, question_weight, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [jobId, interview.id, interviewCategory || 'general', questionText, weight, userId]
          );
        }
        
      }

      await client.query('COMMIT');
      return interview;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating AI interview:', error);
    throw error;
  }
}

export async function getInterviewsForEmployer(
  userId: string,
  filters?: { status?: string; search?: string }
) {
  try {
    const status = (filters?.status || '').toString().toLowerCase().trim();
    const search = (filters?.search || '').toString().toLowerCase().trim();

    // Default behavior should match ch-job-marketplace:
    // - If status param is missing/empty => show ACTIVE (discarded_at IS NULL)
    // - Only show archived when explicitly requested.
    const isArchived =
      status === 'archieved' || status === 'archived' || status === 'archive';

    // NOTE:
    // - "Active" means discarded_at IS NULL
    // - "Archived" means discarded_at IS NOT NULL (Rails uses unscoped + where.not(discarded_at: nil))
    // - Search parity: interview_title, type_of_interview, and job title (job.title)
    const result = await pool.query(
      `SELECT 
        ai.*,
        cj.name as job_title,
        (SELECT COUNT(*) FROM ai_interview_invites WHERE interview_id = ai.id AND discarded_at IS NULL) as candidate_count,
        (SELECT COUNT(*) FROM ai_interview_invites WHERE interview_id = ai.id AND LOWER(status) = 'completed' AND discarded_at IS NULL) as completed_count,
        (SELECT COUNT(*) FROM ai_interview_invites WHERE interview_id = ai.id AND LOWER(status) IN ('completed','complete') AND discarded_at IS NULL) as completed_count_compat,
        (SELECT COUNT(*) FROM ai_interview_invites WHERE interview_id = ai.id AND LOWER(status) IN ('in progress','in_progress','started') AND discarded_at IS NULL) as in_progress_count,
        (SELECT COUNT(*) FROM ai_interview_invites WHERE interview_id = ai.id AND LOWER(status) IN ('partially completed','partially_completed') AND discarded_at IS NULL) as partially_completed_count,
        (SELECT COUNT(*) FROM ai_interview_invites WHERE interview_id = ai.id AND LOWER(status) IN ('pending') AND discarded_at IS NULL) as pending_count,
        (SELECT COUNT(*) FROM ai_interview_invites WHERE interview_id = ai.id AND discarded_at IS NULL) as total_invites
       FROM ai_interviews ai
       LEFT JOIN jobs cj ON ai.job_id = cj.id
       WHERE ai.person_id = $1
         AND (
           ($2::boolean = true AND ai.discarded_at IS NOT NULL)
           OR
           ($2::boolean = false AND ai.discarded_at IS NULL)
         )
         AND (
           $3 = ''
           OR LOWER(COALESCE(ai.interview_title, '')) LIKE ('%' || $3 || '%')
           OR LOWER(COALESCE(ai.type_of_interview, '')) LIKE ('%' || $3 || '%')
           OR LOWER(COALESCE(cj.name, '')) LIKE ('%' || $3 || '%')
         )
       ORDER BY ai.created_at DESC`,
      [userId, isArchived, search]
    );

    // Normalize status for employer list:
    // - If any candidate completed => show "Completed" (matches expected employer behavior)
    // - Else if any candidate in progress => show "In Progress"
    // - Else keep DB status (or Pending)
    return result.rows.map((row: any) => {
      const completed = Number(row.completed_count_compat ?? row.completed_count ?? 0);
      const inProgress = Number(row.in_progress_count ?? 0);
      const pending = Number(row.pending_count ?? 0);
      const total = Number(row.total_invites ?? row.candidate_count ?? 0);

      let normalizedStatus = row.status || 'Pending';

      if (completed > 0) normalizedStatus = 'Completed';
      else if (inProgress > 0) normalizedStatus = 'In Progress';
      else if (total > 0 && pending === total) normalizedStatus = 'Pending';

      return {
        ...row,
        status: normalizedStatus,
        completed_count: row.completed_count ?? completed,
      };
    });
  } catch (error: any) {
    console.error('Error getting interviews:', error);
    throw error;
  }
}

export async function getInterviewDetails(interviewId: number) {
  try {
    const client = await pool.connect();

    try {
      // Get interview
      const interviewResult = await client.query(
        'SELECT * FROM ai_interviews WHERE id = $1 AND discarded_at IS NULL',
        [interviewId]
      );

      if (interviewResult.rows.length === 0) {
        return null;
      }

      const interview = interviewResult.rows[0];

      // Get custom questions
      const customQuestionsResult = await client.query(
        'SELECT * FROM ai_interview_custom_questions WHERE ai_interview_id = $1 AND discarded_at IS NULL ORDER BY created_at',
        [interviewId]
      );

      // Get generated questions
      const generatedQuestionsResult = await client.query(
        'SELECT * FROM ai_generated_questions WHERE interview_id = $1 AND discarded_at IS NULL ORDER BY created_at',
        [interviewId]
      );

      // Get invites
      const invitesResult = await client.query(
        'SELECT * FROM ai_interview_invites WHERE interview_id = $1 AND discarded_at IS NULL ORDER BY created_at DESC',
        [interviewId]
      );

      return {
        ...interview,
        customQuestions: customQuestionsResult.rows,
        generatedQuestions: generatedQuestionsResult.rows,
        invites: invitesResult.rows,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error getting interview details:', error);
    throw error;
  }
}

export async function getInterviewQuestions(interviewId: number) {
  try {
    const client = await pool.connect();

    try {
      // Get custom questions
      const customQuestionsResult = await client.query(
        `SELECT id, question, question_weight, 'custom' as type 
         FROM ai_interview_custom_questions 
         WHERE ai_interview_id = $1 AND discarded_at IS NULL 
         ORDER BY created_at`,
        [interviewId]
      );

      // Get generated questions
      const generatedQuestionsResult = await client.query(
        `SELECT id, question, question_weight, 'generated' as type 
         FROM ai_generated_questions 
         WHERE interview_id = $1 AND discarded_at IS NULL 
         ORDER BY created_at`,
        [interviewId]
      );

      const questions = [
        ...customQuestionsResult.rows,
        ...generatedQuestionsResult.rows
      ];

      return questions;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error getting interview questions:', error);
    throw error;
  }
}

export async function inviteCandidate(
  interviewId: number,
  candidateName: string,
  candidateEmail: string,
  phoneNum?: string
) {
  try {
    const uniqueLink = crypto.randomBytes(32).toString('hex');

    // Get interview details for email
    const interviewResult = await pool.query(
      'SELECT interview_title FROM ai_interviews WHERE id = $1',
      [interviewId]
    );

    if (interviewResult.rows.length === 0) {
      throw new Error('Interview not found');
    }

    const interviewTitle = interviewResult.rows[0].interview_title || `Interview #${interviewId}`;

    // Public interview links must use the FRONTEND base URL (production), not localhost/dev IP.
    // Prefer FRONTEND_URL / PUBLIC_APP_URL / APP_URL / SITE_URL / CLIENT_URL with a safe prod fallback.
    const appUrl =
      (process.env.FRONTEND_URL || "").trim() ||
      (process.env.PUBLIC_APP_URL || "").trim() ||
      (process.env.APP_URL || "").trim() ||
      (process.env.SITE_URL || "").trim() ||
      (process.env.CLIENT_URL || "").trim() ||
      "https://ctnew.cardinaltalent.ai";

    const interviewLink = `${appUrl.replace(/\/$/, "")}/interview/${uniqueLink}`;

    // Try to find the user by email to link person_id
    let personId = null;
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [candidateEmail]
    );
    if (userResult.rows.length > 0) {
      personId = userResult.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO ai_interview_invites (interview_id, candidate_name, candidate_email, unique_interview_link, person_id, phone_num, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [interviewId, candidateName, candidateEmail, uniqueLink, personId, phoneNum || null, 'Pending']
    );

    // Send invitation email
    try {
      await sendInterviewInviteEmail(candidateEmail, candidateName, interviewTitle, interviewLink);
    } catch (emailError: any) {
      console.error('Error sending interview invite email:', emailError);
      // Don't fail the invite if email fails, but log it
    }

    return result.rows[0];
  } catch (error: any) {
    console.error('Error inviting candidate:', error);
    throw error;
  }
}

export async function generateQuestions(
  interviewId: number,
  jobDescription: string,
  numQuestions: number = 10
) {
  try {
    // Goal:
    // - Generate questions based on job skills + JD + additional skills
    // - Persist into BOTH:
    //    1) ai_generated_questions (interview-scoped)
    //    2) ai_interview_questions (canonical table used by job-level fallback flows)
    //
    // Current bug reported: ai_interview_questions stays empty after AI generate.
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get interview + job context
    const ctxRes = await pool.query(
      `SELECT 
         ai.id as interview_id,
         ai.type_of_interview,
         ai.addition_skill,
         ai.job_id as job_id,
         cj.name as job_title,
         cj.description as job_description,
         cj.skills as job_skills
       FROM ai_interviews ai
       LEFT JOIN jobs cj ON ai.job_id = cj.id
       WHERE ai.id = $1 AND ai.discarded_at IS NULL`,
      [interviewId]
    );

    if (ctxRes.rows.length === 0) {
      throw new Error('Interview not found');
    }

    const ctx = ctxRes.rows[0];
    const jobId = ctx.job_id;

    const interviewType = ctx.type_of_interview || 'Practice';
    const jobTitle = ctx.job_title || '';
    const additionSkill = ctx.addition_skill || '';
    const jd = (ctx.job_description || jobDescription || '').toString();
    const jobSkills = Array.isArray(ctx.job_skills) ? ctx.job_skills.join(', ') : (ctx.job_skills || '');

    const prompt = `
I want you to act as an interviewer. Remember, you are the interviewer, not the candidate.
You are an AI specialized in creating interview questions.

- Do NOT generate questions with serial numbers like "1.", "2.", etc.
- Each question should be no longer than 200 characters.
- Focus on generating concise, direct questions without unnecessary formatting or numbering.

Please generate fixed ${numQuestions} number interview questions based on the following topics for an interview with the candidate:

- Interview Type: ${interviewType}
- Job Title: ${jobTitle}
- Job Description: ${jd}
- Required Skills: ${jobSkills}
- Additional Skills: ${additionSkill}

Ensure that you generate exactly ${numQuestions} questions and that they are distinct and relevant.
`.trim();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI specialized in creating interview questions.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    // Split lines, remove empties, strip numbering if model still adds it
    let questions = content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^\d+[\).\-\s]+/, '').trim())
      .filter(Boolean);

    // Enforce exactly N (best-effort)
    if (questions.length > numQuestions) questions = questions.slice(0, numQuestions);

    if (questions.length === 0) {
      throw new Error('OpenAI returned no questions');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const savedQuestions: any[] = [];
      for (const q of questions) {
        const trimmed = q.slice(0, 200);

        // 1) interview-scoped generated questions
        const gen = await client.query(
          `INSERT INTO ai_generated_questions (interview_id, job_id, question, question_weight, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING *`,
          [interviewId, jobId, trimmed, 1]
        );

        // 2) canonical job/interview questions (used by fallback flows)
        // Avoid duplicates if user clicks "Generate" multiple times.
        await client.query(
          `INSERT INTO ai_interview_questions (job_id, ai_interview_id, category, question, question_weight, created_by, created_at, updated_at)
           SELECT $1, $2, $3, $4, $5, NULL, NOW(), NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM ai_interview_questions
             WHERE job_id = $1 AND ai_interview_id = $2 AND question = $4 AND discarded_at IS NULL
           )`,
          [jobId, interviewId, 'general', trimmed, 1]
        );

        savedQuestions.push(gen.rows[0]);
      }

      await client.query('COMMIT');
      return savedQuestions;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

export async function getInterviewInvites(
  interviewId: number,
  filters?: {
    status?: string; // "active" | "archieved" | "archived" OR invite status like "Completed"
    interview_status?: string; // Pending/In Progress/Completed/Partially Completed
    search?: string;
    start_date?: string; // YYYY-MM-DD
    end_date?: string; // YYYY-MM-DD
    sortField?: string;
    sortDirection?: string;
  }
) {
  try {
    const status = (filters?.status || '').toString().toLowerCase().trim();
    const interviewStatus = (filters?.interview_status || '').toString().trim();
    const search = (filters?.search || '').toString().toLowerCase().trim();
    const startDate = (filters?.start_date || '').toString().trim();
    const endDate = (filters?.end_date || '').toString().trim();

    const isArchived =
      status === 'archieved' || status === 'archived' || status === 'archive';

    // Sorting allowlist (avoid SQL injection)
    const allowedSortFields = new Set(['created_at', 'updated_at', 'candidate_name', 'candidate_email', 'status']);
    const sortFieldRaw = (filters?.sortField || 'created_at').toString();
    const sortField = allowedSortFields.has(sortFieldRaw) ? sortFieldRaw : 'created_at';

    const sortDirRaw = (filters?.sortDirection || 'DESC').toString().toUpperCase();
    const sortDirection = sortDirRaw === 'ASC' ? 'ASC' : 'DESC';

    // Employer candidate list needs to show overall rating/score even for archived candidates.
    // Also needs completion % for partial interviews. Compute from report_details (answered) vs total questions.
    const result = await pool.query(
      `SELECT
         aiv.*,
         air.id as report_id,
         air.rating as report_rating,
         air.score as report_score,
         air.ai_feedback as report_ai_feedback,
         (
           SELECT COUNT(*)::int
           FROM ai_interview_report_details d
           WHERE d.ai_interview_invite_id = aiv.id
             AND LENGTH(TRIM(COALESCE(d.transcript_text, ''))) > 0
         ) as answered_count,
         (
           (
             (SELECT COUNT(*) FROM ai_interview_custom_questions WHERE ai_interview_id = aiv.interview_id AND discarded_at IS NULL)
             +
             (SELECT COUNT(*) FROM ai_generated_questions WHERE interview_id = aiv.interview_id AND discarded_at IS NULL)
           )::int
         ) as total_questions
       FROM ai_interview_invites aiv
       LEFT JOIN ai_interview_reports air
         ON air.ai_interview_invite_id = aiv.id
        AND air.discarded_at IS NULL
        AND air.created_at = (
          SELECT MAX(air2.created_at)
          FROM ai_interview_reports air2
          WHERE air2.ai_interview_invite_id = aiv.id
            AND air2.discarded_at IS NULL
        )
       WHERE aiv.interview_id = $1
         AND (
           ($2::boolean = true AND aiv.discarded_at IS NOT NULL)
           OR
           ($2::boolean = false AND aiv.discarded_at IS NULL)
         )
         AND (
           $3 = ''
           OR LOWER(COALESCE(aiv.candidate_name, '')) LIKE ('%' || $3 || '%')
           OR LOWER(COALESCE(aiv.candidate_email, '')) LIKE ('%' || $3 || '%')
           OR LOWER(COALESCE(aiv.status, '')) LIKE ('%' || $3 || '%')
         )
         AND (
           $4 = ''
           OR aiv.status = $4
         )
         AND (
           ($5 = '' OR $6 = '')
           OR DATE(aiv.created_at) BETWEEN $5::date AND $6::date
         )
       ORDER BY
         CASE WHEN $7 = 'candidate_name' THEN aiv.candidate_name END,
         CASE WHEN $7 = 'candidate_email' THEN aiv.candidate_email END,
         CASE WHEN $7 = 'status' THEN aiv.status END,
         CASE WHEN $7 = 'updated_at' THEN aiv.updated_at END,
         aiv.created_at ${sortDirection}`,
      [interviewId, isArchived, search, interviewStatus, startDate, endDate, sortField]
    );

    const safeJsonParse = (value: any) => {
      if (!value) return null;
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    return result.rows.map((row: any) => {
      const inviteStatus = (row.status || '').toString().toLowerCase();

      // IMPORTANT:
      // Do NOT show "Partial" as a rating label. If rating is missing, return null so UI can show
      // "Pending" (while worker generates) OR, if score exists, we derive Great/Average/Poor in UI/service.
      const reportRatingRaw = (row.report_rating || '').toString().trim();
      const fallbackRating = reportRatingRaw.length > 0 ? row.report_rating : null;

      const answeredCount = Number(row.answered_count ?? 0);
      const totalQuestions = Number(row.total_questions ?? 0);
      const completionPercentage =
        totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

      return {
        ...row,
        report_id: row.report_id,
        report_rating: fallbackRating,
        report_score: safeJsonParse(row.report_score),
        report_ai_feedback: safeJsonParse(row.report_ai_feedback),
        answered_count: answeredCount,
        total_questions: totalQuestions,
        completion_percentage: completionPercentage,
        // Keep status as-is; this is what employer list uses ("Partially Completed")
        status: row.status,
      };
    });
  } catch (error: any) {
    console.error('Error getting interview invites:', error);
    throw error;
  }
}

export async function getCandidateReports(interviewId: number) {
  try {
    const result = await pool.query(
      `SELECT 
        air.*,
        aiv.candidate_name,
        aiv.candidate_email,
        (SELECT COUNT(*) FROM ai_interview_report_details WHERE ai_interview_report_id = air.id) as response_count
       FROM ai_interview_reports air
       JOIN ai_interview_invites aiv ON air.ai_interview_invite_id = aiv.id
       WHERE air.interview_id = $1 AND air.discarded_at IS NULL
       ORDER BY air.created_at DESC`,
      [interviewId]
    );

    return result.rows;
  } catch (error: any) {
    console.error('Error getting candidate reports:', error);
    throw error;
  }
}

export async function startInterviewReport(interviewId: number, interviewInviteId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate invite + interview
    const inviteRes = await client.query(
      `SELECT id, interview_id, status, discarded_at
       FROM ai_interview_invites
       WHERE id = $1 AND discarded_at IS NULL`,
      [interviewInviteId]
    );
    if (inviteRes.rows.length === 0) {
      throw new Error(`Interview invite ID ${interviewInviteId} not found`);
    }
    if (Number(inviteRes.rows[0].interview_id) !== Number(interviewId)) {
      throw new Error(`Invite ${interviewInviteId} does not belong to interview ${interviewId}`);
    }

    // Expire link once interview starts (single-use):
    // - Mark invite as "In Progress"
    // - Invalidate unique_interview_link so the public link can't be reused
    // This matches the requirement: "link should be only one time accessible" (invalidate on start).
    const expiredSuffix = crypto.randomBytes(8).toString('hex');

    const expireRes = await client.query(
      `UPDATE ai_interview_invites
       SET status = 'In Progress',
           unique_interview_link = CONCAT('expired_', id, '_', $2::text),
           updated_at = NOW()
       WHERE id = $1 AND LOWER(status) = 'pending'
       RETURNING id`,
      [interviewInviteId, expiredSuffix]
    );

    // Enforce single-start:
    // If the invite is not Pending, do not allow starting again.
    // This ensures the talent can only start the interview once.
    if (expireRes.rowCount === 0) {
      const current = await client.query(
        `SELECT status FROM ai_interview_invites WHERE id = $1 AND discarded_at IS NULL`,
        [interviewInviteId]
      );
      const status = current.rows?.[0]?.status || 'Unknown';
      throw new Error(`Interview link already used (status: ${status})`);
    }

    // Ensure report exists (idempotent)
    const existing = await client.query(
      `SELECT * FROM ai_interview_reports
       WHERE interview_id = $1 AND ai_interview_invite_id = $2 AND discarded_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [interviewId, interviewInviteId]
    );

    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return existing.rows[0];
    }

    const created = await client.query(
      `INSERT INTO ai_interview_reports
       (interview_id, ai_interview_invite_id, interview_start_at, transcript_text, created_at, updated_at)
       VALUES ($1, $2, NOW()::date, '', NOW(), NOW())
       RETURNING *`,
      [interviewId, interviewInviteId]
    );

    await client.query('COMMIT');
    return created.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function saveInterviewAnswer(
  interviewId: number,
  interviewInviteId: number,
  payload: {
    question_id?: number;
    question: string;
    transcript_text: string;
    question_weight?: number;
    que_type?: string;
  }
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure report exists WITHOUT re-triggering "start" logic.
    // startInterviewReport() enforces single-start and will throw once invite is already In Progress.
    // For saving answers we just need an existing report row (create if missing).
    const existingReportRes = await client.query(
      `SELECT * FROM ai_interview_reports
       WHERE interview_id = $1 AND ai_interview_invite_id = $2 AND discarded_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [interviewId, interviewInviteId]
    );

    let report: any;
    if (existingReportRes.rows.length > 0) {
      report = existingReportRes.rows[0];

      // Ensure interview_start_at exists so the scoring worker (generateInterviewFeedback)
      // can pick this report up even for partially completed interviews.
      // The worker filters: air.interview_start_at IS NOT NULL
      if (!report.interview_start_at) {
        const patched = await client.query(
          `UPDATE ai_interview_reports
           SET interview_start_at = NOW()::date,
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [report.id]
        );
        report = patched.rows[0] || report;
      }
    } else {
      const created = await client.query(
        `INSERT INTO ai_interview_reports
         (interview_id, ai_interview_invite_id, interview_start_at, transcript_text, created_at, updated_at)
         VALUES ($1, $2, NOW()::date, '', NOW(), NOW())
         RETURNING *`,
        [interviewId, interviewInviteId]
      );
      report = created.rows[0];
    }

    // Upsert by (report_id, question) to avoid duplicates
    const existing = await client.query(
      `SELECT id FROM ai_interview_report_details
       WHERE ai_interview_report_id = $1 AND question = $2
       ORDER BY id DESC
       LIMIT 1`,
      [report.id, payload.question]
    );

    // Determine weight if not provided
    let weight = payload.question_weight;
    if (!weight && payload.question_id) {
      // Try custom then generated then job questions
      let w = await client.query(`SELECT question_weight FROM ai_interview_custom_questions WHERE id = $1`, [payload.question_id]);
      if (w.rows.length === 0) {
        w = await client.query(`SELECT question_weight FROM ai_generated_questions WHERE id = $1`, [payload.question_id]);
      }
      if (w.rows.length === 0) {
        w = await client.query(`SELECT question_weight FROM ai_interview_questions WHERE id = $1`, [payload.question_id]);
      }
      if (w.rows.length > 0) weight = w.rows[0].question_weight || 1;
    }
    if (!weight) weight = 1;

    let detailRow;
    if (existing.rows.length > 0) {
      const updated = await client.query(
        `UPDATE ai_interview_report_details
         SET transcript_text = $1,
             question_weight = $2,
             que_type = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [payload.transcript_text, weight, payload.que_type || 'general', existing.rows[0].id]
      );
      detailRow = updated.rows[0];
    } else {
      const inserted = await client.query(
        `INSERT INTO ai_interview_report_details
         (ai_interview_report_id, ai_interview_invite_id, question, transcript_text, question_weight, que_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [report.id, interviewInviteId, payload.question, payload.transcript_text, weight, payload.que_type || 'general']
      );
      detailRow = inserted.rows[0];
    }

    // Update invite status to "Partially Completed" once we have at least 1 answer,
    // but only if the interview is not fully submitted yet.
    // We compute completion based on answeredCount vs totalQuestions.
      const answeredCountRes = await client.query(
        `SELECT COUNT(*)::int as answered_count
         FROM ai_interview_report_details
         WHERE ai_interview_invite_id = $1
           AND LENGTH(TRIM(COALESCE(transcript_text, ''))) > 0`,
        [interviewInviteId]
      );
      const answeredCount = Number(answeredCountRes.rows?.[0]?.answered_count ?? 0);

    const totalQuestionsRes = await client.query(
      `SELECT
         (
           (SELECT COUNT(*) FROM ai_interview_custom_questions WHERE ai_interview_id = $1 AND discarded_at IS NULL)
           +
           (SELECT COUNT(*) FROM ai_generated_questions WHERE interview_id = $1 AND discarded_at IS NULL)
         )::int as total_questions`,
      [interviewId]
    );
    const totalQuestions = Number(totalQuestionsRes.rows?.[0]?.total_questions ?? 0);

    if (answeredCount > 0) {
      // Keep invite status in sync as soon as we have at least 1 real answer.
      // This allows partial interviews to be visible and also allows scoring worker to pick it up.
      const newStatus =
        totalQuestions > 0 && answeredCount >= totalQuestions ? 'Completed' : 'Partially Completed';

      await client.query(
        `UPDATE ai_interview_invites
         SET status = $2,
             updated_at = NOW()
         WHERE id = $1
           AND LOWER(status) NOT IN ('completed','complete')`,
        [interviewInviteId, newStatus]
      );
    }

    await client.query('COMMIT');
    return { report, detail: detailRow };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function submitInterviewReport(
  interviewId: number,
  interviewInviteId: number,
  reportData: {
    interview_start_at: string;
    transcript_text: string;
    rating?: string;
    score?: string | any;
    ai_feedback?: string | any;
    interview_video_url?: string;
    protecting_score?: string;
    report_details?: Array<{
      question: string;
      transcript_text: string;
      question_weight?: number;
      video_url?: string;
      score?: string;
      rating?: string;
      ai_feedback?: string;
      que_type?: string;
    }>;
  }
) {
  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // VALIDATION: Check if invite exists
      const inviteCheckResult = await client.query(
        'SELECT id, status FROM ai_interview_invites WHERE id = $1',
        [interviewInviteId]
      );

      if (inviteCheckResult.rows.length === 0) {
        throw new Error(`Interview invite ID ${interviewInviteId} not found`);
      }

      console.log(`✅ Invite ${interviewInviteId} validated`);

      // Get interview type to determine if scoring needed
      const interviewResult = await client.query(
        'SELECT type_of_interview FROM ai_interviews WHERE id = $1',
        [interviewId]
      );

      if (interviewResult.rows.length === 0) {
        throw new Error(`Interview ID ${interviewId} not found`);
      }

      const interviewType = interviewResult.rows[0]?.type_of_interview || 'Practice';
      const isPractice = interviewType === 'Practice';

      // Properly handle score and feedback JSON
      let scoreValue = null;
      let feedbackValue = null;

      if (reportData.score) {
        scoreValue = typeof reportData.score === 'string' ? reportData.score : JSON.stringify(reportData.score);
      }

      if (reportData.ai_feedback) {
        feedbackValue = typeof reportData.ai_feedback === 'string' ? reportData.ai_feedback : JSON.stringify(reportData.ai_feedback);
      }

      // Ensure report exists (idempotent) - do NOT create duplicates on re-submit.
      // This is critical because the frontend saves per-question answers via /:id/answer
      // and then calls /:id/submit_report at the end. If we INSERT again here, we end up
      // with multiple ai_interview_reports rows for the same invite, and the UI may show
      // the newest empty/partial one (appearing like "answers not stored").
      const existingReportRes = await client.query(
        `SELECT * FROM ai_interview_reports
         WHERE interview_id = $1 AND ai_interview_invite_id = $2 AND discarded_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [interviewId, interviewInviteId]
      );

      let report: any;

      if (existingReportRes.rows.length > 0) {
        report = existingReportRes.rows[0];

        const updatedReportRes = await client.query(
          `UPDATE ai_interview_reports
           SET interview_start_at = COALESCE($2::date, interview_start_at),
               transcript_text = COALESCE($3, transcript_text),
               rating = $4,
               score = $5,
               ai_feedback = $6,
               interview_video_url = $7,
               protecting_score = $8,
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [
            report.id,
            reportData.interview_start_at || null,
            reportData.transcript_text || '',
            isPractice ? 'practice' : (reportData.rating || null),
            isPractice ? null : scoreValue,
            isPractice ? 'Practice Mode - No Scoring' : feedbackValue,
            reportData.interview_video_url || null,
            reportData.protecting_score || null,
          ]
        );

        report = updatedReportRes.rows[0];
        console.log(`✅ Report updated (existing): ID ${report.id}`);
      } else {
        const reportResult = await client.query(
          `INSERT INTO ai_interview_reports 
           (interview_id, ai_interview_invite_id, interview_start_at, transcript_text, rating, score, ai_feedback, interview_video_url, protecting_score, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           RETURNING *`,
          [
            interviewId,
            interviewInviteId,
            (reportData.interview_start_at || new Date().toISOString()) as any,
            reportData.transcript_text || '',
            isPractice ? 'practice' : (reportData.rating || null),
            isPractice ? null : scoreValue,
            isPractice ? 'Practice Mode - No Scoring' : feedbackValue,
            reportData.interview_video_url || null,
            reportData.protecting_score || null,
          ]
        );

        report = reportResult.rows[0];
        console.log(`✅ Report created: ID ${report.id}`);
      }

      // Add report details if provided.
      // IMPORTANT: /:id/answer already upserts into ai_interview_report_details.
      // So here we should UPSERT (update existing by question) instead of blindly inserting duplicates.
      if (reportData.report_details && reportData.report_details.length > 0) {
        console.log(`\n📝 Upserting ${reportData.report_details.length} report details...`);
        for (const detail of reportData.report_details) {
          const questionText = (detail.question || '').trim();
          const answerText = (detail.transcript_text || '').trim();

          if (!questionText) continue;

          // IMPORTANT:
          // Do not persist "empty answers". Some UI flows submit report_details with questions but no transcript,
          // which results in "No response provided" rows that later get AI-scored incorrectly.
          if (!answerText) continue;

          let detailScore = null;
          let detailFeedback = null;

          if (detail.score) {
            detailScore = typeof detail.score === 'string' ? detail.score : JSON.stringify(detail.score);
          }

          if (detail.ai_feedback) {
            detailFeedback = typeof detail.ai_feedback === 'string' ? detail.ai_feedback : JSON.stringify(detail.ai_feedback);
          }

          // Find existing detail row for this report+question
          const existingDetail = await client.query(
            `SELECT id FROM ai_interview_report_details
             WHERE ai_interview_report_id = $1 AND question = $2
             ORDER BY id DESC
             LIMIT 1`,
            [report.id, questionText]
          );

          if (existingDetail.rows.length > 0) {
            await client.query(
              `UPDATE ai_interview_report_details
               SET transcript_text = COALESCE($1, transcript_text),
                   question_weight = COALESCE($2, question_weight),
                   video_url = COALESCE($3, video_url),
                   score = $4,
                   rating = $5,
                   ai_feedback = $6,
                   que_type = COALESCE($7, que_type),
                   updated_at = NOW()
               WHERE id = $8`,
              [
                answerText || null,
                detail.question_weight || null,
                detail.video_url || null,
                isPractice ? null : detailScore,
                isPractice ? 'practice' : (detail.rating || null),
                isPractice ? 'Practice Mode' : detailFeedback,
                detail.que_type || 'general',
                existingDetail.rows[0].id,
              ]
            );
          } else {
            await client.query(
              `INSERT INTO ai_interview_report_details
               (ai_interview_report_id, ai_interview_invite_id, question, transcript_text, question_weight, video_url, score, rating, ai_feedback, que_type, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
              [
                report.id,
                interviewInviteId,
                questionText,
                answerText || '',
                detail.question_weight || 1,
                detail.video_url || null,
                isPractice ? null : detailScore,
                isPractice ? 'practice' : (detail.rating || null),
                isPractice ? 'Practice Mode' : detailFeedback,
                detail.que_type || 'general',
              ]
            );
          }
        }
        console.log(`✅ Report details upsert complete\n`);
      } else {
        console.log('⚠️  No report_details to upsert\n');
      }

      // Update interview invite status to Completed ONLY if there is at least 1 answered question.
      // If there are no answers, keep it as Pending/In Progress/Partially Completed (do not "complete" the interview).
      const answeredCountRes = await client.query(
        `SELECT COUNT(*)::int as answered_count
         FROM ai_interview_report_details
         WHERE ai_interview_report_id = $1
           AND LENGTH(TRIM(COALESCE(transcript_text, ''))) > 0`,
        [report.id]
      );
      const answeredCount = Number(answeredCountRes.rows?.[0]?.answered_count ?? 0);

      if (answeredCount > 0) {
        await client.query(
          'UPDATE ai_interview_invites SET status = $1, updated_at = NOW() WHERE id = $2',
          ['Completed', interviewInviteId]
        );
        console.log(`✅ Invite ${interviewInviteId} status updated to Completed`);
      } else {
        console.log(`⚠️  No answers found for invite ${interviewInviteId}; skipping status update to Completed`);
      }

      // Check if all invited candidates have completed this interview
      const pendingResult = await client.query(
        `SELECT COUNT(*) as pending_count FROM ai_interview_invites 
         WHERE interview_id = $1 AND status != $2 AND discarded_at IS NULL`,
        [interviewId, 'Completed']
      );

      const pendingCount = parseInt(pendingResult.rows[0].pending_count);

      // If no pending invites, mark interview as Completed
      if (pendingCount === 0) {
        await client.query(
          'UPDATE ai_interviews SET status = $1, updated_at = NOW() WHERE id = $2',
          ['Completed', interviewId]
        );
        console.log(`✅ Interview ${interviewId} marked as Completed (all candidates done)`);
      }

      await client.query('COMMIT');
      return report;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error submitting interview report:', error);
    throw error;
  }
}

export async function getInterviewReportDetails(reportId: number) {
  try {
    const client = await pool.connect();

    try {
      // Get main report
      const reportResult = await client.query(
        'SELECT * FROM ai_interview_reports WHERE id = $1',
        [reportId]
      );

      if (reportResult.rows.length === 0) {
        return null;
      }

      const report = reportResult.rows[0];

      // Get report details
      const detailsResult = await client.query(
        'SELECT * FROM ai_interview_report_details WHERE ai_interview_report_id = $1 ORDER BY created_at',
        [reportId]
      );

      return {
        ...report,
        details: detailsResult.rows,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error getting interview report details:', error);
    throw error;
  }
}

export async function getTalentReportByInviteId(inviteId: number) {
  try {
    const client = await pool.connect();

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

    try {
      // Get report for this invite (includes partial reports and reports being processed)
      const reportResult = await client.query(
        `SELECT air.*, aiv.candidate_name, aiv.candidate_email, ai.interview_title, ai.interview_category
         FROM ai_interview_reports air
         JOIN ai_interview_invites aiv ON air.ai_interview_invite_id = aiv.id
         JOIN ai_interviews ai ON air.interview_id = ai.id
         WHERE air.ai_interview_invite_id = $1 AND air.discarded_at IS NULL
         ORDER BY air.created_at DESC
         LIMIT 1`,
        [inviteId]
      );

      if (reportResult.rows.length === 0) {
        return null;
      }

      const report = reportResult.rows[0];

      // Get report details (question-by-question feedback)
      const detailsResult = await client.query(
        `SELECT * FROM ai_interview_report_details 
         WHERE ai_interview_report_id = $1 
         ORDER BY created_at ASC`,
        [report.id]
      );

      // Completion metrics
      const answeredCount = Number(detailsResult.rows?.length ?? 0);

      const totalQuestionsRes = await client.query(
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

      // Processing: partial scoring may run async.
      //
      // IMPORTANT FIX:
      // Some endpoints/UI treat "rating is null" as "pending" and show N/A in employer lists/reports.
      // For partially-completed interviews we want to show a meaningful status:
      //  - If there is at least 1 answered question AND we have any scored detail -> show "Partial"
      //  - If there is at least 1 answered question BUT no scored detail yet -> show "Pending"
      // This mirrors Rails behavior more closely and prevents "N/A" on partial interviews.
      const normalized = {
        ...report,
        // IMPORTANT: score/ai_feedback columns may be JSON stored as string
        score: safeJsonParse(report.score),
        ai_feedback: safeJsonParse(report.ai_feedback),
        details: detailsResult.rows.map((row: any) => ({
          ...row,
          score: safeJsonParse(row.score),
          ai_feedback: safeJsonParse(row.ai_feedback),
        })),
        answered_count: answeredCount,
        total_questions: totalQuestions,
        completion_percentage: completionPercentage,
        is_processing: false,
        processing_status: "completed",
      };

      // If overall score is missing but we have per-question scores, compute a basic aggregate.
      // This enables "scoring" to show for Partially Completed interviews.
      if (!normalized.score) {
        const detailScores = (normalized.details || [])
          .map((d: any) => {
            const s = d?.score;
            if (typeof s === "number") return s;
            if (typeof s === "string") {
              const n = Number(s);
              return Number.isFinite(n) ? n : null;
            }
            if (s && typeof s === "object") {
              // common shapes: { total: 7 } or { score: 7 }
              const n = Number((s as any).total ?? (s as any).score);
              return Number.isFinite(n) ? n : null;
            }
            return null;
          })
          .filter((n: any) => typeof n === "number" && Number.isFinite(n));

        if (detailScores.length > 0) {
          const avg =
            Math.round(
              (detailScores.reduce((a: number, b: number) => a + b, 0) / detailScores.length) * 10
            ) / 10;
          normalized.score = { average: avg, answered: detailScores.length };
        }
      }

      // If overall rating is missing but we have at least one scored detail row, compute an overall rating
      // using the same mapping as completed interviews (generateInterviewFeedback output).
      //
      // IMPORTANT:
      // Do NOT return "Partial" as a rating label. For partially completed interviews we still want a real
      // overall rating (Great/Average/Poor) based on whatever answers exist so far.
      if (!normalized.rating || String(normalized.rating).trim().length === 0) {
        // Try derive from score payload (best-effort) before falling back to detail ratings.
        const extractNumericScore = (val: any): number | null => {
          if (val == null) return null;
          if (typeof val === 'number') return Number.isFinite(val) ? val : null;
          if (typeof val === 'string') {
            const n = Number(val);
            return Number.isFinite(n) ? n : null;
          }
          if (typeof val === 'object') {
            const n = Number((val as any).total ?? (val as any).score ?? (val as any).average);
            return Number.isFinite(n) ? n : null;
          }
          return null;
        };

        const overallNumeric =
          extractNumericScore(normalized.score) ??
          extractNumericScore((normalized.score as any)?.final_score) ??
          extractNumericScore((normalized.score as any)?.overall_score);

        // Map numeric -> label (align with existing completed interview labeling conventions).
        const numericToLabel = (n: number): string => {
          // If your completed flow uses a different scale, adjust here.
          // Current system commonly uses 0-10 or 0-100; support both.
          const score0to100 = n <= 10 ? n * 10 : n;
          if (score0to100 >= 75) return 'Great';
          if (score0to100 >= 45) return 'Average';
          return 'Poor';
        };

        let derived: string | null = null;

        if (overallNumeric != null) {
          derived = numericToLabel(overallNumeric);
        } else {
          const detailRatings = (normalized.details || [])
            .map((d: any) => (d?.rating || '').toString().trim())
            .filter((r: string) => r.length > 0 && r.toLowerCase() !== 'practice');

          // If details are already labeled Great/Average/Poor, use majority vote.
          if (detailRatings.length > 0) {
            const counts = new Map<string, number>();
            for (const r of detailRatings) counts.set(r, (counts.get(r) || 0) + 1);
            derived = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
          }
        }

        if (answeredCount > 0 && derived) {
          normalized.rating = derived;
          normalized.is_processing = false;
          normalized.processing_status = 'completed';
        } else if (answeredCount > 0) {
          normalized.rating = null;
          normalized.is_processing = true;
          normalized.processing_status = 'generating_feedback';
        } else {
          normalized.rating = null;
          normalized.is_processing = false;
          normalized.processing_status = 'no_answers';
        }
      }

      return normalized;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error getting talent interview report:", error);
    throw error;
  }
}

export async function getTalentInterviewSchedules(talentUserId: string | number) {
  try {
    // Get user email first
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [talentUserId]
    );

    if (userResult.rows.length === 0) {
      return [];
    }

    const userEmail = (userResult.rows[0].email || '').toString().toLowerCase().trim();

    const result = await pool.query(
      `SELECT 
        ai.id,
        ai.interview_title,
        ai.job_id,
        ai.person_id,
        ai.status,
        ai.type_of_interview,
        ai.interview_category,
        ai.question_type,
        ai.created_at as interview_created_at,
        ai.updated_at as interview_updated_at,
        aiv.id as invite_id,
        aiv.candidate_name,
        aiv.candidate_email,
        aiv.unique_interview_link,
        aiv.status as invite_status,
        aiv.phone_num,
        aiv.person_id as talent_user_id,
        aiv.created_at as invite_created_at,
        aiv.updated_at as invite_updated_at,
        (SELECT COUNT(*) FROM ai_interview_reports WHERE ai_interview_invite_id = aiv.id) as completed,
        (SELECT COUNT(*) FROM ai_interview_reports WHERE ai_interview_invite_id = aiv.id AND discarded_at IS NULL) as report_count,
        (SELECT COUNT(*) FROM ai_interview_report_details WHERE ai_interview_invite_id = aiv.id)::int as answered_count,
        (
          (
            (SELECT COUNT(*) FROM ai_interview_custom_questions WHERE ai_interview_id = ai.id AND discarded_at IS NULL)
            +
            (SELECT COUNT(*) FROM ai_generated_questions WHERE interview_id = ai.id AND discarded_at IS NULL)
          )::int
        ) as total_questions
       FROM ai_interviews ai
       JOIN ai_interview_invites aiv ON ai.id = aiv.interview_id
       WHERE (
           (aiv.person_id = $1)
           OR (LOWER(TRIM(aiv.candidate_email)) = $2)
         )
         AND ai.discarded_at IS NULL 
         AND aiv.discarded_at IS NULL
       ORDER BY aiv.created_at DESC`,
      [talentUserId, userEmail]
    );

    return result.rows.map(row => {
      const answeredCount = Number(row.answered_count ?? 0);
      const totalQuestions = Number(row.total_questions ?? 0);
      const completionPercentage =
        totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

      return {
        id: row.id,
        invite_id: row.invite_id,
        job_title: row.interview_title || 'Interview',
        interview_title: row.interview_title,
        company: 'Company',
        location: 'Remote',
        type_of_interview: row.type_of_interview || 'Practice',
        interview_category: row.interview_category || 'General',
        invite_created_at: row.invite_created_at,
        invite_status: row.invite_status || 'Pending',
        completed: row.completed,
        report_count: row.report_count,
        answered_count: answeredCount,
        total_questions: totalQuestions,
        completion_percentage: completionPercentage,
        candidate_name: row.candidate_name,
        candidate_email: row.candidate_email,
        phone_num: row.phone_num,
        unique_interview_link: row.unique_interview_link,
        job_id: row.job_id,
        status: row.status,
        question_type: row.question_type,
      };
    });
  } catch (error: any) {
    console.error('Error getting talent interview schedules:', error);
    throw error;
  }
}

/**
 * Get full interview details by unique link (for candidates)
 * Includes interview info, questions, type, and status
 */
export async function getInterviewByUniqueLink(uniqueLink: string) {
  try {
    const client = await pool.connect();

    try {
      console.log('🔍 Looking up interview with link:', uniqueLink);
      
      // Get invite and interview info
    const inviteResult = await client.query(
      `SELECT 
          aiv.id as invite_id,
          aiv.interview_id,
          aiv.candidate_name,
          aiv.candidate_email,
          aiv.status as invite_status,
          aiv.person_id as invite_person_id,
          ai.id,
          ai.interview_title,
          ai.type_of_interview,
          ai.interview_category,
          ai.addition_skill,
          ai.job_id,
          cj.name as job_name,
          cj.description as job_description
         FROM ai_interview_invites aiv
         JOIN ai_interviews ai ON aiv.interview_id = ai.id
         LEFT JOIN jobs cj ON ai.job_id = cj.id
         WHERE aiv.unique_interview_link = $1
           AND aiv.discarded_at IS NULL
           AND LOWER(aiv.status) = 'pending'`,
        [uniqueLink]
      );

      console.log('📋 Query result rows:', inviteResult.rows.length);

      if (inviteResult.rows.length === 0) {
        console.log('❌ No interview found for link:', uniqueLink);
        console.log('🔍 Checking if link exists in database...');
        
        // Debug: check if any link exists
        const allInvites = await client.query(
          `SELECT id, unique_interview_link, candidate_name FROM ai_interview_invites LIMIT 5`
        );
        console.log('📊 Sample invites:', allInvites.rows);
        
        return null;
      }

      const inviteData = inviteResult.rows[0];
      const interviewId = inviteData.interview_id;

      console.log('✅ Found interview:', interviewId);

      // Get questions from both custom and generated
      const questionsResult = await client.query(
        `(SELECT id, question, question_weight, 'custom' as type FROM ai_interview_custom_questions WHERE ai_interview_id = $1 AND discarded_at IS NULL ORDER BY created_at)
         UNION ALL
         (SELECT id, question, question_weight, 'generated' as type FROM ai_generated_questions WHERE interview_id = $1 AND discarded_at IS NULL ORDER BY created_at)`,
        [interviewId]
      );

      console.log('📝 Found questions:', questionsResult.rows.length);

      return {
        invite_id: inviteData.invite_id,
        // IMPORTANT: interview_id must be the ai_interviews.id (not the invite row id)
        interview_id: inviteData.interview_id,
        candidate_name: inviteData.candidate_name,
        candidate_email: inviteData.candidate_email,
        invite_person_id: inviteData.invite_person_id,
        interview_title: inviteData.interview_title,
        type_of_interview: inviteData.type_of_interview || 'Practice',
        interview_category: inviteData.interview_category || 'General',
        invite_status: inviteData.invite_status,
        job_name: inviteData.job_name,
        job_description: inviteData.job_description,
        addition_skill: inviteData.addition_skill,
        questions: questionsResult.rows,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error getting interview by unique link:', error);
    throw error;
  }
}

export async function getInterviewQuestionsWithWeights(interviewId: number) {
  try {
    const client = await pool.connect();

    try {
      // Get custom questions with full details
      const customQuestionsResult = await client.query(
        `SELECT 
          id, 
          ai_interview_id,
          question, 
          question_weight, 
          'custom' as type,
          created_by,
          created_at
         FROM ai_interview_custom_questions 
         WHERE ai_interview_id = $1 AND discarded_at IS NULL 
         ORDER BY created_at ASC`,
        [interviewId]
      );

      // Get generated questions with full details
      const generatedQuestionsResult = await client.query(
        `SELECT 
          id,
          interview_id,
          question, 
          question_weight, 
          'generated' as type,
          job_id,
          created_at
         FROM ai_generated_questions 
         WHERE interview_id = $1 AND discarded_at IS NULL 
         ORDER BY created_at ASC`,
        [interviewId]
      );

      const questions = [
        ...customQuestionsResult.rows.map((q: any) => ({
          id: q.id,
          question: q.question,
          question_weight: q.question_weight || 1,
          type: q.type,
          source: 'custom',
        })),
        ...generatedQuestionsResult.rows.map((q: any) => ({
          id: q.id,
          question: q.question,
          question_weight: q.question_weight || 1,
          type: q.type,
          source: 'generated',
        })),
      ];

      console.log(`📋 Retrieved ${questions.length} questions with weights for interview ${interviewId}`);

      return questions;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error getting interview questions with weights:', error);
    throw error;
  }
}
