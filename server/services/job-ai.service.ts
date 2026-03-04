/**
 * NOTE:
 * We intentionally do NOT use the `openai` npm package here, because this repo doesn't have npm
 * installed on the environment and `openai` isn't in `ctnew/package.json`.
 *
 * Instead, we mirror the existing ctnew pattern used in `server/services/resume.service.ts` and
 * call OpenAI via `fetch('https://api.openai.com/v1/chat/completions')`.
 */

function stripCodeFences(s: string) {
  return s.replace(/```json|```/gi, '').trim();
}

function safeJsonParse<T>(s: string): T {
  const cleaned = stripCodeFences(s);
  return JSON.parse(cleaned) as T;
}

async function callOpenAIJsonObject(prompt: string, opts?: { model?: string; temperature?: number; system?: string }) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: typeof opts?.temperature === 'number' ? opts.temperature : 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: opts?.system || 'Return only strict JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  const data: any = await response.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content || '';
  return safeJsonParse<any>(content);
}

export async function extractSkillsFromJobDescription(jobDescription: string): Promise<string[]> {
  const prompt = `You are an AI specialized in extracting skills from job descriptions.

TASK:
- Extract key skills and technologies that are explicitly required or mentioned.
- Return ONLY JSON (no markdown, no commentary).

JOB DESCRIPTION:
${jobDescription}

OUTPUT JSON SHAPE:
{
  "skills": ["skill 1", "skill 2", "skill 3"]
}

Rules:
- Skills should be short phrases (1-4 words).
- Deduplicate.
- Do not include generic soft skills unless explicitly required.
- Return ONLY the JSON object.`;

  const parsed = await callOpenAIJsonObject(prompt, {
    model: process.env.OPENAI_MODEL_SKILLS || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0,
    system: 'You extract skills from job descriptions and output only strict JSON.',
  });

  const skills = Array.isArray(parsed?.skills) ? parsed.skills : [];
  const cleaned = skills
    .map((s: any) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);

  return Array.from(new Set(cleaned));
}

export type ExtractedRequirement = { requirement: string; weightage: number };

export async function extractRequirementsFromJobDescription(jobDescription: string): Promise<{
  must_have: ExtractedRequirement[];
  nice_to_have: ExtractedRequirement[];
}> {
  // Ported from ch-job-marketplace JobsController#requirement_prompt (Ruby)
  const prompt = `You are an expert in analyzing job descriptions for candidate screening.
Read the job description and extract the 3–4 most critical must-have requirements that a candidate’s resume must satisfy.

TASK:
1. Extract requirements from the job description.
2. Categorize them into:
  - "must_have" (non-negotiable, core requirements)
  - "nice_to_have" (preferred but not required)
3. Assign a fixed weightage:
  - Must Have → weightage = 5
  - Nice to Have → weightage = 3

These requirements can include (but are not limited to):
  - Years of experience (if specified)
  - Mandatory technical or domain skills
  - Required degree(s), certifications, or education background
  - Industry/domain expertise
  - Location or eligibility requirements (if clearly stated)

Limit output to:
  - 4 must-have requirements
  - 2 nice-to-have requirements

JOB DESCRIPTION:
${jobDescription}

OUTPUT FORMAT (STRICT):
Return exactly ONE valid JSON object.
Use double-quoted keys and values.
Do NOT include explanations or extra text.

Output format:
{
  "must_have": [
    { "requirement": "string", "weightage": 5 }
  ],
  "nice_to_have": [
    { "requirement": "string", "weightage": 3 }
  ]
}
Return ONLY the JSON object. No surrounding quotes, no code fences, no Markdown.`;

  const parsed = await callOpenAIJsonObject(prompt, {
    model: process.env.OPENAI_MODEL_REQUIREMENTS || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0,
    system: 'You are an expert recruiter. Return ONE strict JSON object exactly per instructions. No markdown. No extra text.',
  });

  const normalize = (arr: any, weight: number): ExtractedRequirement[] => {
    if (!Array.isArray(arr)) return [];
    const out: ExtractedRequirement[] = [];
    const seen = new Set<string>();
    for (const item of arr) {
      const req = typeof item?.requirement === 'string' ? item.requirement.trim() : '';
      if (!req) continue;
      const key = req.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ requirement: req, weightage: weight });
    }
    return out;
  };

  return {
    must_have: normalize(parsed?.must_have, 5).slice(0, 4),
    nice_to_have: normalize(parsed?.nice_to_have, 3).slice(0, 2),
  };
}
