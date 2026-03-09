import { query } from '../database/connection.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload directory for resumes
const UPLOAD_DIR = path.join(__dirname, '../../uploads/resumes');
const execFileAsync = promisify(execFile);

// Ensure upload directory exists
export async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log('✅ Created uploads directory:', UPLOAD_DIR);
  }
}

export interface Resume {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

async function extractSkillsViaDatasort(fullPath: string): Promise<string[]> {
  const datasortApi = (process.env.DATASORT_API || '').trim().replace(/\/$/, '');
  const token = (process.env.DATASORT_API_TOKEN || '').trim();

  if (!datasortApi || !token) {
    throw new Error('DATASORT_API / DATASORT_API_TOKEN not configured');
  }

  const buf = await fs.readFile(fullPath);

  // Datasort expects field name `pdf` (per ch-job-marketplace) and accepts pdf/doc/docx
  const form = new FormData();
  const fileName = path.basename(fullPath);

  // Node 18+ has Blob; convert Buffer -> Uint8Array for BlobPart typing
  const bytes = new Uint8Array(buf);
  form.append('pdf', new Blob([bytes]), fileName);

  // Add a timeout so a stuck external parser doesn't hang requests indefinitely.
  const controller = new AbortController();
  const timeoutMs = Number(process.env.DATASORT_TIMEOUT_MS || 20000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${datasortApi}/upload_resume`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
      },
      body: form as any,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`DATASORT upload_resume failed: ${response.status} ${text}`);
  }

  const data: any = await response.json().catch(() => ({}));
  const skills = Array.isArray(data?.skills) ? data.skills : [];

  // Datasort sometimes collapses "C++" into "C".
  // Preserve explicit "C++" if it appears anywhere in the parsed resume payload.
  const rawText =
    typeof data?.text === 'string'
      ? data.text
      : typeof data?.resume_text === 'string'
        ? data.resume_text
        : typeof data?.raw_text === 'string'
          ? data.raw_text
          : '';

  const normalized = skills
    .map((s: any) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);

  const hasCppInText = /\bC\+\+\b/i.test(rawText);
  const hasCInSkills = normalized.some((s: string) => /^c$/i.test(s));
  const hasCppAlready = normalized.some((s: string) => /^c\+\+$/i.test(s));

  if (hasCppInText && hasCInSkills && !hasCppAlready) {
    // Replace plain C with C++ since resume explicitly mentions C++
    return normalized.map((s: string) => (/^c$/i.test(s) ? 'C++' : s));
  }

  return normalized;
}

async function extractTextFromResume(fullPath: string): Promise<string> {
  const ext = path.extname(fullPath).toLowerCase();

  // IMPORTANT:
  // In this environment, `pdftotext` may NOT be installed (poppler-utils missing).
  // When it's missing, falling back to binary snippets yields poor OpenAI results.
  //
  // Legacy app uses DATASORT /upload_resume for parsing. We'll prefer that for skills,
  // and only do local text extraction when a tool is available.
  if (ext === '.pdf') {
    try {
      const tmpOut = path.join(os.tmpdir(), `ct-resume-${Date.now()}.txt`);
      await execFileAsync('pdftotext', ['-layout', fullPath, tmpOut]);
      const txt = await fs.readFile(tmpOut, 'utf8').catch(() => '');
      return txt || '';
    } catch {
      // pdftotext not available or failed
      return '';
    }
  }

  // DOC/DOCX: no reliable local extractor in this repo right now
  return '';
}

async function extractSkillsViaOpenAI(fullPath: string): Promise<string[]> {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const extractedText = await extractTextFromResume(fullPath);

  // If we can extract real text (best), use it.
  // Otherwise fall back to a binary snippet (lower quality).
  let resumeContent = extractedText.trim();
  if (!resumeContent) {
    const buf = await fs.readFile(fullPath);
    resumeContent = buf.toString('latin1', 0, Math.min(buf.length, 200_000));
  }

  const prompt = `You are extracting skills from a resume.
Return ONLY valid JSON in this exact shape:
{ "skills": ["Skill 1", "Skill 2", "..."] }

Rules (STRICT):
- Extract ONLY skills explicitly present in the resume text (do NOT infer/guess).
- Keep original wording as in the resume where possible (but trim whitespace).
- Preserve special characters in skill names EXACTLY (e.g., "C++" must stay "C++", "C#" must stay "C#". Never convert them to "C" or "C sharp".)
- Deduplicate.
- Do NOT include generic placeholders like "communication", "teamwork", "english" unless explicitly listed as a skill in a skills section.
- If the resume content is garbled or unreadable, return an empty list.

Resume filename: ${path.basename(fullPath)}

Resume content:
${resumeContent}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Extract skills that are explicitly present in the resume text. Output JSON only. No inference.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI skills extraction failed: ${response.status} ${text}`);
  }

  const data: any = await response.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content;
  let parsed: any = null;
  try {
    parsed = content ? JSON.parse(content) : null;
  } catch {
    parsed = null;
  }

  const skills = Array.isArray(parsed?.skills) ? parsed.skills : [];
  return skills.map((s: any) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
}

export type ResumeExtractedProfile = {
  phone_number?: string | null;
  location?: string | null;
  linkedin_profile_url?: string | null;
};

async function normalizeLocation(city?: any, state?: any, location?: any): Promise<string | null> {
  const direct = typeof location === 'string' ? location.trim() : '';
  if (direct) return direct;

  const c = typeof city === 'string' ? city.trim() : '';
  const s = typeof state === 'string' ? state.trim() : '';

  if (c && s) return `${c}, ${s}`;
  if (c) return c;
  return null;
}

function normalizeLinkedIn(url: any): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Accept linkedin.com/in/... etc. Normalize protocol.
  const hasProtocol = /^https?:\/\//i.test(trimmed);
  const normalized = hasProtocol ? trimmed : `https://${trimmed}`;
  if (!/linkedin\.com/i.test(normalized)) return null;
  return normalized;
}

export async function extractProfileFromResumeFilePath(filePath: string): Promise<ResumeExtractedProfile> {
  const fullPath = path.join(UPLOAD_DIR, path.basename(filePath));

  // Prefer DATASORT when configured
  try {
    const datasortApi = (process.env.DATASORT_API || '').trim().replace(/\/$/, '');
    const token = (process.env.DATASORT_API_TOKEN || '').trim();

    if (datasortApi && token) {
      const buf = await fs.readFile(fullPath);
      const form = new FormData();
      const fileName = path.basename(fullPath);
      const bytes = new Uint8Array(buf);
      form.append('pdf', new Blob([bytes]), fileName);

      const response = await fetch(`${datasortApi}/upload_resume`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: form as any,
      });

      if (response.ok) {
        const data: any = await response.json().catch(() => ({}));
        return {
          phone_number:
            typeof data?.phone_number === 'string'
              ? data.phone_number.trim()
              : typeof data?.phone_number === 'string'
                ? data.phone_number.trim()
                : typeof data?.contact_num === 'string'
                  ? data.contact_num.trim()
                  : null,
          location: await normalizeLocation(data?.city, data?.state, data?.location),
          linkedin_profile_url: normalizeLinkedIn(
            data?.linkedin_profile_url ?? data?.linkedin ?? data?.linkedin_url
          ),
        };
      }
    }
  } catch {
    // ignore and fall back to OpenAI
  }

  // Fallback: OpenAI (use extracted text/snippet logic already present)
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return {};

  const extractedText = await extractTextFromResume(fullPath);
  let resumeContent = extractedText.trim();
  if (!resumeContent) {
    const buf = await fs.readFile(fullPath);
    resumeContent = buf.toString('latin1', 0, Math.min(buf.length, 200_000));
  }

  const prompt = `Extract the candidate's phone_number, location, and LinkedIn from this resume.
Return ONLY valid JSON in this exact shape:
{ "phone_number": "string" | null, "location": "City, ST" | null, "linkedin_profile_url": "https://linkedin.com/in/..." | null }

Rules:
- phone_number must be a single string like "+1 (555) 555-5555" if found; else null.
- location must be a single string like "San Francisco, CA" if found; else null.
- linkedin_profile_url must be a full URL if found; else null.

Resume content:
${resumeContent}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You extract structured fields from resumes and respond with JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) return {};

  const data: any = await response.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content;
  let parsed: any = null;
  try {
    parsed = content ? JSON.parse(content) : null;
  } catch {
    parsed = null;
  }

  return {
    phone_number: typeof parsed?.phone_number === 'string' ? parsed.phone_number.trim() : null,
    location: typeof parsed?.location === 'string' ? parsed.location.trim() : null,
    linkedin_profile_url: normalizeLinkedIn(parsed?.linkedin_profile_url),
  };
}

export async function extractSkillsFromResumeFilePath(filePath: string): Promise<string[]> {
  const fullPath = path.join(UPLOAD_DIR, path.basename(filePath));

  // Prefer DATASORT when configured.
  // If DATASORT is not configured OR is unreachable/times out, fall back to OpenAI (best-effort)
  // so local/dev environments can still use "Extract Skills".
  try {
    return await extractSkillsViaDatasort(fullPath);
  } catch (err: any) {
    const msg = String(err?.message || err);
    const causeMsg = String(err?.cause?.message || err?.cause || '');
    const causeCode = String(err?.cause?.code || '');
    const isConfigMissing = msg.includes('DATASORT_API / DATASORT_API_TOKEN not configured');

    const combined = `${msg} ${causeMsg} ${causeCode}`.toLowerCase();
    const isTimeout =
      combined.includes('und_err_connect_timeout') ||
      combined.includes('connect timeout') ||
      combined.includes('timed out') ||
      combined.includes('timeout') ||
      combined.includes('aborted');

    if (isConfigMissing || isTimeout) {
      return await extractSkillsViaOpenAI(fullPath);
    }

    throw err;
  }
}

export async function getResumeSkillsById(userId: string, resumeId?: string): Promise<string[] | null> {
  // fetch resume row (default or specific)
  let resume: Resume | null = null;

  if (resumeId) {
    resume = await getResume(resumeId, userId);
  } else {
    const result = await query(
      'SELECT * FROM resumes WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC LIMIT 1',
      [userId]
    );
    resume = result.rows.length ? (result.rows[0] as Resume) : null;
  }

  if (!resume) return null;
  return await extractSkillsFromResumeFilePath(resume.file_path);
}

// Get all resumes for a user
export async function getUserResumes(userId: string): Promise<Resume[]> {
  const result = await query(
    'SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

// Get a single resume
export async function getResume(resumeId: string, userId: string): Promise<Resume | null> {
  const result = await query(
    'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
    [resumeId, userId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Create a new resume record
export async function createResume(
  userId: string,
  fileName: string,
  filePath: string,
  fileSize: number
): Promise<Resume> {
  // Check if this is the first resume for the user
  const existingResumes = await query(
    'SELECT COUNT(*) as count FROM resumes WHERE user_id = $1',
    [userId]
  );
  const isFirst = parseInt(existingResumes.rows[0].count) === 0;

  const result = await query(
    `INSERT INTO resumes (user_id, name, file_path, file_size, is_default)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, fileName, filePath, fileSize, isFirst]
  );

  return result.rows[0];
}

