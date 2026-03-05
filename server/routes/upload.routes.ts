import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { query } from '../database/connection.js';

const router = Router();

/**
 * Minimal upload routes (stores files on disk under /uploads).
 * Exposes:
 *  - POST /api/uploads  (multipart field: file)
 *  - POST /api/uploads/profile-photo (multipart field: photo)  [auth]
 */

const ensureDir = (dir: string) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    console.warn('Failed to ensure upload directory exists:', dir, e);
  }
};

const miscDir = path.resolve(process.cwd(), 'uploads', 'misc');
const profilePhotoDir = path.resolve(process.cwd(), 'uploads', 'profile-photos');
ensureDir(miscDir);
ensureDir(profilePhotoDir);

const safeFilename = (originalname: string) => {
  const ext = path.extname(originalname);
  const base = path.basename(originalname, ext).replace(/[^\w\-]+/g, '-');
  return `${Date.now()}-${base}${ext}`;
};

const miscStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, miscDir),
  filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
});

const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilePhotoDir),
  filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
});

const uploadMisc = multer({ storage: miscStorage });
const uploadPhoto = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) cb(null, true);
    else cb(new Error('Invalid file type. Only images are allowed.'));
  },
});

// POST /api/uploads  (multipart/form-data field: file)
router.post('/', uploadMisc.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const publicPath = `/uploads/misc/${req.file.filename}`;

  return res.json({
    success: true,
    file: {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
      path: publicPath,
    },
  });
});

// POST /api/uploads/profile-photo  (multipart/form-data field: photo)
router.post(
  '/profile-photo',
  authenticateToken,
  uploadPhoto.single('photo'),
  async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No photo uploaded' });
      }

      const url = `/uploads/profile-photos/${req.file.filename}`;

      const updated = await query(
        `UPDATE users
         SET photo_url = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, first_name, last_name, company_name, organization_id, role,
                   email_verified, phone, location, linkedin_profile_url, remote_interest, salary_expectations,
                   photo_url, skills,
                   created_at, updated_at`,
        [req.user.id, url]
      );

      return res.json({ success: true, url, user: updated.rows[0] });
    } catch (e) {
      console.error('Profile photo upload failed:', e);
      return res.status(500).json({ success: false, error: 'Failed to upload photo' });
    }
  }
);

export default router;
