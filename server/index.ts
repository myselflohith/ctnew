import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import authRoutes from './routes/auth.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import jobRoutes from './routes/job.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import interviewRoutes from './routes/interview.routes.js';
import humanInterviewRoutes from './routes/human-interview.routes.js';
import profileRoutes from './routes/profile.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import employerRoutes from './routes/employer.routes.js';
import pool, { closePool } from './database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/interviews');
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
      // If mkdir fails, multer will throw later; keep error visible in logs.
      console.warn('Failed to ensure upload directory exists:', uploadDir, e);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/interviews', interviewRoutes(upload));
app.use('/api/human-interview', humanInterviewRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/employer', employerRoutes);

// Serve uploaded files (in production, use a CDN or object storage)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CardinalTalent Server Started');
  console.log('='.repeat(60));
  console.log(`⏱️  Server running on port: ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api`);
  console.log(`🟢 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔒 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`📄 Resume endpoints: http://localhost:${PORT}/api/resumes`);
  console.log(`💼 Job endpoints: http://localhost:${PORT}/api/jobs`);
  console.log(`🏢 Organization endpoints: http://localhost:${PORT}/api/organizations`);
  console.log(`🎬 Interview endpoints: http://localhost:${PORT}/api/interviews`);
  console.log('='.repeat(60) + '\n');

});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      await closePool();
      console.log('Database connections closed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
