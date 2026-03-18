import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { query } from '../database/connection.js';
import { sendEmailViaSES } from '../services/email.service.js';

const router = Router();

/**
 * Employer actions over candidates (applications).
 *
 * POST /api/employer/candidates/email
 * Body: { to: string, subject: string, body: string }
 *
 * Notes:
 * - Uses AWS SES credentials from email.service.ts
 * - Keeps backend minimal; UI is responsible for placeholder substitution logic
 */
router.post('/candidates/email', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const { to, subject, body, job_id, candidate_user_id } = req.body ?? {};
    const toEmail = typeof to === 'string' ? to.trim() : '';
    const subj = typeof subject === 'string' ? subject.trim() : '';
    const msg = typeof body === 'string' ? body.trim() : '';
    const jobId =
      job_id === undefined || job_id === null || job_id === '' ? null : Number(job_id);
    const candidateUserId =
      candidate_user_id === undefined || candidate_user_id === null || candidate_user_id === ''
        ? null
        : Number(candidate_user_id);

    if (!toEmail || !subj || !msg) {
      res.status(400).json({ success: false, error: 'to, subject, and body are required' });
      return;
    }

    const userRow = await query(
      'SELECT first_name, last_name, email FROM users WHERE id = $1',
      [req.user.id]
    );

    const first = String(userRow.rows?.[0]?.first_name || '').trim();
    const last = String(userRow.rows?.[0]?.last_name || '').trim();
    const employerName = `${first} ${last}`.trim() || String(userRow.rows?.[0]?.email || 'Employer');

    const lines = msg.split("\n").map((line: string) => line.trim());

    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        out.push("<br/>");
        continue;
      }

      // Render checkbox-like rows for legacy human interview availability emails.
      const checkboxMatch = line.match(/^\[checkbox\]\s*(.*)$/i);
      if (checkboxMatch) {
        const label = checkboxMatch[1] || "";
        out.push(`<p>☐ ${escapeHtml(label)}</p>`);
        continue;
      }

      // Render a real email button:
      // UI sends:
      //   [button] Review and Book Slot
      //   https://...
      const buttonMatch = line.match(/^\[button\]\s*(.*)$/i);
      if (buttonMatch) {
        const label = (buttonMatch[1] || "").trim() || "Open";
        const href = String(lines[i + 1] || "").trim();
        if (href) {
          out.push(`
            <div style="text-align:center; margin: 24px 0;">
              <a href="${href}"
                 style="display:inline-block; background-color: hsl(38 92% 50%); color:#000000; padding: 14px 22px;
                        border-radius: 10px; text-decoration:none; font-weight:700; font-size: 15px;">
                ${escapeHtml(label)}
              </a>
            </div>
            <p style="font-size: 13px; color:#555;">If the button doesn't work, copy/paste this URL:</p>
            <p style="font-size: 13px; color:#555;">${escapeHtml(href)}</p>
          `);
          i++; // consume URL line
          continue;
        }

        // If URL line missing, just render the label as text
        out.push(`<p><strong>${escapeHtml(label)}</strong></p>`);
        continue;
      }

      out.push(`<p>${escapeHtml(line)}</p>`);
    }

    const html = out.join("");

    // NOTE:
    // SES requires a verified sender address; we keep the technical "from" as EMAIL_FROM
    // but make the email appear as coming from the employer via From display name + Reply-To.
    const employerEmail = String(userRow.rows?.[0]?.email || '').trim();

    await sendEmailViaSES(toEmail, subj, html, process.env.EMAIL_FROM || 'cardin@cardinaltalent.ai', {
      fromDisplayName: employerName,
      replyTo: employerEmail || undefined,
    });

    // Persist history for "Last Email" UI (Rails parity: automation_email_sending_logs)
    // This table requires (person_id, job_id) NOT NULL.
    // - For recommended candidates: UI sends candidate_user_id + job_id.
    // - For human interview invites: UI may only have the email (candidate_user_id missing).
    // We derive person_id from users.email in that case.
    let personIdForLog: number | null = candidateUserId;

    if (!personIdForLog) {
      const personLookup = await query('SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1', [
        toEmail,
      ]);
      const found = Number(personLookup.rows?.[0]?.id);
      if (Number.isFinite(found)) personIdForLog = found;
    }

    if (jobId && personIdForLog) {
      await query(
        `INSERT INTO automation_email_sending_logs
         (person_id, job_id, first_name, last_name, email, phone_number, body, subject, status, response, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NOW(), NOW())`,
        [personIdForLog, jobId, null, null, toEmail, null, msg, subj, 'success']
      );
    } else {
      // Don't fail the email send just because we can't log history.
      console.warn(
        'Skipping automation_email_sending_logs insert due to missing person_id/job_id',
        { jobId, candidateUserId, derivedPersonId: personIdForLog, toEmail }
      );
    }

    // Update email_sent_at on recommendation row (if applicable)
    if (jobId && candidateUserId) {
      await query(
        `UPDATE employer_auto_matched_candidates
         SET email_sent_at = COALESCE(email_sent_at, NOW()),
             updated_at = NOW()
         WHERE job_id = $1 AND person_id = $2`,
        [jobId, candidateUserId]
      );
    }

    res.json({ success: true });
  } catch (e: any) {
    console.error('POST /employer/candidates/email failed:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to send email' });
  }
});