// Set default resume
export async function setDefaultResume(resumeId: string, userId: string): Promise<void> {
  // First, unset all defaults for this user
  await query(
    'UPDATE resumes SET is_default = false WHERE user_id = $1',
    [userId]
  );

  // Then set the new default
  await query(
    'UPDATE resumes SET is_default = true WHERE id = $1 AND user_id = $2',
    [resumeId, userId]
  );
}

// Delete a resume
export async function deleteResume(resumeId: string, userId: string): Promise<boolean> {
  const resume = await getResume(resumeId, userId);
  if (!resume) {
    return false;
  }

  // Delete file from filesystem
  const fullPath = path.join(UPLOAD_DIR, path.basename(resume.file_path));
  try {
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Continue with database deletion even if file deletion fails
  }

  // Delete from database
  await query('DELETE FROM resumes WHERE id = $1 AND user_id = $2', [resumeId, userId]);

  return true;
}

// Get file path for download
export function getResumeFilePath(fileName: string): string {
  return path.join(UPLOAD_DIR, fileName);
}

/**
 * Call RESUME_PARSER_API /upload_resume (same endpoint as ch-job-marketplace).
 * Returns the raw parsed JSON from the parser for e.g. console logging in the talent profile.
 * Accepts either a file path (reads from disk) or a buffer + fileName (e.g. from multer.memoryStorage).
 */
