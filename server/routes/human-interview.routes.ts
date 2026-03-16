import { Router, Request, Response } from 'express';
import { query } from '../database/connection.js';
import { sendEmailViaSES } from '../services/email.service.js';

const EMAIL_FROM = 'cardin@cardinaltalent.ai';

function button(href: string, label: string): string {
  const safeHref = String(href || '').trim();
  const safeLabel = escapeHtml(String(label || '').trim() || 'Open');
  return `
    <div style="text-align:center; margin: 24px 0;">
      <a href="${safeHref}"
         style="display:inline-block; background-color: hsl(38 92% 50%); color:#000000; padding: 14px 22px;
                border-radius: 10px; text-decoration:none; font-weight:700; font-size: 15px;">
        ${safeLabel}
      </a>
    </div>
  `;
}

const router = Router();

/**
 * AUTH: Employer creates / finds an `employer_auto_matched_candidates` row and returns booking links.
 *
 * POST /api/human-interview/request
 * Body:
 *  - candidateName: string
 *  - candidateEmail: string
 *  - jobId: number
 *
 * Notes:
 * - We key the scheduling flow by (job_id, person_id).
 * - "person_id" is the candidate user id in this schema.
 * - This endpoint is the bridge from ctnew employer UI -> Rails-compatible scheduling pages.
 */
import { authenticateToken } from '../middleware/auth.middleware.js';

router.post('/request', authenticateToken, async (req: Request, res: Response) => {
  try {
    // We rely on upstream auth middleware in server/index.ts for /api routes.
    // Here we just read req.user if present; if your stack doesn't inject it, this will 401.
    const user: any = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    if (user.role !== 'employer' && user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const body = req.body ?? {};
    const jobId = Number(body.jobId);
    const candidateName = String(body.candidateName || '').trim();
    const candidateEmail = String(body.candidateEmail || '').trim();

    if (!jobId || isNaN(jobId)) {
      res.status(400).json({ success: false, error: 'jobId is required' });
      return;
    }
    if (!candidateEmail) {
      res.status(400).json({ success: false, error: 'candidateEmail is required' });
      return;
    }

    // Resolve candidate user id (person_id) by email
    const cand = await query(`SELECT id, first_name, last_name, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [
      candidateEmail,
    ]);
    const candidate = cand.rows?.[0] || null;
    if (!candidate?.id) {
      res.status(400).json({
        success: false,
        error: 'Candidate must have an account (no user found for candidateEmail).',
      });
      return;
    }

    const personId = Number(candidate.id);

    // Upsert-ish: ensure a row exists in employer_auto_matched_candidates for this job/person.
    // Create minimal row if missing.
    const existing = await query(
      `SELECT * FROM employer_auto_matched_candidates WHERE job_id = $1 AND person_id = $2 LIMIT 1`,
      [jobId, personId]
    );

    let row = existing.rows?.[0] || null;

    if (!row) {
      // Populate some optional fields if columns exist; keep SQL minimal to avoid column mismatch.
      // Assumes these columns exist: job_id, person_id, created_at, updated_at
      await query(
        `INSERT INTO employer_auto_matched_candidates (job_id, person_id, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [jobId, personId]
      );

      const r2 = await query(
        `SELECT * FROM employer_auto_matched_candidates WHERE job_id = $1 AND person_id = $2 LIMIT 1`,
        [jobId, personId]
      );
      row = r2.rows?.[0] || null;
    }

    if (!row) {
      res.status(500).json({ success: false, error: 'Failed to create scheduling record' });
      return;
    }

    const PUBLIC_BASE_URL =
      (process.env.PUBLIC_BASE_URL || '').trim() ||
      (process.env.FRONTEND_URL || '').trim() ||
      (process.env.PUBLIC_APP_URL || '').trim() ||
      (process.env.APP_URL || '').trim() ||
      (process.env.CLIENT_URL || '').trim() ||
      'https://ctnew.cardinaltalent.ai';

    const scheduleUrl = `${PUBLIC_BASE_URL}/human-interview/schedule/${jobId}/${personId}`;
    const manageUrl = `${PUBLIC_BASE_URL}/human-interview/manage/${jobId}/${personId}`;

    // Email candidate the booking link (this is what "Send booking link" expects).
    // Best-effort: never fail the API response if SES is misconfigured; but log loudly.
    try {
      const safeCandidateName =
        candidateName || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || candidateEmail;

      const subject = `Interview availability needed`;
      const html = `
        <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 16px; line-height: 1.6; color:#111;">
          <p>Hi ${escapeHtml(safeCandidateName)},</p>
          <p>Please choose up to 3 availability slots for your interview:</p>
          ${button(scheduleUrl, 'Book your slot')}
          <p style="font-size: 13px; color:#555;">If the button doesn't work, copy/paste this URL:</p>
          <p style="font-size: 13px; color:#555;">${escapeHtml(scheduleUrl)}</p>
          <p style="margin-top: 24px;">— CardinalTalent</p>
        </div>
      `;
      await sendEmailViaSES(candidateEmail, subject, html, EMAIL_FROM);
    } catch (emailErr) {
      console.error('Candidate booking link email failed (non-fatal):', emailErr);
    }

    res.json({
      success: true,
      data: {
        match: { jobId, personId },
        scheduleUrl,
        manageUrl,
        request: {
          candidate_name:
            candidateName || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || candidateEmail,
          candidate_email: candidateEmail,
          job_id: jobId,
        },
      },
    });
  } catch (e: any) {
    console.error('POST /human-interview/request failed:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to create booking link' });
  }
});

