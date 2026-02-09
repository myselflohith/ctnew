import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getUserResumes,
  getResume,
  createResume,
  setDefaultResume,
  deleteResume,
  getResumeFilePath,
  ensureUploadDir,
} from '../services/resume.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Ensure upload directory exists
await ensureUploadDir();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/resumes'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
  },
});

// Get all resumes for the authenticated user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const resumes = await getUserResumes(req.user.id);
    res.json({ success: true, data: resumes });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// Upload a new resume
router.post('/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const resume = await createResume(
      req.user.id,
      req.file.originalname,
      req.file.filename,
      req.file.size
    );

    res.status(201).json({
      success: true,
      data: resume,
      message: 'Resume uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ error: 'Failed to upload resume' });
  }
});

// Set default resume
router.put('/:id/default', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const resumeId = req.params.id;
    const resume = await getResume(resumeId, req.user.id);

    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    await setDefaultResume(resumeId, req.user.id);

    res.json({
      success: true,
      message: 'Default resume updated',
    });
  } catch (error) {
    console.error('Error setting default resume:', error);
    res.status(500).json({ error: 'Failed to set default resume' });
  }
});

// Delete a resume
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const resumeId = req.params.id;
    const deleted = await deleteResume(resumeId, req.user.id);

    if (!deleted) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// Download a resume
router.get('/:id/download', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const resumeId = req.params.id;
    const resume = await getResume(resumeId, req.user.id);

    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    const filePath = getResumeFilePath(path.basename(resume.file_path));
    res.download(filePath, resume.name);
  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ error: 'Failed to download resume' });
  }
});

export default router;