function escapeHtml(input: string): string {
  return (input || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

/**
 * Email history for recommended candidates (Last Email modal).
 *
 * GET /api/employer/candidates/email-history?job_id=123&candidate_user_id=456
 */
router.get('/candidates/email-history', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const jobId = typeof req.query.job_id === 'string' ? Number(req.query.job_id) : null;
    const candidateUserId =
      typeof req.query.candidate_user_id === 'string' ? Number(req.query.candidate_user_id) : null;

    if (!candidateUserId) {
      res.status(400).json({ success: false, error: 'candidate_user_id is required' });
      return;
    }

    const result = await query(
      `SELECT id, person_id, job_id, email AS to_email, subject, body, created_at AS sent_at
       FROM automation_email_sending_logs
       WHERE discarded_at IS NULL
         AND person_id = $1
         AND ($2::int IS NULL OR job_id = $2)
       ORDER BY created_at DESC
       LIMIT 50`,
      [candidateUserId, jobId]
    );

    res.json({ success: true, data: result.rows || [] });
  } catch (e: any) {
    console.error('GET /employer/candidates/email-history failed:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to load email history' });
  }
});

/**
 * Email history counts for recommended candidates list.
 *
 * POST /api/employer/candidates/email-history-counts
 * Body: { job_id?: number | null, candidate_user_ids: number[] }
 *
 * Returns: [{ candidate_user_id: number, count: number }]
 */
router.post('/candidates/email-history-counts', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const jobId =
      req.body?.job_id === undefined || req.body?.job_id === null || req.body?.job_id === ''
        ? null
        : Number(req.body.job_id);

    const candidateUserIdsRaw = req.body?.candidate_user_ids;
    const candidateUserIds: number[] = Array.isArray(candidateUserIdsRaw)
      ? candidateUserIdsRaw.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n))
      : [];

    if (candidateUserIds.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const result = await query(
      `SELECT person_id AS candidate_user_id, COUNT(*)::int AS count
       FROM automation_email_sending_logs
       WHERE discarded_at IS NULL
         AND person_id = ANY($1::int[])
         AND ($2::int IS NULL OR job_id = $2)
       GROUP BY person_id`,
      [candidateUserIds, jobId]
    );

    res.json({ success: true, data: result.rows || [] });
  } catch (e: any) {
    console.error('POST /employer/candidates/email-history-counts failed:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to load email history counts' });
  }
});

export default router;