/**
 * PUBLIC: Candidate opens schedule page and needs record status/details
 *
 * GET /api/human-interview/public/candidate/:jobId/:personId
 */
router.get('/public/candidate/:jobId/:personId', async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.jobId);
    const personId = Number(req.params.personId);

    if (!jobId || isNaN(jobId) || !personId || isNaN(personId)) {
      res.status(400).json({ success: false, error: 'jobId and personId are required' });
      return;
    }

    const r = await query(
      `SELECT *
       FROM employer_auto_matched_candidates
       WHERE job_id = $1 AND person_id = $2
       LIMIT 1`,
      [jobId, personId]
    );

    const row = r.rows?.[0] || null;
    if (!row) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }

    row.slot_times = String(row.time_slot_candidate || '')
      .split('*')
      .map((s: string) => s.trim())
      .filter(Boolean);

    res.json({ success: true, data: row });
  } catch (e: any) {
    console.error('GET /human-interview/public/candidate/:jobId/:personId failed:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to fetch record' });
  }
});

/**
 * PUBLIC: Candidate submits 1-3 availability slots (Rails-compatible)
 *
 * POST /api/human-interview/public/candidate/:jobId/:personId/availability
 * Body (accepts BOTH):
 *  A) Legacy ch-job-marketplace:
 *     - slots: Array<{ id?: string, date: "YYYY-MM-DD", startTime: "hh:mm A", endTime: "hh:mm A", timeZone?: string }>
 *  B) ctnew/ISO:
 *     - slots: Array<{ start: string, end: string, timeZone?: string }>   (ISO)
 *     - candidateTimeZone?: string
 */
