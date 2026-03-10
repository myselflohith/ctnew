import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { query } from '../database/connection.js';
import {
  getUserResumes,
  getResume,
  createResume,
  setDefaultResume,
  deleteResume,
  getResumeFilePath,
  ensureUploadDir,
  getResumeSkillsById,
  extractProfileFromResumeFilePath,
  parseResumeWithParserApi,
  callResumeScoreApi,
  getOrCreatePersonForUser,
  updatePersonRankFromApi,
  updatePersonParsedResume,
  getResumeTextForUser,
  callResumeMatchApi,
} from '../services/resume.service.js';
import { talentJobMatchingQueue } from '../queues/talent-job-matching.queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Ensure upload directory exists
await ensureUploadDir();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/resumes'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
  },
});

// Memory storage for parse-resume (no disk write; forwards to RESUME_PARSER_API)
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Invalid file type. Only PDF, DOC, and DOCX are allowed.'));
  },
});

// Parse resume via RESUME_PARSER_API and rank via RESUME_SCORE_API (same as ch-job-marketplace)
router.post(
  '/parse-resume',
  authenticateToken,
  uploadMemory.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const parseResult = await parseResumeWithParserApi(req.file.buffer, req.file.originalname);
      let rankResult: Record<string, unknown> | null = null;
      let rankError: string | null = null;

      let personId: number | null = null;
      try {
        personId = await getOrCreatePersonForUser(Number(req.user.id));
        await updatePersonParsedResume(personId, parseResult);
      } catch (dbErr: any) {
        console.warn('[parse-resume] Failed to save parsed resume to people:', dbErr?.message);
      }

      const scoreApiUrl = (process.env.RESUME_SCORE_API || '').trim();
      if (!scoreApiUrl) {
        rankError = 'RESUME_SCORE_API is not configured';
        console.warn('[parse-resume] RESUME_SCORE_API not set, skipping rank call');
      } else {
        try {
          console.log('[parse-resume] Calling RESUME_SCORE_API:', scoreApiUrl);
          rankResult = await callResumeScoreApi(parseResult);
          console.log('[parse-resume] Rank API success');
          if (personId != null) {
            try {
              await updatePersonRankFromApi(personId, rankResult);
            } catch (dbErr: any) {
              console.warn('[parse-resume] Failed to save rank to people:', dbErr?.message);
            }
          }
        } catch (rankErr: any) {
          rankError = rankErr?.message ?? String(rankErr);
          console.warn('[parse-resume] Resume score/rank API failed:', rankError);
        }
      }

      // Enqueue background job to compute job–resume match scores (Ruby-style worker)
      talentJobMatchingQueue.add('computeMatchScores', { userId: Number(req.user.id) }).catch((e) => {
        console.warn('[parse-resume] Failed to enqueue talent-job-matching:', (e as Error)?.message);
      });

      res.json({
        success: true,
        data: {
          parse: parseResult,
          ...(rankResult !== null && { rank: rankResult }),
          ...(rankError !== null && { rankError }),
        },
      });
    } catch (error: any) {
      console.error('Resume parser API error:', error);
      res.status(500).json({
        error: error?.message || 'Resume parser failed',
      });
    }
  }
);

// Employer resume database: top ranked talent candidates (default view)
// GET /api/resumes/employer/resume-database
router.get(
  '/employer/resume-database',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      if (req.user.role !== 'employer' && req.user.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      const minRank = Number(req.query.minRank ?? 80);
      const limitParam = Number(req.query.limit ?? 50);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

      const result = await query(
        `SELECT
           p.id AS person_id,
           p.rank_score,
           p.score_edu,
           p.score_company,
           p.latest_company,
           p.latest_school,
           u.id AS user_id,
           u.first_name,
           u.last_name,
           u.email,
           u.location
         FROM people p
         JOIN users u ON u.id = p.user_id
         WHERE u.role = 4
           AND p.discarded_at IS NULL
           AND p.rank_score IS NOT NULL
           AND p.rank_score >= $1
         ORDER BY p.rank_score DESC, p.updated_at DESC
         LIMIT $2`,
        [minRank, limit]
      );

      const data = (result.rows || []).map((row: any) => {
        const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
        return {
          userId: String(row.user_id),
          personId: Number(row.person_id),
          name: fullName || row.email,
          email: row.email,
          location: row.location ?? null,
          rankScore: row.rank_score != null ? Number(row.rank_score) : null,
          scoreEdu: row.score_edu != null ? Number(row.score_edu) : null,
          scoreCompany: row.score_company != null ? Number(row.score_company) : null,
          latestCompany: row.latest_company ?? null,
          latestSchool: row.latest_school ?? null,
        };
      });

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error loading employer resume database:', error);
      res.status(500).json({ success: false, error: 'Failed to load resume database' });
    }
  }
);

