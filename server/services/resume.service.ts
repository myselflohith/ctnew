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