router.post('/public/candidate/:jobId/:personId/availability', async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.jobId);
    const personId = Number(req.params.personId);

    if (!jobId || isNaN(jobId) || !personId || isNaN(personId)) {
      res.status(400).json({ success: false, error: 'jobId and personId are required' });
      return;
    }

    const slots = Array.isArray(req.body?.slots) ? req.body.slots : [];
    const candidateTimeZone = String(req.body?.candidateTimeZone || '').trim() || 'UTC';

    // If payload matches ch-job-marketplace, keep its "date + hh:mm A" strings as-is.
    const isLegacy = (s: any) => Boolean(s && s.date && s.startTime && s.endTime);

    const legacyCleaned = (slots || [])
      .filter((s: any) => isLegacy(s))
      .slice(0, 3);

    const isoCleaned = (slots || [])
      .filter((s: any) => s?.start && s?.end)
      .slice(0, 3);

    const cleaned = legacyCleaned.length > 0 ? legacyCleaned : isoCleaned;

    if (cleaned.length === 0) {
      res.status(400).json({ success: false, error: 'At least one slot is required' });
      return;
    }

    const time_slot_candidate =
      legacyCleaned.length > 0
        ? legacyCleaned
            .map((s: any) => {
              const date = String(s.date || '').trim();
              const startTime = String(s.startTime || '').trim();
              const endTime = String(s.endTime || '').trim();
              const tz = (String(s.timeZone || 'PT').trim() || 'PT') as string;
              return `${date}~${startTime}~${endTime}~${tz}`;
            })
            .join('*')
        : isoCleaned
            .map((s: any) => {
              // ISO variant -> encode in the same legacy string format but using HH:mm in UTC
              const start = new Date(s.start);
              const end = new Date(s.end);

              const pad = (n: number) => String(n).padStart(2, '0');
              const yyyy = start.getUTCFullYear();
              const mm = pad(start.getUTCMonth() + 1);
              const dd = pad(start.getUTCDate());
              const startH = pad(start.getUTCHours());
              const startM = pad(start.getUTCMinutes());
              const endH = pad(end.getUTCHours());
              const endM = pad(end.getUTCMinutes());

              const date = `${yyyy}-${mm}-${dd}`;
              const startTime = `${startH}:${startM}`;
              const endTime = `${endH}:${endM}`;
              const tz = (String(s.timeZone || candidateTimeZone || 'UTC').trim() || 'UTC') as string;

              return `${date}~${startTime}~${endTime}~${tz}`;
            })
            .join('*');

    await query(
      `UPDATE employer_auto_matched_candidates
       SET time_slot_candidate = NULLIF($3,''),
           selected_time_slot = NULL,
           timeslot_process_candidate = 1,
           timeslot_process_at = NOW(),
           timeslot_sent_at = NOW(),
           is_candidate_approve = 1,
           sent_candidate_at = NOW(),
           updated_at = NOW()
       WHERE job_id = $1 AND person_id = $2`,
      [jobId, personId, time_slot_candidate]
    );

    // Notify employer that candidate submitted availability.
    // IMPORTANT: Our local DB schema differs from production (jobs has no title/job_title/position, and may not have employer_id/user_id).
    // So: do NOT query non-existent columns. Keep email best-effort and never fail the candidate flow.
    try {
      // Prefer employer email from env if provided (production-safe).
      const configuredEmployerEmail = String(process.env.EMPLOYER_NOTIFY_EMAIL || '').trim();

      let employerEmail = configuredEmployerEmail;
      let employerName = 'Employer';

      // Your local DB does NOT have `employer_email` / `employer_name` columns (error 42703),
      // so do NOT query them. Rely on env override or fallback to first employer user.

      // Fallback: first employer user if schema supports role.
      if (!employerEmail) {
        try {
          // Be schema tolerant: some DBs use string roles, others use numeric.
          // If `users.role` is an integer column, comparing to 'employer' throws 22P02.
          // Keep it numeric-only here.
          const empAny = await query(
            `
            SELECT email, first_name, last_name
            FROM users
            WHERE role = 5
            ORDER BY id ASC
            LIMIT 1
            `
          );
          employerEmail = String(empAny.rows?.[0]?.email || '').trim();
          employerName =
            `${String(empAny.rows?.[0]?.first_name || '').trim()} ${String(empAny.rows?.[0]?.last_name || '').trim()}`
              .trim() || employerName;
        } catch {}
      }

      // Candidate identity (safe query)
      const candRes = await query(`SELECT email, first_name, last_name FROM users WHERE id = $1 LIMIT 1`, [personId]);
      const candidateEmail = String(candRes.rows?.[0]?.email || '').trim();
      const candidateName =
        `${String(candRes.rows?.[0]?.first_name || '').trim()} ${String(candRes.rows?.[0]?.last_name || '').trim()}`
          .trim() || candidateEmail || `Candidate #${personId}`;

      const PUBLIC_BASE_URL =
        (process.env.PUBLIC_BASE_URL || '').trim() ||
        (process.env.FRONTEND_URL || '').trim() ||
        (process.env.PUBLIC_APP_URL || '').trim() ||
        (process.env.APP_URL || '').trim() ||
        (process.env.CLIENT_URL || '').trim() ||
        'https://ctnew.cardinaltalent.ai';

      const manageUrl = `${PUBLIC_BASE_URL}/human-interview/manage/${jobId}/${personId}`;

      if (employerEmail) {
        const html = `
          <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 16px; line-height: 1.6; color:#111;">
            <p>Hi ${escapeHtml(employerName)},</p>
            <p><strong>${escapeHtml(candidateName)}</strong> has submitted interview availability.</p>
            <p>Please review the slots and confirm one:</p>
            ${button(manageUrl, 'Review availability')}
            <p style="font-size: 13px; color:#555;">If the button doesn't work, copy/paste this URL:</p>
            <p style="font-size: 13px; color:#555;">${escapeHtml(manageUrl)}</p>
            <p style="margin-top: 24px;">— CardinalTalent</p>
          </div>
        `;

        await sendEmailViaSES(
          employerEmail,
          `Candidate availability received: ${candidateName}`,
          html,
          EMAIL_FROM,
          { fromDisplayName: 'CardinalTalent', replyTo: candidateEmail || undefined }
        );
      } else {
        console.warn('Employer notify email skipped: no employer email could be resolved.');
      }
    } catch (notifyErr) {
      console.error('Employer notify email failed (non-fatal):', notifyErr);
    }

    const r = await query(
      `SELECT *
       FROM employer_auto_matched_candidates
       WHERE job_id = $1 AND person_id = $2
       LIMIT 1`,
      [jobId, personId]
    );

    const row = r.rows?.[0] || null;
    if (row) {
      row.slot_times = String(row.time_slot_candidate || '')
        .split('*')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    res.json({ success: true, data: row });
  } catch (e: any) {
    console.error('POST /human-interview/public/candidate/:jobId/:personId/availability failed:', e);
    res.status(400).json({ success: false, error: e?.message || 'Failed to submit availability' });
  }
});