// Employer resume database search with match score (uses RESUME_MATCH_API)
// GET /api/resumes/employer/resume-database/search?q=...
router.get(
  '/employer/resume-database/search',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      if (req.user.role !== 'employer' && req.user.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      const qRaw = (req.query.q ?? '').toString();
      const q = qRaw.trim();
      if (!q) {
        res.json({ success: true, data: [] });
        return;
      }

      const minRank = Number(req.query.minRank ?? 80);
      const minMatch = Number(req.query.minMatch ?? 80);
      const limitParam = Number(req.query.limit ?? 100);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100;

      // Base candidate pool: high-rank talent candidates
      const baseLimit = Math.max(limit * 2, limit); // fetch extra to allow match filtering
      const baseResult = await query(
        `SELECT
           p.id AS person_id,
           p.rank_score,
           p.score_edu,
           p.score_company,
           p.latest_company,
           p.latest_school,
           p.resume_text,
           u.id AS user_id,
           u.first_name,
           u.last_name,
           u.email,
           u.location
         FROM people p
         JOIN users u ON u.id = p.user_id
         WHERE u.role = 4
           AND p.discarded_at IS NULL
           AND p.rank_score IS NOT NULL
           AND p.rank_score >= $1
         ORDER BY p.rank_score DESC, p.updated_at DESC
         LIMIT $2`,
        [minRank, baseLimit]
      );

      const rows = baseResult.rows || [];
      const results: any[] = [];

      for (const row of rows) {
        let resumeText: string =
          row.resume_text != null && String(row.resume_text).trim() !== ''
            ? String(row.resume_text).trim()
            : '';
        if (!resumeText) {
          // Fallback: derive from default resume (summary + skills), same as talent matching
          try {
            resumeText = await getResumeTextForUser(String(row.user_id));
          } catch (e) {
            console.warn(
              '[employer resume search] getResumeTextForUser failed for user',
              row.user_id,
              (e as Error)?.message
            );
          }
        }
        if (!resumeText) continue;

        try {
          const { results: matchResults } = await callResumeMatchApi(q, null, [
            { id: String(row.user_id), url: '', resume_text: resumeText },
          ]);
          const first = matchResults?.[0];
          const matchScore =
            first != null && typeof first.score === 'number' ? Number(first.score) : null;
          if (matchScore == null || Number.isNaN(matchScore) || matchScore < minMatch) {
            continue;
          }

          const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
          results.push({
            userId: String(row.user_id),
            personId: Number(row.person_id),
            name: fullName || row.email,
            email: row.email,
            location: row.location ?? null,
            rankScore: row.rank_score != null ? Number(row.rank_score) : null,
            scoreEdu: row.score_edu != null ? Number(row.score_edu) : null,
            scoreCompany: row.score_company != null ? Number(row.score_company) : null,
            latestCompany: row.latest_company ?? null,
            latestSchool: row.latest_school ?? null,
            matchScore,
          });
        } catch (e: any) {
          console.warn(
            '[employer resume search] match API failed for user',
            row.user_id,
            e?.message ?? String(e)
          );
        }
      }

      // Sort by match score desc, then rank score desc
      results.sort((a, b) => {
        const mA = a.matchScore ?? 0;
        const mB = b.matchScore ?? 0;
        if (mB !== mA) return mB - mA;
        const rA = a.rankScore ?? 0;
        const rB = b.rankScore ?? 0;
        return rB - rA;
      });

      res.json({ success: true, data: results.slice(0, limit) });
    } catch (error: any) {
      console.error('Error searching employer resume database:', error);
      res.status(500).json({ success: false, error: 'Failed to search resume database' });
    }
  }
);

