import crypto from 'crypto';
import pool from '../database/connection.js';
import { sendEmailViaSES } from './email.service.js';
import { query } from '../database/connection.js';

export type HumanInterviewStatus =
  | 'requested'
  | 'candidate_submitted'
  | 'confirmed'
  | 'rejected'
  | 'cancelled';

export type CreateHumanInterviewRequestInput = {
  employerUserId: number;
  jobId?: number | null;
  candidateUserId?: number | null;
  candidateName: string;
  candidateEmail: string;
  messageSubject?: string;
  messageBody?: string;
};

export type CandidateSlotInput = {
  start: string; // ISO
  end: string; // ISO
  timeZone?: string;
};

const PUBLIC_BASE_URL =
  // Public schedule/manage pages are FRONTEND routes, not server routes.
  // So they must use the frontend base URL (not the API host).
  (process.env.PUBLIC_BASE_URL || '').trim() ||
  (process.env.FRONTEND_URL || '').trim() ||
  (process.env.PUBLIC_APP_URL || '').trim() ||
  (process.env.APP_URL || '').trim() ||
  (process.env.CLIENT_URL || '').trim() ||
  'https://ctnew.cardinaltalent.ai';

function randomToken(prefix: 'hir_cand' | 'hir_emp') {
  return `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
}

function normalizeEmail(email: string) {
  return (email || '').toString().trim().toLowerCase();
}

/**
 * NOTE: This service is now legacy.
 *
 * Slot booking is Rails-compatible and stored directly on `employer_auto_matched_candidates`
 * using `(job_id, person_id)` (see `server/routes/human-interview.routes.ts`).
 *
 * The previous ctnew-specific tables (`human_interview_requests`, `human_interview_time_slots`)
 * are no longer required for the slot booking flow.
 */
export async function createHumanInterviewRequest(input: CreateHumanInterviewRequestInput) {
  const candidateEmail = normalizeEmail(input.candidateEmail);
  if (!candidateEmail) throw new Error('candidateEmail is required');
  if (!input.candidateName?.trim()) throw new Error('candidateName is required');

  const candidateToken = randomToken('hir_cand');
  const employerToken = randomToken('hir_emp');

  // Guard against FK violations (human_interview_requests.job_id -> ct_job.id).
  // If caller passes an invalid jobId, treat it as "no job selected" instead of failing the whole request.
  let safeJobId: number | null = input.jobId ? Number(input.jobId) : null;
  if (!safeJobId || Number.isNaN(safeJobId)) {
    safeJobId = null;
  } else {
    const jobExists = await pool.query(`SELECT 1 FROM ct_job WHERE id = $1`, [safeJobId]);
    if (!jobExists.rows?.length) safeJobId = null;
  }

  const inserted = await pool.query(
    `INSERT INTO human_interview_requests
     (employer_user_id, candidate_user_id, candidate_name, candidate_email, job_id,
      status, message_subject, message_body, candidate_token, employer_token, requested_at, created_at, updated_at)
     VALUES
     ($1, $2, $3, $4, $5,
      'requested', NULLIF($6,''), NULLIF($7,''), $8, $9, NOW(), NOW(), NOW())
     RETURNING *`,
    [
      input.employerUserId,
      input.candidateUserId || null,
      input.candidateName.trim(),
      candidateEmail,
      safeJobId,
      (input.messageSubject || '').trim(),
      (input.messageBody || '').trim(),
      candidateToken,
      employerToken,
    ]
  );

  return inserted.rows[0];
}

export async function getHumanInterviewRequestByCandidateToken(candidateToken: string) {
  const res = await pool.query(
    `SELECT hir.*,
            COALESCE(hir.time_slot_candidate, '') as time_slot_candidate,
            COALESCE(hir.selected_time_slot, '') as selected_time_slot
     FROM human_interview_requests hir
     WHERE hir.candidate_token = $1`,
    [candidateToken]
  );

  const row = res.rows[0] || null;
  if (!row) return null;

  // ch-job-marketplace-compatible helper for UI rendering (optional)
  row.slot_times = String(row.time_slot_candidate || '')
    .split('*')
    .map((s: string) => s.trim())
    .filter(Boolean);

  return row;
}

export async function getHumanInterviewRequestByEmployerToken(employerToken: string) {
  const res = await pool.query(
    `SELECT hir.*,
            COALESCE(hir.time_slot_candidate, '') as time_slot_candidate,
            COALESCE(hir.selected_time_slot, '') as selected_time_slot
     FROM human_interview_requests hir
     WHERE hir.employer_token = $1`,
    [employerToken]
  );

  const row = res.rows[0] || null;
  if (!row) return null;

  row.slot_times = String(row.time_slot_candidate || '')
    .split('*')
    .map((s: string) => s.trim())
    .filter(Boolean);

  return row;
}

export async function submitCandidateAvailability(params: {
  candidateToken: string;
  slots: CandidateSlotInput[];
  candidateTimeZone?: string;
}) {
  const reqRow = await pool.query(
    `SELECT * FROM human_interview_requests WHERE candidate_token = $1`,
    [params.candidateToken]
  );
  const request = reqRow.rows[0];
  if (!request) throw new Error('Invalid link');

  if (request.status === 'cancelled') throw new Error('This request was cancelled');
  if (request.status === 'confirmed') throw new Error('This interview is already confirmed');

  const slots = (params.slots || [])
    .filter((s) => s?.start && s?.end)
    .slice(0, 10);

  if (slots.length === 0) throw new Error('At least one slot is required');
  if (slots.length > 3) throw new Error('Maximum 3 slots allowed');

  const candidateTimeZone = (params.candidateTimeZone || '').trim() || null;

  // Convert ISO to legacy "date~start~end~tz" format (ch-job-marketplace style)
  // We encode in UTC times (from ISO) and keep tz label for display.
  const encoded = slots
    .slice(0, 3)
    .map((s) => encodeLegacySlot(s.start, s.end, (s.timeZone || candidateTimeZone || 'UTC') as string))
    .join('*');

  // IMPORTANT:
  // ch-job-marketplace stores slot booking fields on employer_auto_matched_candidates / person_applied_job_matched_candidates.
  // ctnew "human interview" flow stores them on human_interview_requests instead.
  // To let you point ch-job-marketplace at the same DB (autopilot only), we also mirror the slot fields onto
  // employer_auto_matched_candidates when we can identify the record (by job_id + person_id).
  await pool.query(
    `UPDATE human_interview_requests
     SET status = 'candidate_submitted',
         candidate_submitted_at = NOW(),
         candidate_slots_json = $2::jsonb,
         time_slot_candidate = NULLIF($3,''),
         selected_time_slot = NULL,
         timeslot_process_candidate = 1,
         timeslot_process_at = NOW(),
         timeslot_sent_at = NOW(),
         candidate_time_zone = NULLIF($4,''),
         updated_at = NOW()
     WHERE id = $1`,
    [
      request.id,
      JSON.stringify({ slots, candidateTimeZone: candidateTimeZone || null }),
      encoded,
      candidateTimeZone || '',
    ]
  );

  // Mirror to employer_auto_matched_candidates (best-effort)
  try {
    if (request.job_id && request.candidate_user_id) {
      await pool.query(
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
        [Number(request.job_id), Number(request.candidate_user_id), encoded]
      );
    }
  } catch (e) {
    console.warn('Failed to mirror slot fields to employer_auto_matched_candidates:', e);
  }

  // Notify employer that candidate submitted availability.
  // If we can’t resolve employer email, we still succeed (email is best-effort).
  try {
    const employerRes = await query('SELECT email FROM users WHERE id = $1', [request.employer_user_id]);
    const employerEmail = String(employerRes.rows?.[0]?.email || '').trim();

    if (employerEmail) {
      const employerManageUrl = `${PUBLIC_BASE_URL}/human-interview/manage/${request.employer_token}`;
      const subject = `Candidate availability received${request.candidate_name ? ` - ${request.candidate_name}` : ''}`;

      const html = `
        <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 16px; line-height: 1.6; color:#111;">
          <p>Hi,</p>
          <p>${escapeHtml(request.candidate_name || 'The candidate')} has submitted availability slots.</p>
          <p>Please review and book a slot:</p>
          <div style="text-align:center; margin: 24px 0;">
            <a href="${employerManageUrl}"
               style="display:inline-block; background-color: hsl(38 92% 50%); color:#000000; padding: 14px 22px;
                      border-radius: 10px; text-decoration:none; font-weight:700; font-size: 15px;">
              Review and Book slot
            </a>
          </div>
          <p style="font-size: 13px; color:#555;">If the button doesn't work, copy/paste this URL:</p>
          <p style="font-size: 13px; color:#555;">${escapeHtml(employerManageUrl)}</p>
          <p style="margin-top: 24px;">— CardinalTalent</p>
        </div>
      `;

      await sendEmailViaSES(employerEmail, subject, html, 'cardin@cardinaltalent.ai');
    }
  } catch (e) {
    console.warn('Failed to send employer notification email (candidate_submitted):', e);
  }

  return getHumanInterviewRequestByCandidateToken(params.candidateToken);
}

export async function employerConfirmSlot(params: {
  employerToken: string;
  // legacy:
  time_slot?: string;
  // backward-compat (old ctnew):
  slotId?: number;
}) {
  const reqRes = await pool.query(`SELECT * FROM human_interview_requests WHERE employer_token = $1`, [params.employerToken]);
  const request = reqRes.rows[0];
  if (!request) throw new Error('Invalid link');

  if (request.status === 'cancelled') throw new Error('This request was cancelled');

  let selectedTimeSlot = (params.time_slot || '').toString().trim();

  // Backward compatibility: if frontend still posts slotId, attempt to map it.
  // (We no longer use this table going forward; this is only for in-flight deploys.)
  if (!selectedTimeSlot && params.slotId) {
    try {
      const slotRes = await pool.query(
        `SELECT * FROM human_interview_time_slots WHERE id = $1 AND human_interview_request_id = $2`,
        [Number(params.slotId), request.id]
      );
      const slot = slotRes.rows[0];
      if (slot?.slot_start && slot?.slot_end) {
        selectedTimeSlot = encodeLegacySlot(
          new Date(slot.slot_start).toISOString(),
          new Date(slot.slot_end).toISOString(),
          String(slot.time_zone || request.candidate_time_zone || 'UTC')
        );
      }
    } catch {
      // ignore
    }
  }

  if (!selectedTimeSlot) throw new Error('time_slot is required');

  const candidates = String(request.time_slot_candidate || '')
    .split('*')
    .map((s) => s.trim())
    .filter(Boolean);

  if (candidates.length === 0) throw new Error('Candidate has not submitted availability yet');
  if (!candidates.includes(selectedTimeSlot)) throw new Error('Selected slot is not in candidate availability');

  await pool.query(
    `UPDATE human_interview_requests
     SET status = 'confirmed',
         selected_time_slot = $2,
         confirmed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [request.id, selectedTimeSlot]
  );

  // Mirror confirmed slot to employer_auto_matched_candidates (best-effort)
  try {
    if (request.job_id && request.candidate_user_id) {
      await pool.query(
        `UPDATE employer_auto_matched_candidates
         SET selected_time_slot = $3,
             timeslot_process_candidate = 1,
             updated_at = NOW()
         WHERE job_id = $1 AND person_id = $2`,
        [Number(request.job_id), Number(request.candidate_user_id), selectedTimeSlot]
      );
    }
  } catch (e) {
    console.warn('Failed to mirror confirmed slot to employer_auto_matched_candidates:', e);
  }

  // Optional: notify candidate (best-effort).
  try {
    const candidateEmail = String(request.candidate_email || '').trim();
    if (candidateEmail) {
      const subject = `Interview confirmed`;
      const bodyText =
        `Hi ${request.candidate_name || ''},\n\n` +
        `Your interview time has been confirmed.\n\n` +
        `${selectedTimeSlot}\n\n` +
        `Thanks,\nCardinalTalent`;

      const html = bodyText
        .split('\n')
        .map((l) => l.trim())
        .map((l) => (l ? `<p>${linkifyUrls(escapeHtml(l))}</p>` : '<br/>'))
        .join('');

      await sendEmailViaSES(candidateEmail, subject, html, 'cardin@cardinaltalent.ai');
    }
  } catch (e) {
    console.warn('Failed to send candidate confirmation email (confirmed):', e);
  }

  return getHumanInterviewRequestByEmployerToken(params.employerToken);
}