export async function parseResumeWithParserApi(
  filePathOrBuffer: string | Buffer,
  fileName?: string
): Promise<Record<string, unknown>> {
  const apiUrl = (process.env.RESUME_PARSER_API || '').trim().replace(/\/$/, '');
  if (!apiUrl) {
    throw new Error('RESUME_PARSER_API is not configured');
  }

  let buf: Buffer;
  let name: string;
  if (Buffer.isBuffer(filePathOrBuffer)) {
    buf = filePathOrBuffer;
    name = fileName || 'resume.pdf';
  } else {
    const fullPath = path.isAbsolute(filePathOrBuffer)
      ? filePathOrBuffer
      : path.join(UPLOAD_DIR, path.basename(filePathOrBuffer));
    buf = await fs.readFile(fullPath);
    name = path.basename(filePathOrBuffer);
  }

  const form = new FormData();
  const bytes = new Uint8Array(buf);
  form.append('pdf', new Blob([bytes]), name);

  const controller = new AbortController();
  const timeoutMs = Number(process.env.RESUME_PARSER_TIMEOUT_MS || 30000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/upload_resume`, {
      method: 'POST',
      body: form as any,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Resume parser API failed: ${response.status} ${text}`);
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

/**
 * Call RESUME_SCORE_API /rank (same as ch-job-marketplace get_rank_score_data).
 * Rails sends only: [{ id: string, url: string, resume_text: string }].
 * Do not send the full parsed resume object — the rank API expects this shape only.
 */
export async function callResumeScoreApi(parsedResumeData: Record<string, unknown>): Promise<Record<string, unknown>> {
  const apiUrl = (process.env.RESUME_SCORE_API || '').trim();
  if (!apiUrl) {
    throw new Error('RESUME_SCORE_API is not configured');
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.RESUME_SCORE_TIMEOUT_MS || 30000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Match Rails payload: array of { id, url, resume_text } only (see users/registrations_controller, job_matching_process_controller)
  const summary = typeof parsedResumeData.summary === 'string' ? parsedResumeData.summary : '';
  const skills = Array.isArray(parsedResumeData.skills)
    ? (parsedResumeData.skills as string[]).join(', ')
    : '';
  const resumeText = [summary, skills].filter(Boolean).join('\n').trim() || '';

  const body = [
    {
      id: '1',
      url: '',
      resume_text: resumeText,
    },
  ];

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  if (!response.ok) {
    if (response.status >= 500) {
      console.error('[callResumeScoreApi] Rank API 5xx response:', response.status, text.slice(0, 500));
    }
    throw new Error(`Resume score API failed: ${response.status} ${text}`);
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

/**
 * Get or create a people row for the user (Rails: person is the candidate profile; we link via users.person_id).
 * Returns the person id so we can store rank scores on people.
 */
export async function getOrCreatePersonForUser(userId: number): Promise<number> {
  const existing = await query(
    'SELECT person_id FROM users WHERE id = $1',
    [userId]
  );
  const personId = existing.rows?.[0]?.person_id;
  if (personId != null) {
    return Number(personId);
  }
  const insert = await query(
    `INSERT INTO people (user_id, email_address, created_at, updated_at)
     SELECT id, email, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM users WHERE id = $1
     RETURNING id`,
    [userId]
  );
  const newId = insert.rows?.[0]?.id;
  if (newId == null) throw new Error('Failed to create person for user');
  await query('UPDATE users SET person_id = $1 WHERE id = $2', [newId, userId]);
  return Number(newId);
}

/** Rank API response result item (one element of results array). */
interface RankResultItem {
  id?: string;
  score?: number;
  score_edu?: number;
  score_company?: number;
  highest_ranking_school?: string | null;
  highest_ranking_company?: string | null;
  latest_company?: string | null;
  latest_school?: string | null;
}

/**
 * Update people row with rank/score fields from RESUME_SCORE_API response (same as Rails users/registrations_controller).
 */
export async function updatePersonRankFromApi(
  personId: number,
  rankApiResult: Record<string, unknown>
): Promise<void> {
  const results = rankApiResult.results as RankResultItem[] | undefined;
  const res = Array.isArray(results) && results.length > 0 ? results[0] : null;
  if (!res) return;

  const rankScore = res.score != null ? Number(res.score) : null;
  const scoreEdu = res.score_edu != null ? Number(res.score_edu) : null;
  const scoreCompany = res.score_company != null ? Number(res.score_company) : null;
  const highestSchool = res.highest_ranking_school != null && String(res.highest_ranking_school).trim() !== ''
    ? String(res.highest_ranking_school).trim()
    : null;
  const highestCompany = res.highest_ranking_company != null && String(res.highest_ranking_company).trim() !== ''
    ? String(res.highest_ranking_company).trim()
    : null;
  const companyRanked = highestCompany ? 'Yes' : 'No';
  const schoolRanked = highestSchool ? 'Yes' : 'No';
  const latestCompany = res.latest_company != null && String(res.latest_company).trim() !== ''
    ? String(res.latest_company).trim()
    : null;
  const latestSchool = res.latest_school != null && String(res.latest_school).trim() !== ''
    ? String(res.latest_school).trim()
    : null;

  await query(
    `UPDATE people SET
       rank_score = $2,
       score_edu = $3,
       score_company = $4,
       highest_school = $5,
       highest_company = $6,
       company_ranked = $7,
       school_ranked = $8,
       latest_company = $9,
       latest_school = $10,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [
      personId,
      rankScore,
      scoreEdu,
      scoreCompany,
      highestSchool,
      highestCompany,
      companyRanked,
      schoolRanked,
      latestCompany,
      latestSchool,
    ]
  );
}

/**
 * Persist parsed resume data into people (same as Rails: resume_text, parse_resume_json, education, experiences, etc.).
 * Call after parse-resume so employer candidate profile and match/rank flows have data.
 */
export async function updatePersonParsedResume(
  personId: number,
  parseResult: Record<string, unknown>
): Promise<void> {
  const summary = typeof parseResult.summary === 'string' ? parseResult.summary : '';
  const skillsArr = Array.isArray(parseResult.skills) ? (parseResult.skills as string[]) : [];
  const skillsStr = skillsArr.join(', ').trim();
  const resumeText = [summary, skillsStr].filter(Boolean).join('\n').trim() || null;

  const education = Array.isArray(parseResult.education) ? (parseResult.education as any[]) : [];
  const educationDegrees = education
    .map((e) => (e && typeof e.degree === 'string' ? e.degree.trim() : ''))
    .filter(Boolean)
    .join('\n') || null;
  const educationUniversities = education
    .map((e) => (e && typeof e.university === 'string' ? e.university.trim() : ''))
    .filter(Boolean)
    .join('\n') || null;

  const experiencesRaw = Array.isArray(parseResult.experiences) ? parseResult.experiences as any[] : [];
  const experienceLines = experiencesRaw.map((exp) => {
    if (typeof exp === 'string') return exp.trim();
    if (exp && typeof exp === 'object' && (exp.title || exp.company || exp.position)) {
      const parts = [exp.title || exp.position, exp.company].filter(Boolean);
      return parts.join(' at ');
    }
    return '';
  }).filter(Boolean);
  const experiencesStr = experienceLines.join('\n') || null;
  const companyWorked = experiencesRaw
    .map((exp) => (exp && typeof exp === 'object' && exp.company ? String(exp.company).trim() : ''))
    .filter(Boolean)
    .join('\n') || null;

  const certificatesArr = Array.isArray(parseResult.certificates) ? (parseResult.certificates as string[]) : [];
  const certificatesStr = certificatesArr.map((c) => String(c).trim()).filter(Boolean).join('\n') || null;

  const parseResumeJson = JSON.stringify(parseResult);

  const name = typeof parseResult.name === 'string' ? parseResult.name.trim() || null : null;
  const firstName = typeof parseResult.first_name === 'string' ? parseResult.first_name.trim() || null : null;
  const lastName = typeof parseResult.last_name === 'string' ? parseResult.last_name.trim() || null : null;
  const phoneNumber = typeof parseResult.phone_number === 'string' ? parseResult.phone_number.trim() || null : null;

  await query(
    `UPDATE people SET
       resume_text = $2,
       parse_resume_json = $3,
       education_degrees = $4,
       education_universitys = $5,
       experiences = $6,
       company_worked = $7,
       certificates = $8,
       skills = $9,
       name = $10,
       first_name = $11,
       last_name = $12,
       phone_number = $13,
       description = $14,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [
      personId,
      resumeText,
      parseResumeJson,
      educationDegrees,
      educationUniversities,
      experiencesStr,
      companyWorked,
      certificatesStr,
      skillsStr || null,
      name,
      firstName,
      lastName,
      phoneNumber,
      summary || null,
    ]
  );
}

/**
 * Get resume text for a user for use in RESUME_MATCH_API (resume_service_urls[].resume_text).
 * Prefers people.resume_text if user has a linked person; else parses default resume once to get summary + skills.
 */
export async function getResumeTextForUser(userId: string): Promise<string> {
  const userRow = await query(
    'SELECT person_id FROM users WHERE id = $1',
    [userId]
  );
  const personId = userRow.rows?.[0]?.person_id;
  if (personId != null) {
    const personRow = await query(
      'SELECT resume_text FROM people WHERE id = $1',
      [Number(personId)]
    );
    const text = personRow.rows?.[0]?.resume_text;
    if (text != null && String(text).trim() !== '') return String(text).trim();
  }

  const resumesResult = await query(
    'SELECT id, file_path FROM resumes WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC LIMIT 1',
    [userId]
  );
  const resume = resumesResult.rows?.[0];
  if (!resume?.file_path) return '';

  const fullPath = path.join(UPLOAD_DIR, path.basename(resume.file_path));
  let buf: Buffer;
  try {
    buf = await fs.readFile(fullPath);
  } catch {
    return '';
  }
  const parserUrl = (process.env.RESUME_PARSER_API || '').trim().replace(/\/$/, '');
  if (!parserUrl) return '';

  const form = new FormData();
  form.append('pdf', new Blob([new Uint8Array(buf)]), path.basename(resume.file_path));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let response: Response;
  try {
    response = await fetch(`${parserUrl}/upload_resume`, {
      method: 'POST',
      body: form as any,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) return '';
  const data: any = await response.json().catch(() => ({}));
  const summary = typeof data?.summary === 'string' ? data.summary : '';
  const skills = Array.isArray(data?.skills) ? (data.skills as string[]).join(', ') : '';
  return [summary, skills].filter(Boolean).join('\n').trim() || '';
}

export interface ResumeServiceUrlItem {
  id: string;
  url: string;
  resume_text: string;
}

export interface MatchResultItem {
  id: string;
  score: number;
  summary?: string;
}

/**
 * Call RESUME_MATCH_API (same as Rails get_match_score_data). One job + one candidate.
 * Returns results array; results[0].score is the match % for the candidate.
 */
export async function callResumeMatchApi(
  jobDescription: string,
  notes: string | null,
  resumeServiceUrls: ResumeServiceUrlItem[]
): Promise<{ results: MatchResultItem[] }> {
  const apiUrl = (process.env.RESUME_MATCH_API || '').trim();
  if (!apiUrl) {
    throw new Error('RESUME_MATCH_API is not configured');
  }
  const controller = new AbortController();
  const timeoutMs = Number(process.env.RESUME_MATCH_TIMEOUT_MS || 30000); // 30s default; match API can be slow
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const body = {
    job_description: jobDescription || '',
    notes: notes != null ? String(notes) : '',
    resume_service_urls: resumeServiceUrls,
  };
  console.log('[RESUME_MATCH_API] Request', { url: apiUrl, body });
  // Also log a ready-to-run curl for debugging in Postman/terminal (resume_text included; beware of size).
  try {
    const jsonForCurl = JSON.stringify(body).replace(/'/g, "\\'");
    const curl = `curl -X POST '${apiUrl}' -H 'Content-Type: application/json' -d '${jsonForCurl}'`;
    console.log('[RESUME_MATCH_API] CURL', curl);
  } catch {
    // ignore JSON/stringify issues
  }
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const text = await response.text();
  if (!response.ok) {
    console.log('[RESUME_MATCH_API] Response (error)', { status: response.status, body: text });
    throw new Error(`Resume match API failed: ${response.status} ${text}`);
  }
  const data = (() => {
    try {
      return JSON.parse(text) as { results?: MatchResultItem[] };
    } catch {
      return {};
    }
  })();
  console.log('[RESUME_MATCH_API] Response', { status: response.status, data });
  const results = Array.isArray(data?.results) ? data.results : [];
  return { results };
}
