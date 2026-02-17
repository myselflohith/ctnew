import { query } from '../database/connection.js';

export interface Organization {
  id: string;
  name: string;
  company_name: string;
  industry?: string;
  size?: string;
  founded?: number;
  headquarters?: string;
  description?: string;
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  benefits?: string;
  culture?: string;
  logo_path?: string;
  created_at: Date;
  updated_at: Date;
  user_count?: number;
  job_count?: number;
}

export interface JobRequirement {
  id: string;
  organization_id: string;
  requirement_text: string;
  requirement_type: 'mustHave' | 'niceToHave';
  weight: number;
  created_at: Date;
  updated_at: Date;
}

// Get organization by company name
export async function getOrganizationByCompanyName(companyName: string): Promise<Organization | null> {
  const result = await query(
    'SELECT * FROM organizations WHERE company_name = $1',
    [companyName]
  );
  return result.rows[0] || null;
}

// Create or update organization
export async function upsertOrganization(data: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> {
  const result = await query(
    `INSERT INTO organizations (name, company_name, industry, size, founded, headquarters, description, website, linkedin_url, twitter_url, benefits, culture, logo_path)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (company_name) DO UPDATE
     SET name = EXCLUDED.name,
         industry = EXCLUDED.industry,
         size = EXCLUDED.size,
         founded = EXCLUDED.founded,
         headquarters = EXCLUDED.headquarters,
         description = EXCLUDED.description,
         website = EXCLUDED.website,
         linkedin_url = EXCLUDED.linkedin_url,
         twitter_url = EXCLUDED.twitter_url,
         benefits = EXCLUDED.benefits,
         culture = EXCLUDED.culture,
         logo_path = EXCLUDED.logo_path,
         updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      data.name,
      data.company_name,
      data.industry || null,
      data.size || null,
      data.founded || null,
      data.headquarters || null,
      data.description || null,
      data.website || null,
      data.linkedin_url || null,
      data.twitter_url || null,
      data.benefits || null,
      data.culture || null,
      data.logo_path || null,
    ]
  );
  return result.rows[0];
}

// Get requirements for an organization
export async function getOrganizationRequirements(organizationId: string): Promise<JobRequirement[]> {
  const result = await query(
    'SELECT * FROM ct_org_job_requirements WHERE organization_id = $1 ORDER BY requirement_type, weight DESC',
    [organizationId]
  );
  return result.rows;
}

// Add requirement to organization
export async function addOrganizationRequirement(
  organizationId: string,
  requirementText: string,
  requirementType: 'mustHave' | 'niceToHave',
  weight: number
): Promise<JobRequirement> {
  const result = await query(
    `INSERT INTO ct_org_job_requirements (organization_id, requirement_text, requirement_type, weight)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [organizationId, requirementText, requirementType, weight]
  );
  return result.rows[0];
}

// Delete requirement
export async function deleteOrganizationRequirement(requirementId: string): Promise<void> {
  await query(
    'DELETE FROM ct_org_job_requirements WHERE id = $1',
    [requirementId]
  );
}

// Update requirement
export async function updateOrganizationRequirement(
  requirementId: string,
  requirementText: string,
  requirementType: 'mustHave' | 'niceToHave',
  weight: number
): Promise<JobRequirement> {
  const result = await query(
    `UPDATE ct_org_job_requirements
     SET requirement_text = $1, requirement_type = $2, weight = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [requirementText, requirementType, weight, requirementId]
  );
  return result.rows[0];
}

// Get all organizations (for admin)
export async function getAllOrganizations(): Promise<(Organization & { user_count: number; job_count: number })[]> {
  const result = await query(
    `SELECT o.*, 
            COUNT(DISTINCT u.id)::int as user_count,
            COUNT(DISTINCT j.id)::int as job_count
     FROM organizations o
     LEFT JOIN users u ON u.company_name = o.company_name
     LEFT JOIN jobs j ON j.company_name = o.company_name AND j.discarded_at IS NULL
     GROUP BY o.id
     ORDER BY o.created_at DESC`
  );
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    company_name: row.company_name,
    industry: row.industry,
    size: row.size,
    founded: row.founded,
    headquarters: row.headquarters,
    description: row.description,
    website: row.website,
    linkedin_url: row.linkedin_url,
    twitter_url: row.twitter_url,
    benefits: row.benefits,
    culture: row.culture,
    logo_path: row.logo_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_count: parseInt(row.user_count) || 0,
    job_count: parseInt(row.job_count) || 0,
  }));
}