export async function employerRequestNewAvailability(params: { employerToken: string; message?: string }) {
  const reqRes = await pool.query(`SELECT * FROM human_interview_requests WHERE employer_token = $1`, [params.employerToken]);
  const request = reqRes.rows[0];
  if (!request) throw new Error('Invalid link');

  if (request.status === 'cancelled') throw new Error('This request was cancelled');
  if (request.status === 'confirmed') throw new Error('This interview is already confirmed');

  await pool.query(
    `UPDATE human_interview_requests
     SET status = 'rejected',
         rejected_at = NOW(),
         time_slot_candidate = NULL,
         selected_time_slot = NULL,
         timeslot_process_candidate = 0,
         updated_at = NOW()
     WHERE id = $1`,
    [request.id]
  );

  // Email candidate to provide new availability
  // NOTE: legacy token-based link; route no longer exists. Keep placeholder to avoid broken emails.
  // If you still use this legacy flow, migrate it to jobId/personId first.
  const scheduleUrl = `${PUBLIC_BASE_URL}/human-interview/schedule/0/0?new=1`;

  const subject = `Interview availability needed`;
  const bodyDefault =
    `The interview time slot(s) you provided do not work for the hiring team.\n\n` +
    `Please choose another slot again using this link:\n` +
    `${scheduleUrl}`;

  // Always include the schedule link even if a custom message is provided (avoid forgetting the link).
  const bodyText = (() => {
    const custom = (params.message || "").trim();
    if (!custom) return bodyDefault;

    const hasLink = custom.includes(scheduleUrl) || /https?:\/\/\S+/i.test(custom);
    return hasLink ? custom : `${custom}\n\n${scheduleUrl}`;
  })();

  const html = bodyText
    .split('\n')
    .map((l) => l.trim())
    .map((l) => (l ? `<p>${linkifyUrls(escapeHtml(l))}</p>` : '<br/>'))
    .join('');

  await sendEmailViaSES(request.candidate_email, subject, html, 'cardin@cardinaltalent.ai');

  return getHumanInterviewRequestByEmployerToken(params.employerToken);
}

