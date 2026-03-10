import { query } from '../database/connection.js';

/**
 * Rails parity (JobTitleAlternative.generate_or_fetch):
 * - In Rails this likely calls an LLM / API and caches results in a table.
 * - In ctnew we keep it deterministic and DB-backed, so repeated calls return the same list.
 *
 * IMPORTANT: This service intentionally returns a list of strings that can be joined by ',' and
 * passed as `titles:` to the ES candidate search filter_stack.
 */
export async function generateOrFetchJobTitleAlternatives(jobTitle: string): Promise<string[]> {
  const title = (jobTitle || '').trim();
  if (!title) return [];

  // If the table doesn't exist yet in your DB, the query will fail at runtime.
  // We'll add the migration in a follow-up step.
  const existing = await query(
    `SELECT alternative_title
     FROM job_title_alternatives
     WHERE original_title = $1
     ORDER BY id ASC`,
    [title]
  );

  if (existing.rows.length > 0) {
    return existing.rows.map((r: any) => String(r.alternative_title)).filter(Boolean);
  }

  // Minimal parity fallback: include original title as the only "equivalent title".
  // (Rails likely returns multiple synonyms; we can extend later.)
  await query(
    `INSERT INTO job_title_alternatives (original_title, alternative_title)
     VALUES ($1, $2)`,
    [title, title]
  );

  return [title];
}
