import { Pool } from 'pg';

const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cardinaltalent_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

export const testPool = new Pool(testDbConfig);

export async function setupTestDatabase() {
  await testPool.query('BEGIN');
  
  await testPool.query('TRUNCATE TABLE ct_interviews CASCADE');
  await testPool.query('TRUNCATE TABLE ct_job_applications CASCADE');
  await testPool.query('TRUNCATE TABLE ct_jobs_saved CASCADE');
  await testPool.query('TRUNCATE TABLE ct_job CASCADE');
  await testPool.query('TRUNCATE TABLE ct_org_job_requirements CASCADE');
  await testPool.query('TRUNCATE TABLE organizations CASCADE');
  await testPool.query('TRUNCATE TABLE resumes CASCADE');
  await testPool.query('TRUNCATE TABLE sessions CASCADE');
  await testPool.query('TRUNCATE TABLE users CASCADE');
  
  await testPool.query('COMMIT');
}

export async function cleanupTestDatabase() {
  await setupTestDatabase();
}

export async function closeTestDatabase() {
  await testPool.end();
}

export async function createTestUser(userData: any) {
  const result = await testPool.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, company_name, role, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userData.id,
      userData.email,
      userData.passwordHash,
      userData.firstName || null,
      userData.lastName || null,
      userData.companyName || null,
      userData.role,
      userData.emailVerified !== undefined ? userData.emailVerified : true,
    ]
  );
  return result.rows[0];
}

export async function createTestJob(jobData: any) {
  const result = await testPool.query(
    `INSERT INTO ct_job (id, title, company, location, type, salary, skills, description, status, match_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      jobData.id,
      jobData.title,
      jobData.company,
      jobData.location,
      jobData.type,
      jobData.salary || null,
      jobData.skills || [],
      jobData.description || null,
      jobData.status || 'active',
      jobData.matchScore || null,
    ]
  );
  return result.rows[0];
}

export async function createTestResume(resumeData: any) {
  const result = await testPool.query(
    `INSERT INTO resumes (id, user_id, name, file_path, file_size, is_default)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      resumeData.id,
      resumeData.userId,
      resumeData.name,
      resumeData.filePath,
      resumeData.fileSize || 0,
      resumeData.isDefault || false,
    ]
  );
  return result.rows[0];
}

export async function createTestApplication(appData: any) {
  const result = await testPool.query(
    `INSERT INTO ct_job_applications (id, user_id, job_id, resume_id, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      appData.id,
      appData.userId,
      appData.jobId,
      appData.resumeId || null,
      appData.status || 'Application Sent',
    ]
  );
  return result.rows[0];
}

export async function createTestSession(sessionData: any) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  const result = await testPool.query(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [sessionData.userId, sessionData.token, sessionData.expiresAt || expiresAt]
  );
  return result.rows[0];
}
