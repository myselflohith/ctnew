import { Client } from '@elastic/elasticsearch';

const ES_NODE = process.env.ELASTICSEARCH_URL || process.env.ELASTICSEARCH_HOST || 'http://localhost:9200';
const PEOPLE_INDEX = process.env.ELASTICSEARCH_PEOPLE_INDEX || 'people';

let _client: Client | null = null;

export function getEsClient(): Client {
  if (_client) return _client;
  _client = new Client({ node: ES_NODE });
  return _client;
}

/**
 * Minimal Rails-parity for:
 * Person.search_matched_candidate_with_filters(filter_stack).page(page).per(per_page)
 *
 * We return ids + total so worker can replicate candidates_with_rank_score behavior.
 *
 * NOTE: Rails version supports many keys; for autosourcing we need at least:
 * - active (default true)
 * - skills (comma separated)
 * - titles (comma separated)
 * - ids (comma separated) => must_not terms
 * - location (optional)
 */
export async function searchMatchedCandidatesWithFilters(
  options: Record<string, any>,
  page: number,
  perPage: number
): Promise<{ ids: number[]; total: number }> {
  const must: any[] = [];
  const must_not: any[] = [];

  // active filter (Rails uses match on active)
  const active = Object.prototype.hasOwnProperty.call(options, 'active') ? options.active : true;
  must.push({ match: { active } });

  // skills => bool should/must of { match: { skills: skill } }
  if (options.skills && String(options.skills).trim().length > 0) {
    const matchParams = String(options.skills)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(skill => ({ match: { skills: skill } }));

    must.push({
      bool: {
        should: matchParams,
      },
    });
  }

  // titles => bool should of match_phrase title
  if (options.titles && String(options.titles).trim().length > 0) {
    const titleParams = String(options.titles)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(title => ({ match_phrase: { title } }));

    if (titleParams.length > 0) {
      must.push({
        bool: {
          should: titleParams,
          minimum_should_match: 1,
        },
      });
    }
  }

  // location => bool should match_phrase (Rails adds state mapping; ctnew keeps raw)
  if (options.location && String(options.location).trim().length > 0) {
    const locParams = String(options.location)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(loc => ({ match_phrase: { location: loc } }));

    must.push({
      bool: {
        should: locParams,
      },
    });
  }

  // ids => must_not terms { id: [...] }
  if (options.ids && String(options.ids).trim().length > 0) {
    const ids = String(options.ids)
      .split(',')
      .map(x => Number(x))
      .filter(Boolean);
    if (ids.length > 0) {
      must_not.push({ terms: { id: ids } });
    }
  }

  const from = Math.max(0, (Math.max(1, page) - 1) * perPage);

  const res = await getEsClient().search({
    index: PEOPLE_INDEX,
    from,
    size: perPage,
    query: {
      bool: {
        must,
        must_not: must_not.length > 0 ? must_not : undefined,
      },
    },
    sort: [{ _score: { order: 'desc' } }, { id: { order: 'desc' } }],
    _source: ['id'],
  });

  const hits: any[] = (res.hits as any)?.hits || [];
  const ids = hits
    .map((h: any) => Number(h?._source?.id ?? h?._id))
    .filter((n: number) => Number.isFinite(n));

  const total = typeof (res.hits as any)?.total === 'number' ? (res.hits as any).total : (res.hits as any)?.total?.value || 0;

  return { ids, total };
}