export async function sendHumanInterviewRequestEmails(params: {
  requestId: number;
  employerName: string;
  employerReplyTo?: string;
}) {
  const reqRes = await pool.query(
    `SELECT hir.*,
            j.title as job_title,
            j.company as job_company
     FROM human_interview_requests hir
     LEFT JOIN ct_job j ON hir.job_id = j.id
     WHERE hir.id = $1`,
    [params.requestId]
  );
  const request = reqRes.rows[0];
  if (!request) throw new Error('Request not found');

  // NOTE: legacy token-based links; routes no longer exist.
  // If you still use this legacy flow, migrate it to jobId/personId first.
  const scheduleUrl = `${PUBLIC_BASE_URL}/human-interview/schedule/0/0`;
  const employerManageUrl = `${PUBLIC_BASE_URL}/human-interview/manage/0/0`;

  const subject =
    (request.message_subject || '').toString().trim() ||
    `Interview availability request${request.job_title ? ` - ${request.job_title}` : ''}`;

  const bodyDefault =
    `Hi ${request.candidate_name},\n\n` +
    `${params.employerName} would like to schedule an interview${request.job_title ? ` for the ${request.job_title} role` : ''}.\n` +
    `Please provide 3 availability slots using the link below:\n` +
    `${scheduleUrl}\n\n` +
    `Thanks,\nCardinalTalent`;

  const bodyText = (request.message_body || '').toString().trim() || bodyDefault;

  const html = bodyText
    .split('\n')
    .map((l: string) => l.trim())
    .map((l: string) => (l ? `<p>${linkifyUrls(escapeHtml(l))}</p>` : '<br/>'))
    .join('');

  await sendEmailViaSES(request.candidate_email, subject, html, 'cardin@cardinaltalent.ai', {
    fromDisplayName: params.employerName,
    replyTo: params.employerReplyTo,
  });

  // Send employer an internal link (optional but useful)
  const employerHtml = [
    `<p>Human interview request created for <b>${escapeHtml(request.candidate_name)}</b> (${escapeHtml(
      request.candidate_email
    )}).</p>`,
    `<p>Employer manage link:</p>`,
    `<p><a href="${employerManageUrl}">${employerManageUrl}</a></p>`,
    `<p>Candidate schedule link:</p>`,
    `<p><a href="${scheduleUrl}">${scheduleUrl}</a></p>`,
  ].join('\n');

  // If employer email isn't available here, skip. (Callers can pass employer email and send separately if desired.)
  // We'll return links so caller can display in UI.
  return { scheduleUrl, employerManageUrl, subject };
}

function escapeHtml(input: string): string {
  return (input || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

function linkifyUrls(text: string): string {
  const input = (text || '').toString();
  // Basic URL linkify for http(s) links (safe enough for our own generated links).
  return input.replace(/(https?:\/\/[^\s<]+[^\s<\.)])/g, (m) => `<a href="${m}">${m}</a>`);
}

function encodeLegacySlot(startIso: string, endIso: string, timeZone: string) {
  // Format matches legacy: date~start~end~tz
  // We keep it simple: date = YYYY-MM-DD from start, times = HH:mm from ISO (UTC).
  const start = new Date(startIso);
  const end = new Date(endIso);

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

  return `${date}~${startTime}~${endTime}~${(timeZone || 'UTC').trim() || 'UTC'}`;
}