/**
 * PUBLIC: Employer opens manage page and needs record status/details
 *
 * GET /api/human-interview/public/employer/:jobId/:personId
 */
router.get('/public/employer/:jobId/:personId', async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.jobId);
    const personId = Number(req.params.personId);

    if (!jobId || isNaN(jobId) || !personId || isNaN(personId)) {
      res.status(400).json({ success: false, error: 'jobId and personId are required' });
      return;
    }

    const r = await query(
      `SELECT *
       FROM employer_auto_matched_candidates
       WHERE job_id = $1 AND person_id = $2
       LIMIT 1`,
      [jobId, personId]
    );

    const row = r.rows?.[0] || null;
    if (!row) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }

    row.slot_times = String(row.time_slot_candidate || '')
      .split('*')
      .map((s: string) => s.trim())
      .filter(Boolean);

    res.json({ success: true, data: row });
  } catch (e: any) {
    console.error('GET /human-interview/public/employer/:jobId/:personId failed:', e);
    res.status(500).json({ success: false, error: e?.message || 'Failed to fetch record' });
  }
});

/**
 * PUBLIC: Employer confirms a slot (Rails-compatible)
 *
 * POST /api/human-interview/public/employer/:jobId/:personId/confirm
 * Body:
 *  - time_slot: string   (must be one of time_slot_candidate entries)
 */
