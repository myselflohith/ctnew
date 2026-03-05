import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { query } from '../database/connection.js';

const router = Router();

/**
 * Talent profile endpoints.
 * - GET /api/profile -> returns the authenticated user's profile fields
 * - PUT /api/profile -> updates editable profile fields
 */

const USER_SELECT = `id, email, first_name, last_name, company_name, organization_id, role, email_verified,
                     phone_number, location, linkedin_profile_url, picture_url, remote_interest, salary_expectations, skills, created_at, updated_at`;

const toUserResponse = (row: any) => ({
  id: row.id?.toString?.() ?? String(row.id),
  email: row.email,
  first_name: row.first_name ?? null,
  last_name: row.last_name ?? null,
  company_name: row.company_name ?? null,
  organization_id: row.organization_id ?? null,
  // Role comes from DB as int in this project; keep what auth.service returns elsewhere.
  // For profile responses, frontend only needs fields; leave role as-is.
  role: row.role,
  email_verified: !!row.email_verified,
  phone_number: row.phone_number ?? null,
  location: row.location ?? null,
  linkedin_profile_url: row.linkedin_profile_url ?? null,
  picture_url:
    (row as any).picture_url == null
      ? null
      : typeof (row as any).picture_url === 'string'
        ? (row as any).picture_url
        : JSON.stringify((row as any).picture_url).replace(/^\"|\"$/g, ''),
  remote_interest: row.remote_interest ?? null,
  salary_expectations: row.salary_expectations ?? null,
  skills: Array.isArray(row.skills) ? row.skills : [],
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// GET /api/profile
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const result = await query(`SELECT ${USER_SELECT} FROM users WHERE id = $1`, [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({ success: true, user: toUserResponse(result.rows[0]) });
  } catch (e) {
    console.error('GET /profile failed:', e);
    return res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

// PUT /api/profile
router.put('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const {
      first_name,
      last_name,
      phone_number,
      location,
      linkedin_profile_url,
      picture_url,
      remote_interest,
      salary_expectations,
      skills,
    } = req.body ?? {};

    // `users.picture_url` is JSON in this DB. Store URL as JSON string.
    const pictureUrlJson =
      picture_url === undefined ? undefined : picture_url === null ? null : JSON.stringify(picture_url);

    const nextSkills =
      Array.isArray(skills) ? skills.map((s: any) => String(s).trim()).filter(Boolean) : null;

    const nextRemoteInterest =
      remote_interest === undefined || remote_interest === null
        ? null
        : remote_interest === true ||
            remote_interest === 'true' ||
            remote_interest === 'remote' ||
            remote_interest === 'remote_only'
          ? 'remote'
          : 'any';

    // IMPORTANT:
    // If a field is omitted (undefined) we must keep existing.
    // If a field is explicitly set to null, we clear it.
    //
    // In Postgres, passing `undefined` from JS turns into SQL NULL for a placeholder,
    // so we must use explicit "is provided" booleans to distinguish omitted vs null.
    const hasPhone = phone_number !== undefined;
    const hasLocation = location !== undefined;
    const hasLinkedIn = linkedin_profile_url !== undefined;
    const hasPicture = picture_url !== undefined;
    const hasSalary = salary_expectations !== undefined;

    const updated = await query(
      `UPDATE users
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),

           phone_number = CASE
             WHEN $4::boolean IS FALSE THEN phone_number
             WHEN $5::text IS NULL THEN NULL
             ELSE $5
           END,
           location = CASE
             WHEN $6::boolean IS FALSE THEN location
             WHEN $7::text IS NULL THEN NULL
             ELSE $7
           END,
           linkedin_profile_url = CASE
             WHEN $8::boolean IS FALSE THEN linkedin_profile_url
             WHEN $9::text IS NULL THEN NULL
             ELSE $9
           END,
           picture_url = CASE
             WHEN $10::boolean IS FALSE THEN picture_url
             WHEN $11::json IS NULL THEN NULL
             ELSE $11::json
           END,
           remote_interest = COALESCE($12, remote_interest),
           salary_expectations = CASE
             WHEN $13::boolean IS FALSE THEN salary_expectations
             WHEN $14::text IS NULL THEN NULL
             ELSE $14
           END,

           skills = COALESCE($15, skills),
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${USER_SELECT}`,
      [
        req.user.id,
        first_name ?? null,
        last_name ?? null,

        hasPhone,
        hasPhone ? phone_number : null,

        hasLocation,
        hasLocation ? location : null,

        hasLinkedIn,
        hasLinkedIn ? linkedin_profile_url : null,

        hasPicture,
        hasPicture ? pictureUrlJson : null,

        nextRemoteInterest,

        hasSalary,
        hasSalary ? salary_expectations : null,

        nextSkills,
      ]
    );

    return res.json({ success: true, user: toUserResponse(updated.rows[0]) });
  } catch (e) {
    console.error('PUT /profile failed:', e);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

export default router;
