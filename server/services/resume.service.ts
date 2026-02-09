import { query } from '../database/connection.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload directory for resumes
const UPLOAD_DIR = path.join(__dirname, '../../uploads/resumes');

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