router.post('/public/employer/:jobId/:personId/confirm', async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.jobId);
    const personId = Number(req.params.personId);

    if (!jobId || isNaN(jobId) || !personId || isNaN(personId)) {
      res.status(400).json({ success: false, error: 'jobId and personId are required' });
      return;
    }

    const time_slot = String(req.body?.time_slot || '').trim();
    if (!time_slot) {
      res.status(400).json({ success: false, error: 'time_slot is required' });
      return;
    }

    const current = await query(
      `SELECT time_slot_candidate, selected_time_slot
       FROM employer_auto_matched_candidates
       WHERE job_id = $1 AND person_id = $2
       LIMIT 1`,
      [jobId, personId]
    );

    const row0 = current.rows?.[0] || null;
    if (!row0) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }

    if (String(row0.selected_time_slot || '').trim()) {
      res.status(400).json({ success: false, error: 'Already confirmed' });
      return;
    }

    const candidates = String(row0.time_slot_candidate || '')
      .split('*')
      .map((s: string) => s.trim())
      .filter(Boolean);

    if (!candidates.includes(time_slot)) {
      res.status(400).json({ success: false, error: 'Selected slot is not in candidate availability' });
      return;
    }

    await query(
      `UPDATE employer_auto_matched_candidates
       SET selected_time_slot = $3,
           timeslot_process_candidate = 1,
           updated_at = NOW()
       WHERE job_id = $1 AND person_id = $2`,
      [jobId, personId, time_slot]
    );

    // Notify candidate (best-effort) that a slot was confirmed.
    // Do NOT query jobs.title (not present in local schema).
    try {
      const candRes = await query(`SELECT email, first_name, last_name FROM users WHERE id = $1 LIMIT 1`, [personId]);
      const candidateEmail = String(candRes.rows?.[0]?.email || '').trim();
      const candidateName =
        `${String(candRes.rows?.[0]?.first_name || '').trim()} ${String(candRes.rows?.[0]?.last_name || '').trim()}`
          .trim() || candidateEmail || `Candidate #${personId}`;

      if (candidateEmail) {
        // time_slot is stored as: YYYY-MM-DD~hh:mm AM~hh:mm AM~TZ (legacy Rails-compatible)
        // Make the confirmation email human-friendly and explicit about timezone.
        const [d, start, end, tz] = String(time_slot).split('~');
        const prettySlot = [d, start && end ? `${start} - ${end}` : start || end, tz ? `(${tz})` : '']
          .filter(Boolean)
          .join(' ');

        const subject = `Interview confirmed`;
        const html = `
          <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 16px; line-height: 1.6; color:#111;">
            <p>Hi ${escapeHtml(candidateName)},</p>
            <p>Your interview time has been confirmed:</p>
            <p style="font-weight:700;">${escapeHtml(prettySlot)}</p>
            <p style="margin-top: 24px;">— CardinalTalent</p>
          </div>
        `;

        await sendEmailViaSES(candidateEmail, subject, html, EMAIL_FROM);
      }
    } catch (notifyErr) {
      console.error('Candidate confirmation email failed (non-fatal):', notifyErr);
    }

    const r = await query(
      `SELECT *
       FROM employer_auto_matched_candidates
       WHERE job_id = $1 AND person_id = $2
       LIMIT 1`,
      [jobId, personId]
    );

    const row = r.rows?.[0] || null;
    if (row) {
      row.slot_times = String(row.time_slot_candidate || '')
        .split('*')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    res.json({ success: true, data: row });
  } catch (e: any) {
    console.error('POST /human-interview/public/employer/:jobId/:personId/confirm failed:', e);
    res.status(400).json({ success: false, error: e?.message || 'Failed to confirm slot' });
  }
});