// Employer: get full candidate profile by userId (people + rank scores + resume_text snippet)
router.get(
  '/employer/candidate-profile/:userId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      if (req.user.role !== 'employer' && req.user.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      const userId = parseInt(String(req.params.userId), 10);
      if (Number.isNaN(userId)) {
        res.status(400).json({ success: false, error: 'Invalid userId' });
        return;
      }

      const result = await query(
        `SELECT
           u.id AS user_id,
           u.first_name,
           u.last_name,
           u.email,
           u.location,
           p.id AS person_id,
           p.rank_score,
           p.score_edu,
           p.score_company,
           p.latest_company,
           p.latest_school,
           p.resume_text,
           p.parse_resume_json,
           p.education_degrees,
           p.education_universitys,
           p.company_worked,
           p.experiences,
           p.certificates
         FROM users u
         LEFT JOIN people p ON u.person_id = p.id
         WHERE u.id = $1`,
        [userId]
      );

      const row: any = result.rows[0];
      if (!row) {
        res.status(404).json({ success: false, error: 'Candidate not found' });
        return;
      }

      const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
      const resumeText: string = row.resume_text != null ? String(row.resume_text) : '';
      const summarySnippet =
        resumeText && resumeText.trim().length
          ? resumeText.split(/\n{2,}|\r?\n\r?\n/)[0].slice(0, 1200)
          : '';

      const splitList = (value: unknown): string[] => {
        const s = typeof value === 'string' ? value : '';
        if (!s.trim()) return [];
        // Ruby often stored these as newline or '||' or comma separated; handle all reasonably.
        return s
          .split(/[\n\r]+|\|\||;;|,/)
          .map((v) => v.trim())
          .filter(Boolean);
      };

      const degrees = splitList(row.education_degrees);
      const universities = splitList(row.education_universitys);
      const education = degrees.length || universities.length
        ? degrees.map((deg: string, idx: number) => ({
            degree: deg,
            university: universities[idx] ?? null,
          }))
        : [];

      const experiences = splitList(row.experiences || row.company_worked);
      const certificates = splitList(row.certificates);

      // When available, use parse_resume_json for full structured data (summary, skills, education, experiences with details, etc.)
      let parsed: {
        summary?: string | null;
        skills?: string[];
        education?: { degree?: string; university?: string; from_year?: string; to_year?: string }[];
        experiences?: { designation?: string; company_worked_at?: string; years_of_experience?: string; experience_details?: string }[];
        certificates?: string[];
        languages?: string[];
        location?: string | null;
        linkedin_url?: string | null;
      } | null = null;
      const parseResumeJsonRaw = row.parse_resume_json;
      if (parseResumeJsonRaw && typeof parseResumeJsonRaw === 'string' && parseResumeJsonRaw.trim()) {
        try {
          const json = JSON.parse(parseResumeJsonRaw) as Record<string, unknown>;
          parsed = {
            summary: typeof json.summary === 'string' ? json.summary : null,
            skills: Array.isArray(json.skills) ? (json.skills as string[]) : [],
            education: Array.isArray(json.education)
              ? (json.education as any[]).map((e) => ({
                  degree: e?.degree != null ? String(e.degree) : undefined,
                  university: e?.university != null ? String(e.university) : undefined,
                  from_year: e?.from_year != null ? String(e.from_year) : undefined,
                  to_year: e?.to_year != null ? String(e.to_year) : undefined,
                }))
              : [],
            experiences: Array.isArray(json.experiences)
              ? (json.experiences as any[]).map((e) => ({
                  designation: e?.designation != null ? String(e.designation) : undefined,
                  company_worked_at: e?.company_worked_at != null ? String(e.company_worked_at) : undefined,
                  years_of_experience: e?.years_of_experience != null ? String(e.years_of_experience) : undefined,
                  experience_details: e?.experience_details != null ? String(e.experience_details) : undefined,
                }))
              : [],
            certificates: Array.isArray(json.certificates) ? (json.certificates as string[]) : [],
            languages: Array.isArray(json.languages) ? (json.languages as string[]) : [],
            location: typeof json.location === 'string' && json.location.trim() ? json.location : null,
            linkedin_url: typeof json.linkedin_url === 'string' && json.linkedin_url.trim() ? json.linkedin_url : null,
          };
        } catch (_) {
          // ignore parse errors, fall back to column data
        }
      }

      res.json({
        success: true,
        data: {
          userId: String(row.user_id),
          personId: row.person_id != null ? Number(row.person_id) : null,
          name: fullName || row.email,
          email: row.email,
          location: (parsed?.location ?? row.location) ?? null,
          rankScore: row.rank_score != null ? Number(row.rank_score) : null,
          scoreEdu: row.score_edu != null ? Number(row.score_edu) : null,
          scoreCompany: row.score_company != null ? Number(row.score_company) : null,
          latestCompany: row.latest_company ?? null,
          latestSchool: row.latest_school ?? null,
          summary: (parsed?.summary ?? summarySnippet) || null,
          education: parsed?.education?.length
            ? parsed.education.map((e) => ({ degree: e.degree, university: e.university, from_year: e.from_year, to_year: e.to_year }))
            : education.map((e) => ({ degree: e.degree, university: e.university, from_year: undefined as string | undefined, to_year: undefined as string | undefined })),
          experiences: parsed?.experiences?.length
            ? parsed.experiences
            : experiences.map((exp) => ({ designation: exp, company_worked_at: '', years_of_experience: '', experience_details: '' })),
          certificates: (parsed?.certificates?.length ? parsed.certificates : certificates) as string[],
          skills: parsed?.skills ?? [],
          languages: parsed?.languages ?? [],
          linkedinUrl: parsed?.linkedin_url ?? null,
        },
      });
    } catch (error: any) {
      console.error('Error loading candidate profile:', error);
      res.status(500).json({ success: false, error: 'Failed to load candidate profile' });
    }
  }
);

