import { rest } from 'msw';
import { mockUsers } from '../fixtures/users.fixture';
import { mockJobs } from '../fixtures/jobs.fixture';
import { mockResumes } from '../fixtures/resumes.fixture';

export const handlers = [
  rest.post('/api/auth/login', async (req, res, ctx) => {
    const { email, password } = await req.json();
    
    if (email === 'talent@example.com' && password === 'TalentPass123!') {
      return res(
        ctx.status(200),
        ctx.json({
          token: 'mock-jwt-token-talent',
          user: mockUsers.talent,
        })
      );
    }
    
    if (email === 'employer@example.com' && password === 'EmployerPass123!') {
      return res(
        ctx.status(200),
        ctx.json({
          token: 'mock-jwt-token-employer',
          user: mockUsers.employer,
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ error: 'Invalid credentials' })
    );
  }),

  rest.post('/api/auth/register', async (req, res, ctx) => {
    const { email } = await req.json();
    
    if (email === 'existing@example.com') {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Email already exists' })
      );
    }
    
    return res(
      ctx.status(201),
      ctx.json({
        token: 'mock-jwt-token-new',
        user: {
          id: 'new-user-id',
          email,
          role: 'talent',
        },
      })
    );
  }),

  rest.get('/api/auth/me', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({ error: 'Unauthorized' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({ user: mockUsers.talent })
    );
  }),

  rest.post('/api/auth/logout', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Logged out successfully' })
    );
  }),

  rest.get('/api/jobs/available', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return res(
        ctx.status(401),
        ctx.json({ error: 'Unauthorized' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json([
        mockJobs.softwareEngineer,
        mockJobs.productManager,
        mockJobs.dataScientist,
      ])
    );
  }),

  rest.get('/api/jobs/:id', (req, res, ctx) => {
    const { id } = req.params;
    
    const job = Object.values(mockJobs).find(j => j.id === id);
    
    if (!job) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Job not found' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json(job)
    );
  }),

  rest.post('/api/jobs/:id/apply', async (req, res, ctx) => {
    const { id } = req.params;
    const { resumeId } = await req.json();
    
    return res(
      ctx.status(201),
      ctx.json({
        id: 'application-id',
        userId: mockUsers.talent.id,
        jobId: id,
        resumeId,
        status: 'Application Sent',
        appliedAt: new Date(),
      })
    );
  }),

  rest.get('/api/resumes', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        mockResumes.defaultResume,
        mockResumes.alternateResume,
      ])
    );
  }),

  rest.post('/api/resumes/upload', async (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'new-resume-id',
        name: 'uploaded-resume.pdf',
        filePath: '/uploads/resumes/uploaded-resume.pdf',
        fileSize: 250000,
        isDefault: false,
      })
    );
  }),

  rest.delete('/api/resumes/:id', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Resume deleted successfully' })
    );
  }),

  rest.get('/api/jobs/applications/list', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'app-1',
          job: mockJobs.softwareEngineer,
          status: 'Under Review',
          appliedAt: new Date('2024-02-01'),
        },
      ])
    );
  }),

  rest.get('/api/jobs/saved/list', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'saved-1',
          job: mockJobs.productManager,
          createdAt: new Date('2024-02-05'),
        },
      ])
    );
  }),
];