/**
 * PUBLIC: Employer requests new availability (Rails-compatible reset)
 *
 * POST /api/human-interview/public/employer/:jobId/:personId/request-new
 * Body:
 *  - message?: string   (optional note included in email)
 */
router.post('/public/employer/:jobId/:personId/request-new', async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.jobId);
    const personId = Number(req.params.personId);

    if (!jobId || isNaN(jobId) || !personId || isNaN(personId)) {
      res.status(400).json({ success: false, error: 'jobId and personId are required' });
      return;
    }

    const message = String(req.body?.message || '').trim();

    await query(
      `UPDATE employer_auto_matched_candidates
       SET selected_time_slot = NULL,
           time_slot_candidate = NULL,
           timeslot_process_candidate = 0,
           updated_at = NOW()
       WHERE job_id = $1 AND person_id = $2`,
      [jobId, personId]
    );

    // Email candidate to provide new availability (best-effort)
    try {
      const candRes = await query(`SELECT email, first_name, last_name FROM users WHERE id = $1 LIMIT 1`, [personId]);
      const candidateEmail = String(candRes.rows?.[0]?.email || '').trim();
      const candidateName =
        `${String(candRes.rows?.[0]?.first_name || '').trim()} ${String(candRes.rows?.[0]?.last_name || '').trim()}`
          .trim() || candidateEmail || `Candidate #${personId}`;

      if (candidateEmail) {
        // Do NOT query jobs.title (not present in local schema).
        const PUBLIC_BASE_URL =
          (process.env.PUBLIC_BASE_URL || '').trim() ||
          (process.env.FRONTEND_URL || '').trim() ||
          (process.env.PUBLIC_APP_URL || '').trim() ||
          (process.env.APP_URL || '').trim() ||
          (process.env.CLIENT_URL || '').trim() ||
          'https://ctnew.cardinaltalent.ai';

        const scheduleUrl = `${PUBLIC_BASE_URL}/human-interview/schedule/${jobId}/${personId}?new=1`;

        const subject = `Interview availability needed`;
        const bodyText =
          `Hi ${candidateName},\n\n` +
          (message ? `${message}\n\n` : `The interview time slot(s) you provided do not work for the hiring team.\n\n`) +
          `Please choose 3 new availability slots using this link:\n` +
          `${scheduleUrl}\n\n` +
          `Thanks,\nCardinalTalent`;

        const html = `
          <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 16px; line-height: 1.6; color:#111;">
            <p>Hi ${escapeHtml(candidateName)},</p>
            <p>${escapeHtml(
              message ||
                'The interview time slot(s) you provided do not work for the hiring team.'
            )}</p>
            <p>Please choose 3 new availability slots:</p>
            ${button(scheduleUrl, 'Book your slot')}
            <p style="font-size: 13px; color:#555;">If the button doesn't work, copy/paste this URL:</p>
            <p style="font-size: 13px; color:#555;">${escapeHtml(scheduleUrl)}</p>
            <p style="margin-top: 24px;">— CardinalTalent</p>
          </div>
        `;

        await sendEmailViaSES(candidateEmail, subject, html, EMAIL_FROM);
      }
    } catch (notifyErr) {
      console.error('Candidate request-new email failed (non-fatal):', notifyErr);
    }

    const r = await query(
      `SELECT *
       FROM employer_auto_matched_candidates
       WHERE job_id = $1 AND person_id = $2
       LIMIT 1`,
      [jobId, personId]
    );

    const row = r.rows?.[0] || null;
    if (!row) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }

    row.slot_times = String(row.time_slot_candidate || '')
      .split('*')
      .map((s: string) => s.trim())
      .filter(Boolean);

    res.json({ success: true, data: row });
  } catch (e: any) {
    console.error('POST /human-interview/public/employer/:jobId/:personId/request-new failed:', e);
    res.status(400).json({ success: false, error: e?.message || 'Failed to request new availability' });
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

export default router;
