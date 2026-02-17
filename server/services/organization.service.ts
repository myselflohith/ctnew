import { query } from '../database/connection.js';

export interface Organization {
  id: string;
  name: string | null;
  owner_id: number | null;
  created_at: Date;
  updated_at: Date;
  description: string | null;
  status: string | null;
  is_deleted: boolean | null;
  company_size: number | null;
  location: string | null;
  industry: string | null;
  min_size: number | null;
  max_size: number | null;
  country: string[] | null;
  region: string[] | null;
  city: string[] | null;
  member_organization_id: string | null;
  image_url: string | null;
  file_name: string | null;
  website_url: string | null;
  discarded_at: Date | null;
  slug: string[] | null;
  subdomain: string[] | null;
  account_manager_id: number | null;
  organization_type: string | null;
  marketer_id: number | null;
  agreement_start_date: Date | null;
  agreement_end_date: Date | null;
  monitor_mailbox: string | null;
  agency_id: number | null;
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

// Get organization by id (uuid)
export async function getOrganizationById(id: string): Promise<Organization | null> {
  const result = await query(
    'SELECT * FROM organizations WHERE id = $1 AND (discarded_at IS NULL OR discarded_at IS NOT NULL)',
    [id]
  );
  return result.rows[0] || null;
}

// Get organization by name (for backward compat with routes using companyName param)
export async function getOrganizationByName(name: string): Promise<Organization | null> {
  const result = await query(
    'SELECT * FROM organizations WHERE name = $1 AND discarded_at IS NULL',
    [name]
  );
  return result.rows[0] || null;
}

// Backward compat: alias for get by name (routes still use "companyName" in path)
export async function getOrganizationByCompanyName(companyOrName: string): Promise<Organization | null> {
  // Try as name first
  const byName = await getOrganizationByName(companyOrName);
  if (byName) return byName;
  // If it looks like a UUID, try by id
  if (/^[0-9a-f-]{36}$/i.test(companyOrName)) {
    return getOrganizationById(companyOrName);
  }
  return null;
}

// Create organization (e.g. on employer signup or admin create)
export async function createOrganization(data: {
  name: string;
  owner_id?: number | null;
  description?: string | null;
  industry?: string | null;
  location?: string | null;
  website_url?: string | null;
  image_url?: string | null;
  status?: string | null;
  organization_type?: string | null;
}): Promise<Organization> {
  const result = await query(
    `INSERT INTO organizations (name, owner_id, description, industry, location, website_url, image_url, status, organization_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.name,
      data.owner_id ?? null,
      data.description ?? null,
      data.industry ?? null,
      data.location ?? null,
      data.website_url ?? null,
      data.image_url ?? null,
      data.status ?? null,
      data.organization_type ?? null,
    ]
  );
  return result.rows[0];
}

// Create or update organization (upsert by id if provided, else insert)
export async function upsertOrganization(data: {
  id?: string;
  name: string;
  owner_id?: number | null;
  description?: string | null;
  industry?: string | null;
  location?: string | null;
  website_url?: string | null;
  image_url?: string | null;
  status?: string | null;
  organization_type?: string | null;
  company_size?: number | null;
}): Promise<Organization> {
  if (data.id) {
    await query(
      `UPDATE organizations
       SET name = COALESCE($2, name), owner_id = COALESCE($3, owner_id), description = $4, industry = $5,
           location = $6, website_url = $7, image_url = $8, status = $9, organization_type = $10, company_size = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        data.id,
        data.name,
        data.owner_id ?? null,
        data.description ?? null,
        data.industry ?? null,
        data.location ?? null,
        data.website_url ?? null,
        data.image_url ?? null,
        data.status ?? null,
        data.organization_type ?? null,
        data.company_size ?? null,
      ]
    );
    const org = await getOrganizationById(data.id);
    if (!org) throw new Error('Organization not found after update');
    return org;
  }
  return createOrganization({
    name: data.name,
    owner_id: data.owner_id,
    description: data.description,
    industry: data.industry,
    location: data.location,
    website_url: data.website_url,
    image_url: data.image_url,
    status: data.status,
    organization_type: data.organization_type,
  });
}

// Get requirements for an organization (organization_id is uuid)
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

// Get all organizations (for admin); job_count by jobs.organization_id, user_count by owner
export async function getAllOrganizations(): Promise<(Organization & { user_count: number; job_count: number })[]> {
  const result = await query(
    `SELECT o.*,
            CASE WHEN o.owner_id IS NOT NULL THEN 1 ELSE 0 END::int AS user_count,
            COUNT(DISTINCT j.id)::int AS job_count
     FROM organizations o
     LEFT JOIN jobs j ON (j.organization_id = o.id OR j.company_name = o.name) AND j.discarded_at IS NULL
     WHERE o.discarded_at IS NULL
     GROUP BY o.id
     ORDER BY o.created_at DESC`
  );
  return result.rows.map(row => ({
    ...row,
    user_count: parseInt(row.user_count, 10) || 0,
    job_count: parseInt(row.job_count, 10) || 0,
  }));
}
