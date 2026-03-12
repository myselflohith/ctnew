import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { query } from '../database/connection.js';
import { uploadProfilePhotoToS3 } from '../services/s3-resume-upload.service.js';

const router = Router();

/**
 * Minimal upload routes.
 * Exposes:
 *  - POST /api/uploads  (multipart field: file)
 *  - POST /api/uploads/profile-photo (multipart field: photo)  [auth] — uploads to S3 (or disk fallback), saves URL in users.picture_url
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

const profilePhotoMemoryStorage = multer.memoryStorage();

const uploadMisc = multer({ storage: miscStorage });
const uploadPhoto = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) cb(null, true);
    else cb(new Error('Invalid file type. Only images are allowed.'));
  },
});
const uploadPhotoMemory = multer({
  storage: profilePhotoMemoryStorage,
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
// Uploads to S3 when RESUME_S3_* env is set; otherwise saves to disk. Saves absolute URL in users.picture_url so the image loads correctly.
router.post(
  '/profile-photo',
  authenticateToken,
  uploadPhotoMemory.single('photo'),
  async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No photo uploaded' });
      }

      let url: string;
      const buffer = req.file.buffer as Buffer;
      const originalName = req.file.originalname || 'photo.jpg';
      const mimeType = req.file.mimetype || 'image/jpeg';

      try {
        const result = await uploadProfilePhotoToS3({
          buffer,
          userId: req.user.id,
          originalFileName: originalName,
          contentType: mimeType,
        });
        url = result.url;
      } catch (s3Err: any) {
        // Fallback: save to disk and return URL (use SITE_URL/APP_URL so frontend can load the image)
        const filename = safeFilename(originalName);
        const filePath = path.join(profilePhotoDir, filename);
        fs.writeFileSync(filePath, buffer);
        const baseUrl = (process.env.SITE_URL || process.env.APP_URL || '').trim().replace(/\/$/, '');
        url = baseUrl ? `${baseUrl}/uploads/profile-photos/${filename}` : `/uploads/profile-photos/${filename}`;
      }

      // users.picture_url is a JSON column; store URL as JSON string
      const pictureUrlJson = JSON.stringify(url);

      const updated = await query(
        `UPDATE users
         SET picture_url = $2::json,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, first_name, last_name, company_name, organization_id, role,
                   email_verified, phone_number, location, linkedin_profile_url, remote_interest, salary_expectations,
                   picture_url, skills,
                   created_at, updated_at`,
        [req.user.id, pictureUrlJson]
      );

      const row = updated.rows[0];
      return res.json({
        success: true,
        url,
        user: row
          ? {
              ...row,
              phone_number: row.phone_number ?? null,
            }
          : null,
      });
    } catch (e) {
      console.error('Profile photo upload failed:', e);
      return res.status(500).json({ success: false, error: 'Failed to upload photo' });
    }
  }
);

// POST /api/uploads/company-logo  (multipart/form-data field: logo)
// Uploads to S3 when RESUME_S3_* env is set; otherwise saves to disk. Saves absolute URL suitable for organizations.image_url.
router.post(
  '/company-logo',
  authenticateToken,
  uploadPhotoMemory.single('logo'),
  async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No logo uploaded' });
      }

      const { organizationId } = req.body || {};
      if (!organizationId || typeof organizationId !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing organizationId' });
      }

      let url: string;
      const buffer = req.file.buffer as Buffer;
      const originalName = req.file.originalname || 'logo.jpg';
      const mimeType = req.file.mimetype || 'image/jpeg';

      try {
        const result = await uploadProfilePhotoToS3({
          buffer,
          userId: String(organizationId),
          originalFileName: originalName,
          contentType: mimeType,
        });
        url = result.url;
      } catch (s3Err: any) {
        const filename = safeFilename(originalName);
        const filePath = path.join(profilePhotoDir, filename);
        fs.writeFileSync(filePath, buffer);
        const baseUrl = (process.env.SITE_URL || process.env.APP_URL || '').trim().replace(/\/$/, '');
        url = baseUrl ? `${baseUrl}/uploads/profile-photos/${filename}` : `/uploads/profile-photos/${filename}`;
      }

      await query(
        `UPDATE organizations
         SET image_url = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [organizationId, url]
      );

      return res.json({
        success: true,
        url,
      });
    } catch (e) {
      console.error('Company logo upload failed:', e);
      return res.status(500).json({ success: false, error: 'Failed to upload logo' });
    }
  }
);

export default router;