// Get all resumes for the authenticated user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const resumes = await getUserResumes(req.user.id);
    res.json({ success: true, data: resumes });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// Upload a new resume
router.post('/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const resume = await createResume(
      req.user.id,
      req.file.originalname,
      req.file.filename,
      req.file.size
    );

    // Non-destructive profile enrichment from resume:
    // - only fills missing phone_number / location / linkedin_profile_url
    try {
      const extracted = await extractProfileFromResumeFilePath(resume.file_path);

      if (extracted?.phone_number || extracted?.location || extracted?.linkedin_profile_url) {
        const current = await query(
          'SELECT phone_number, location, linkedin_profile_url FROM users WHERE id = $1',
          [req.user.id]
        );

        const existing = current.rows?.[0] || {};

        // Overwrite existing fields when extraction returns a value.
        // If extraction returns null/empty for a field, keep whatever is already stored.
        const newPhone = extracted.phone_number ? extracted.phone_number : null;
        const newLocation = extracted.location ? extracted.location : null;
        const newLinkedIn = extracted.linkedin_profile_url ? extracted.linkedin_profile_url : null;

        if (newPhone || newLocation || newLinkedIn) {
          await query(
            `UPDATE users
             SET phone_number = CASE WHEN $2::text IS NULL THEN phone_number ELSE $2 END,
                 location = CASE WHEN $3::text IS NULL THEN location ELSE $3 END,
                 linkedin_profile_url = CASE WHEN $4::text IS NULL THEN linkedin_profile_url ELSE $4 END,
                 updated_at = NOW()
             WHERE id = $1`,
            [req.user.id, newPhone, newLocation, newLinkedIn]
          );
        }
      }
    } catch (e) {
      console.warn('Resume profile extraction failed (ignored):', e);
    }

    res.status(201).json({
      success: true,
      data: resume,
      message: 'Resume uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ error: 'Failed to upload resume' });
  }
});

// Set default resume
router.put('/:id/default', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const resumeId = req.params.id;
    const resume = await getResume(resumeId, req.user.id);

    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    await setDefaultResume(resumeId, req.user.id);

    res.json({
      success: true,
      message: 'Default resume updated',
    });
  } catch (error) {
    console.error('Error setting default resume:', error);
    res.status(500).json({ error: 'Failed to set default resume' });
  }
});

// Delete a resume
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const resumeId = req.params.id;
    const deleted = await deleteResume(resumeId, req.user.id);

    if (!deleted) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// Download a resume
router.get('/:id/download', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const resumeId = req.params.id;
    const resume = await getResume(resumeId, req.user.id);

    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    const filePath = getResumeFilePath(path.basename(resume.file_path));
    res.download(filePath, resume.name);
  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ error: 'Failed to download resume' });
  }
});

// Extract skills from a resume (default resume if id not provided)
router.post('/extract-skills', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const resumeId: string | undefined = req.body?.resumeId;
    const skills = await getResumeSkillsById(req.user.id, resumeId);

    if (!skills) {
      res.status(400).json({ error: 'No resume found to extract skills from' });
      return;
    }

    res.json({ success: true, data: { skills } });
  } catch (error: any) {
    console.error('Error extracting skills:', error);
    const msg = String(error?.message || 'Failed to extract skills');
    const status = msg.includes('DATASORT_API / DATASORT_API_TOKEN') ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

export default router;
