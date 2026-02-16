import pool from '../database/connection.js';
import crypto from 'crypto';
import { sendInterviewInviteEmail } from './email.service.js';

export async function createAIInterview(
  userId: string,
  jobId: string | number,
  status: string = 'pending',
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

      // Add custom questions if provided
      if (questions && questions.length > 0) {
        for (const q of questions) {
          if (q.type === 'custom') {
            await client.query(
              `INSERT INTO ai_interview_custom_questions (ai_interview_id, question, question_weight, created_by, created_at, updated_at)
               VALUES ($1, $2, $3, $4, NOW(), NOW())`,
              [interview.id, q.question, q.weight || 3, userId]
            );
          } else if (q.type === 'generated') {
            await client.query(
              `INSERT INTO ai_generated_questions (interview_id, job_id, question, question_weight, created_at, updated_at)
               VALUES ($1, $2, $3, $4, NOW(), NOW())`,
              [interview.id, jobId, q.question, q.weight || 3]
            );
          }
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

export async function getInterviewsForEmployer(userId: string) {
  try {
    const result = await pool.query(
      `SELECT 
        ai.*,
        (SELECT COUNT(*) FROM ai_interview_invites WHERE interview_id = ai.id AND discarded_at IS NULL) as candidate_count,
        (SELECT COUNT(*) FROM ai_interview_reports WHERE interview_id = ai.id AND discarded_at IS NULL) as completed_count
       FROM ai_interviews ai
       WHERE ai.person_id = $1 AND ai.discarded_at IS NULL
       ORDER BY ai.created_at DESC`,
      [userId]
    );

    return result.rows;
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
    const appUrl = process.env.APP_URL || 'http://172.17.252.184:5173';
    const interviewLink = `${appUrl}/interview/${uniqueLink}`;

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
  numQuestions: number = 5
) {
  try {
    // Get interview details to get job_id
    const interviewResult = await pool.query(
      'SELECT job_id FROM ai_interviews WHERE id = $1',
      [interviewId]
    );

    if (interviewResult.rows.length === 0) {
      throw new Error('Interview not found');
    }

    const jobId = interviewResult.rows[0].job_id;

    // Mock AI question generation
    const questions = generateMockQuestions(jobDescription, numQuestions);
    const savedQuestions = [];

    for (const q of questions) {
      const result = await pool.query(
        `INSERT INTO ai_generated_questions (interview_id, job_id, question, question_weight, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [interviewId, jobId, q, 3]
      );
      savedQuestions.push(result.rows[0]);
    }

    return savedQuestions;
  } catch (error: any) {
    console.error('Error generating questions:', error);
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

export async function submitInterviewReport(
  interviewId: number,
  interviewInviteId: number,
  reportData: {
    interview_start_at: string;
    transcript_text: string;
    rating?: string;
    score?: string;
    ai_feedback?: string;
    interview_video_url?: string;
    protecting_score?: string;
    report_details?: Array<{
      question: string;
      transcript_text: string;
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

      // Create interview report
      const reportResult = await client.query(
        `INSERT INTO ai_interview_reports 
         (interview_id, ai_interview_invite_id, interview_start_at, transcript_text, rating, score, ai_feedback, interview_video_url, protecting_score, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [
          interviewId,
          interviewInviteId,
          reportData.interview_start_at,
          reportData.transcript_text,
          reportData.rating || 'good',
          reportData.score || '0',
          reportData.ai_feedback || '',
          reportData.interview_video_url || null,
          reportData.protecting_score || null,
        ]
      );

      const report = reportResult.rows[0];

      // Add report details if provided
      if (reportData.report_details && reportData.report_details.length > 0) {
        for (const detail of reportData.report_details) {
          await client.query(
            `INSERT INTO ai_interview_report_details
             (ai_interview_report_id, ai_interview_invite_id, question, transcript_text, video_url, score, rating, ai_feedback, que_type, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
              report.id,
              interviewInviteId,
              detail.question || '',
              detail.transcript_text || '',
              detail.video_url || null,
              detail.score || '0',
              detail.rating || 'good',
              detail.ai_feedback || '',
              detail.que_type || 'practice',
            ]
          );
        }
      }

      // Update interview invite status
      await client.query(
        'UPDATE ai_interview_invites SET status = $1, updated_at = NOW() WHERE id = $2',
        ['Completed', interviewInviteId]
      );

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

    const userEmail = userResult.rows[0].email;

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
        (SELECT COUNT(*) FROM ai_interview_reports WHERE ai_interview_invite_id = aiv.id AND discarded_at IS NULL) as report_count
       FROM ai_interviews ai
       JOIN ai_interview_invites aiv ON ai.id = aiv.interview_id
       WHERE (aiv.person_id = $1 OR aiv.candidate_email = $2)
         AND ai.discarded_at IS NULL 
         AND aiv.discarded_at IS NULL
       ORDER BY aiv.created_at DESC`,
      [talentUserId, userEmail]
    );

    return result.rows.map(row => ({
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
      candidate_name: row.candidate_name,
      candidate_email: row.candidate_email,
      phone_num: row.phone_num,
      unique_interview_link: row.unique_interview_link,
      job_id: row.job_id,
      status: row.status,
      question_type: row.question_type,
    }));
  } catch (error: any) {
    console.error('Error getting talent interview schedules:', error);
    throw error;
  }
}

// Helper function to generate mock AI questions
function generateMockQuestions(jobDescription: string, numQuestions: number): string[] {
  const questions = [
    'Tell us about your experience with the technologies relevant to this role.',
    'Describe a challenging project you worked on and how you overcame the obstacles.',
    'How do you approach problem-solving in your work?',
    'What motivates you to work in this field?',
    'How do you collaborate with team members on complex projects?',
    'Describe a time when you had to learn a new technology quickly.',
    'What are your career goals and how does this position fit into them?',
    'How do you handle feedback and criticism?',
  ];

  return questions.slice(0, numQuestions);
}
