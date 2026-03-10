import { query } from '../database/connection.js';
import { getEsClient } from '../services/people-es.service.js';

/**
 * One-shot People -> Elasticsearch indexer.
 *
 * Rails parity: ch-job-marketplace uses `Person` model with `EsCandidateSearch` mapping.
 * Here we build a similar index named by ELASTICSEARCH_PEOPLE_INDEX (default: "people").
 *
 * Run:
 *   node --loader ts-node/esm server/scripts/index-people-to-es.ts
 * or (if you use tsx):
 *   npx tsx server/scripts/index-people-to-es.ts
 */
async function main() {
  const index = process.env.ELASTICSEARCH_PEOPLE_INDEX || 'people';

  // Pull a minimal set of fields used by autosourcing query.
  const peopleRes = await query(
    `SELECT
       id,
       COALESCE(search_text, '') AS search_text,
       COALESCE(keyword, '') AS keyword,
       COALESCE(skills, '') AS skills,
       COALESCE(location, '') AS location,
       COALESCE(company_names, '') AS company_names,
       COALESCE(title, '') AS title,
       COALESCE(school, '') AS school,
       COALESCE(first_name, '') AS first_name,
       COALESCE(last_name, '') AS last_name,
       COALESCE(degree, '') AS degree,
       COALESCE(discipline, '') AS discipline,
       COALESCE(email_address, '') AS email_address,
       COALESCE(phone_number, '') AS phone_number,
       COALESCE(tags, '') AS tags,
       COALESCE(public::text, '') AS public,
       organization_id,
       COALESCE(top_school, false) AS top_school,
       COALESCE(top_company, false) AS top_company,
       COALESCE(active, true) AS active,
       COALESCE(source, '') AS source,
       COALESCE(auto_sign_agreement, 0) AS auto_sign_agreement,
       COALESCE(colour_id, 0) AS colour_id,
       COALESCE(role, 0) AS role,
       COALESCE(rank_score, 0) AS rank_score,
       COALESCE(top_contractor, false) AS top_contractor,
       COALESCE(resume_text, '') AS resume_text,
       COALESCE(cv_url::text, '') AS cv_url
     FROM people
     WHERE discarded_at IS NULL`
  );

  const client = getEsClient();

  // Create index if it doesn't exist (best-effort)
  const exists = await client.indices.exists({ index });
  if (!exists) {
    await client.indices.create({
      index,
      mappings: {
        dynamic: false,
        properties: {
          id: { type: 'integer' },
          search_text: { type: 'text', analyzer: 'english' },
          keyword: { type: 'text', analyzer: 'english' },
          skills: { type: 'text', analyzer: 'english' },
          location: { type: 'text', analyzer: 'english' },
          company_names: { type: 'text', analyzer: 'english' },
          title: { type: 'text', analyzer: 'english' },
          school: { type: 'text', analyzer: 'english' },
          first_name: { type: 'text', analyzer: 'english' },
          last_name: { type: 'text', analyzer: 'english' },
          degree: { type: 'text', analyzer: 'english' },
          discipline: { type: 'text', analyzer: 'english' },
          email_address: { type: 'text', analyzer: 'english' },
          phone_number: { type: 'text', analyzer: 'english' },
          tags: { type: 'text', analyzer: 'english' },
          public: { type: 'text', analyzer: 'english' },
          organization_id: { type: 'keyword' },
          top_school: { type: 'boolean' },
          top_company: { type: 'boolean' },
          active: { type: 'boolean' },
          source: { type: 'text', analyzer: 'english' },
          auto_sign_agreement: { type: 'integer' },
          colour_id: { type: 'integer' },
          role: { type: 'integer' },
          rank_score: { type: 'float' },
          top_contractor: { type: 'boolean' },
          resume_text: { type: 'text', analyzer: 'english' },
          cv_url: { type: 'text', analyzer: 'english' },
        },
      },
    });
  }

  const body: any[] = [];
  for (const p of peopleRes.rows) {
    body.push({ index: { _index: index, _id: String(p.id) } });
    body.push(p);
  }

  if (body.length === 0) {
    console.log('No people rows found to index.');
    return;
  }

  const resp = await client.bulk({ refresh: true, operations: body });
  const hasErrors = (resp as any)?.errors;
  console.log(`Indexed ${peopleRes.rows.length} people into ES index "${index}". errors=${hasErrors ? 'true' : 'false'}`);
  if (hasErrors) {
    const items = (resp as any)?.items || [];
    const errored = items.filter((it: any) => it?.index?.error);
    console.log(`Errored items: ${errored.length}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
