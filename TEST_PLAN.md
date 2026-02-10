# Comprehensive Test Plan - CardinalTalent Application

## Table of Contents
1. [Overview](#overview)
2. [Test Strategy](#test-strategy)
3. [Testing Scope](#testing-scope)
4. [Test Environment](#test-environment)
5. [Unit Testing](#unit-testing)
6. [Integration Testing](#integration-testing)
7. [End-to-End Testing](#end-to-end-testing)
8. [API Testing](#api-testing)
9. [Security Testing](#security-testing)
10. [Performance Testing](#performance-testing)
11. [Accessibility Testing](#accessibility-testing)
12. [Test Data Management](#test-data-management)
13. [Test Execution](#test-execution)
14. [Defect Management](#defect-management)
15. [Test Metrics](#test-metrics)

---

## Overview

### Application Description
CardinalTalent is a full-stack job application tracking platform built with:
- **Frontend**: React 18, TypeScript, Vite, TanStack Query, React Router, Shadcn UI
- **Backend**: Node.js, Express, PostgreSQL
- **Authentication**: JWT-based with session management
- **File Handling**: Multer for resume uploads

### Key Features
- User authentication (register, login, password reset)
- Resume management (upload, download, set default)
- Job posting and management
- Job applications tracking
- Interview scheduling
- Organization profiles with job requirements
- Saved jobs functionality

### Testing Objectives
- Ensure all features work as expected
- Validate data integrity and security
- Verify API endpoints functionality
- Test user workflows end-to-end
- Ensure accessibility compliance
- Validate performance under load
- Maintain code quality and coverage

---

## Test Strategy

### Testing Pyramid
```
                    /\
                   /  \
                  / E2E \
                 /--------\
                /          \
               / Integration \
              /--------------\
             /                \
            /   Unit Tests     \
           /____________________\
```

### Test Types Distribution
- **Unit Tests**: 60% - Individual functions, components, utilities
- **Integration Tests**: 30% - API routes, database operations, service layer
- **E2E Tests**: 10% - Critical user workflows

### Testing Tools
- **Unit/Integration**: Vitest, React Testing Library
- **E2E**: Playwright or Cypress (to be implemented)
- **API Testing**: Supertest
- **Mocking**: MSW (Mock Service Worker), vitest mocks
- **Coverage**: Vitest coverage (c8/istanbul)

---

## Testing Scope

### In Scope
✅ All API endpoints (auth, jobs, resumes, organizations)
✅ Frontend components and pages
✅ Authentication and authorization flows
✅ Database operations and queries
✅ File upload/download functionality
✅ Form validations (Zod schemas)
✅ User workflows (job application, interview scheduling)
✅ Error handling and edge cases
✅ Security vulnerabilities
✅ Accessibility standards (WCAG 2.1 AA)

### Out of Scope
❌ Third-party library internals
❌ Browser compatibility (assumed modern browsers)
❌ Email delivery (mocked in tests)
❌ Production infrastructure

---

## Test Environment

### Development Environment
- Node.js v18+
- PostgreSQL 14+
- Test database: `cardinaltalent_test`
- Environment variables: `.env.test`

### Test Database Setup
```sql
-- Separate test database
CREATE DATABASE cardinaltalent_test;

-- Run migrations before tests
npm run migrate:test
```

### Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts']
    }
  }
});
```

---

## Unit Testing

### Frontend Components

#### 1. UI Components (Shadcn)
**Test Coverage:**
- Button states (default, disabled, loading)
- Form inputs (validation, error states)
- Dialog/Modal open/close
- Toast notifications
- Dropdown menus
- Date pickers

**Example Test:**
```typescript
// src/components/ui/button.test.tsx
describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
});
```

#### 2. Page Components
**Test Coverage:**
- Login page (form validation, submission)
- Register page (role selection, validation)
- Dashboard (data display, loading states)
- Job listing (filtering, sorting, pagination)
- Job detail (application flow)
- Resume management (upload, delete)
- Profile settings

**Example Test:**
```typescript
// src/pages/Login.test.tsx
describe('Login Page', () => {
  it('displays validation errors for empty fields', async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid credentials', async () => {
    const mockLogin = vi.fn();
    render(<Login onLogin={mockLogin} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});
```

#### 3. Custom Hooks
**Test Coverage:**
- useAuth (login, logout, session management)
- useJobs (fetch, filter, save)
- useResumes (upload, delete, set default)
- Form hooks (validation, submission)

**Example Test:**
```typescript
// src/hooks/useAuth.test.ts
describe('useAuth Hook', () => {
  it('returns user data when authenticated', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createAuthWrapper({ user: mockUser })
    });
    
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles logout correctly', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.logout();
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

### Backend Services

#### 1. Authentication Service
**Test Coverage:**
- Password hashing (bcrypt)
- JWT token generation/validation
- Session creation/deletion
- Password reset token generation
- Email verification

**Example Test:**
```typescript
// server/services/auth.service.test.ts
describe('AuthService', () => {
  describe('hashPassword', () => {
    it('hashes password correctly', async () => {
      const password = 'testPassword123';
      const hash = await AuthService.hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('returns true for matching passwords', async () => {
      const password = 'testPassword123';
      const hash = await AuthService.hashPassword(password);
      const isMatch = await AuthService.comparePassword(password, hash);
      
      expect(isMatch).toBe(true);
    });

    it('returns false for non-matching passwords', async () => {
      const hash = await AuthService.hashPassword('password1');
      const isMatch = await AuthService.comparePassword('password2', hash);
      
      expect(isMatch).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('generates valid JWT token', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = AuthService.generateToken(payload);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });
});
```

#### 2. Job Service
**Test Coverage:**
- Job creation with validation
- Job listing with filters
- Job status updates
- Match score calculation
- Application submission

#### 3. Resume Service
**Test Coverage:**
- File upload validation
- File size limits
- Supported file types
- Default resume logic
- File deletion

#### 4. Organization Service
**Test Coverage:**
- Organization creation
- Requirements management
- Validation rules

### Utility Functions
**Test Coverage:**
- Date formatting (date-fns)
- Form validators (Zod schemas)
- String utilities
- Array helpers
- Type guards

---

## Integration Testing

### API Route Testing

#### 1. Authentication Routes
**Endpoints to Test:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

**Test Cases:**
```typescript
// server/routes/auth.routes.test.ts
describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('creates new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'talent'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('newuser@example.com');
    });

    it('returns 400 for duplicate email', async () => {
      await createUser({ email: 'existing@example.com' });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          role: 'talent'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('validates required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const user = await createUser({
        email: 'test@example.com',
        password: 'password123'
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.id).toBe(user.id);
    });

    it('returns 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
    });
  });
});
```

#### 2. Job Routes
**Endpoints to Test:**
- `GET /api/jobs/available` - List available jobs
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create job
- `PUT /api/jobs/:id` - Update job
- `PUT /api/jobs/:id/status` - Update job status
- `POST /api/jobs/:id/save` - Save job
- `GET /api/jobs/saved/list` - Get saved jobs
- `DELETE /api/jobs/saved/:id` - Unsave job
- `POST /api/jobs/:id/apply` - Apply to job
- `GET /api/jobs/applications/list` - Get applications
- `GET /api/jobs/interviews/list` - Get interviews
- `POST /api/jobs/interviews` - Schedule interview
- `GET /api/jobs/:id/applications` - Get job applications

**Test Cases:**
```typescript
describe('Job Routes', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createUser({ role: 'talent' });
    userId = user.id;
    authToken = generateToken(user);
  });

  describe('GET /api/jobs/available', () => {
    it('returns list of active jobs', async () => {
      await createJob({ status: 'active' });
      await createJob({ status: 'active' });
      await createJob({ status: 'closed' });
      
      const response = await request(app)
        .get('/api/jobs/available')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('requires authentication', async () => {
      const response = await request(app).get('/api/jobs/available');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/jobs/:id/apply', () => {
    it('creates job application', async () => {
      const job = await createJob();
      const resume = await createResume({ userId });
      
      const response = await request(app)
        .post(`/api/jobs/${job.id}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ resumeId: resume.id });
      
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('Application Sent');
    });

    it('prevents duplicate applications', async () => {
      const job = await createJob();
      await createApplication({ userId, jobId: job.id });
      
      const response = await request(app)
        .post(`/api/jobs/${job.id}/apply`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
    });
  });
});
```

#### 3. Resume Routes
**Endpoints to Test:**
- `GET /api/resumes` - Get user resumes
- `POST /api/resumes/upload` - Upload resume
- `PUT /api/resumes/:id/default` - Set default resume
- `DELETE /api/resumes/:id` - Delete resume
- `GET /api/resumes/:id/download` - Download resume

**Test Cases:**
```typescript
describe('Resume Routes', () => {
  describe('POST /api/resumes/upload', () => {
    it('uploads PDF file successfully', async () => {
      const response = await request(app)
        .post('/api/resumes/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake pdf content'), {
          filename: 'resume.pdf',
          contentType: 'application/pdf'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('resume.pdf');
    });

    it('rejects files over size limit', async () => {
      const largeFile = Buffer.alloc(6 * 1024 * 1024); // 6MB
      
      const response = await request(app)
        .post('/api/resumes/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFile, 'large.pdf');
      
      expect(response.status).toBe(400);
    });

    it('rejects unsupported file types', async () => {
      const response = await request(app)
        .post('/api/resumes/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('content'), 'file.exe');
      
      expect(response.status).toBe(400);
    });
  });
});
```

#### 4. Organization Routes
**Endpoints to Test:**
- `GET /api/organizations/:companyName` - Get organization
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:companyName/requirements` - Get requirements
- `POST /api/organizations/:companyName/requirements` - Add requirement
- `PUT /api/organizations/requirements/:id` - Update requirement
- `DELETE /api/organizations/requirements/:id` - Delete requirement

### Database Integration Tests

**Test Coverage:**
- CRUD operations for all tables
- Foreign key constraints
- Cascade deletes
- Unique constraints
- Index performance
- Transaction rollbacks

**Example Test:**
```typescript
describe('Database Operations', () => {
  describe('User Operations', () => {
    it('creates user with all fields', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'talent'
      };
      
      const user = await db.users.create(userData);
      
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('enforces unique email constraint', async () => {
      await db.users.create({ email: 'test@example.com' });
      
      await expect(
        db.users.create({ email: 'test@example.com' })
      ).rejects.toThrow(/unique constraint/i);
    });
  });

  describe('Cascade Deletes', () => {
    it('deletes user sessions when user is deleted', async () => {
      const user = await createUser();
      const session = await createSession({ userId: user.id });
      
      await db.users.delete(user.id);
      
      const deletedSession = await db.sessions.findById(session.id);
      expect(deletedSession).toBeNull();
    });

    it('deletes applications when job is deleted', async () => {
      const job = await createJob();
      const application = await createApplication({ jobId: job.id });
      
      await db.jobs.delete(job.id);
      
      const deletedApp = await db.applications.findById(application.id);
      expect(deletedApp).toBeNull();
    });
  });
});
```

### Middleware Testing

**Test Coverage:**
- `authenticateToken` - JWT validation
- Error handling middleware
- CORS configuration
- Request logging
- Rate limiting (if implemented)

**Example Test:**
```typescript
describe('Authentication Middleware', () => {
  it('allows request with valid token', async () => {
    const token = generateToken({ userId: '123' });
    
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).not.toBe(401);
  });

  it('rejects request without token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('rejects request with invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_token');
    
    expect(response.status).toBe(401);
  });

  it('rejects expired token', async () => {
    const expiredToken = generateToken(
      { userId: '123' },
      { expiresIn: '-1h' }
    );
    
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    
    expect(response.status).toBe(401);
  });
});
```

---

## End-to-End Testing

### Critical User Workflows

#### 1. User Registration and Login Flow
**Scenario:**
1. Navigate to registration page
2. Fill in registration form
3. Submit and verify account creation
4. Logout
5. Login with credentials
6. Verify dashboard access

**Test Implementation:**
```typescript
// e2e/auth.spec.ts
test('complete registration and login flow', async ({ page }) => {
  await page.goto('/register');
  
  await page.fill('[name="email"]', 'newuser@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.fill('[name="firstName"]', 'John');
  await page.fill('[name="lastName"]', 'Doe');
  await page.selectOption('[name="role"]', 'talent');
  
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
  
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  
  await expect(page).toHaveURL('/login');
  
  await page.fill('[name="email"]', 'newuser@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
});
```

#### 2. Job Application Flow
**Scenario:**
1. Login as talent user
2. Browse available jobs
3. Filter jobs by criteria
4. View job details
5. Upload resume
6. Apply to job
7. Verify application in "My Applications"

**Test Implementation:**
```typescript
test('apply to job with resume', async ({ page }) => {
  await loginAs(page, 'talent');
  
  await page.goto('/jobs');
  await page.fill('[placeholder="Search jobs"]', 'Software Engineer');
  await page.click('button:has-text("Search")');
  
  await page.click('.job-card:first-child');
  await expect(page).toHaveURL(/\/jobs\/[a-z0-9-]+/);
  
  await page.click('button:has-text("Apply")');
  
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Upload Resume")')
  ]);
  await fileChooser.setFiles('./fixtures/sample-resume.pdf');
  
  await page.click('button:has-text("Submit Application")');
  
  await expect(page.locator('.toast')).toContainText('Application submitted');
  
  await page.goto('/applications');
  await expect(page.locator('.application-card')).toContainText('Software Engineer');
});
```

#### 3. Job Posting Flow (Employer)
**Scenario:**
1. Login as employer
2. Navigate to "Post Job"
3. Fill job details
4. Add requirements
5. Publish job
6. Verify job appears in listings

#### 4. Interview Scheduling Flow
**Scenario:**
1. Employer reviews applications
2. Selects candidate
3. Schedules interview
4. Candidate receives notification
5. Interview appears in calendar

#### 5. Resume Management Flow
**Scenario:**
1. Upload multiple resumes
2. Set default resume
3. Download resume
4. Delete old resume
5. Verify default resume used in applications

### Cross-Browser Testing
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Responsive Testing
- Desktop (1920x1080, 1366x768)
- Tablet (768x1024)
- Mobile (375x667, 414x896)

---

## API Testing

### REST API Test Suite

#### Request/Response Validation
- Correct HTTP methods
- Proper status codes
- Response body structure
- Error message format
- Content-Type headers

#### Authentication & Authorization
- Token-based authentication
- Role-based access control
- Session management
- Token expiration

#### Data Validation
- Input validation (Zod schemas)
- SQL injection prevention
- XSS prevention
- CSRF protection

#### Error Handling
- 400 Bad Request (validation errors)
- 401 Unauthorized (missing/invalid token)
- 403 Forbidden (insufficient permissions)
- 404 Not Found (resource doesn't exist)
- 409 Conflict (duplicate resources)
- 500 Internal Server Error (server errors)

**Example Test Suite:**
```typescript
describe('API Error Handling', () => {
  it('returns 400 for invalid request body', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' }); // Missing required fields
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it('returns 404 for non-existent resource', async () => {
    const response = await request(app)
      .get('/api/jobs/non-existent-id')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(404);
  });

  it('returns 409 for duplicate resource', async () => {
    await createJob({ title: 'Unique Job' });
    
    const response = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Unique Job', /* ... */ });
    
    expect(response.status).toBe(409);
  });
});
```

### API Performance Testing
- Response time < 200ms for simple queries
- Response time < 500ms for complex queries
- Pagination for large datasets
- Database query optimization

---

## Security Testing

### Authentication Security
- [ ] Password strength requirements
- [ ] Password hashing (bcrypt with salt)
- [ ] JWT token security (secret key, expiration)
- [ ] Session timeout
- [ ] Brute force protection
- [ ] Account lockout after failed attempts

### Authorization Security
- [ ] Role-based access control (RBAC)
- [ ] Resource ownership validation
- [ ] Privilege escalation prevention
- [ ] API endpoint authorization

### Input Validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Command injection prevention
- [ ] Path traversal prevention
- [ ] File upload validation

### Data Security
- [ ] Sensitive data encryption
- [ ] Password not exposed in responses
- [ ] Secure session storage
- [ ] HTTPS enforcement (production)
- [ ] CORS configuration

### File Upload Security
- [ ] File type validation
- [ ] File size limits
- [ ] Malicious file detection
- [ ] Secure file storage
- [ ] Access control for downloads

**Security Test Examples:**
```typescript
describe('Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    it('prevents SQL injection in search', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .query({ search: "'; DROP TABLE users; --" })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).not.toBe(500);
      
      const users = await db.users.findAll();
      expect(users.length).toBeGreaterThan(0);
    });
  });

  describe('XSS Prevention', () => {
    it('sanitizes user input', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '<script>alert("XSS")</script>',
          description: 'Job description'
        });
      
      expect(response.body.title).not.toContain('<script>');
    });
  });

  describe('Authorization', () => {
    it('prevents access to other users data', async () => {
      const user1 = await createUser();
      const user2 = await createUser();
      const resume = await createResume({ userId: user1.id });
      
      const token2 = generateToken(user2);
      
      const response = await request(app)
        .delete(`/api/resumes/${resume.id}`)
        .set('Authorization', `Bearer ${token2}`);
      
      expect(response.status).toBe(403);
    });
  });
});
```

---

## Performance Testing

### Load Testing
**Objectives:**
- Test system under expected load
- Identify bottlenecks
- Measure response times
- Test concurrent users

**Scenarios:**
1. **Normal Load**: 100 concurrent users
2. **Peak Load**: 500 concurrent users
3. **Stress Test**: 1000+ concurrent users

**Metrics to Monitor:**
- Response time (p50, p95, p99)
- Throughput (requests/second)
- Error rate
- Database connection pool
- Memory usage
- CPU usage

**Tools:**
- Apache JMeter
- k6
- Artillery

**Example k6 Test:**
```javascript
// performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200
    { duration: '5m', target: 200 }, // Stay at 200
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

export default function () {
  const token = login();
  
  const jobsRes = http.get('http://localhost:3000/api/jobs/available', {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  check(jobsRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### Database Performance
- Query optimization
- Index usage
- Connection pooling
- Query execution plans
- N+1 query prevention

**Test Cases:**
```typescript
describe('Database Performance', () => {
  it('uses index for email lookup', async () => {
    const explain = await db.query(
      'EXPLAIN ANALYZE SELECT * FROM users WHERE email = $1',
      ['test@example.com']
    );
    
    expect(explain.rows[0]['QUERY PLAN']).toContain('Index Scan');
  });

  it('handles large result sets with pagination', async () => {
    await createManyJobs(1000);
    
    const start = Date.now();
    const jobs = await db.jobs.findAll({ limit: 20, offset: 0 });
    const duration = Date.now() - start;
    
    expect(jobs.length).toBe(20);
    expect(duration).toBeLessThan(100);
  });
});
```

---

## Accessibility Testing

### WCAG 2.1 AA Compliance

#### Keyboard Navigation
- [ ] All interactive elements accessible via keyboard
- [ ] Logical tab order
- [ ] Visible focus indicators
- [ ] Skip navigation links
- [ ] Keyboard shortcuts documented

#### Screen Reader Support
- [ ] Semantic HTML elements
- [ ] ARIA labels and roles
- [ ] Alt text for images
- [ ] Form labels properly associated
- [ ] Error messages announced

#### Visual Accessibility
- [ ] Color contrast ratio ≥ 4.5:1 (normal text)
- [ ] Color contrast ratio ≥ 3:1 (large text)
- [ ] Text resizable up to 200%
- [ ] No information conveyed by color alone
- [ ] Focus indicators visible

#### Form Accessibility
- [ ] Labels for all inputs
- [ ] Error messages descriptive
- [ ] Required fields indicated
- [ ] Validation messages accessible
- [ ] Autocomplete attributes

**Automated Testing:**
```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('job listing page is keyboard navigable', async ({ page }) => {
  await page.goto('/jobs');
  
  await page.keyboard.press('Tab');
  const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
  expect(firstFocused).toBe('A'); // Skip to content link
  
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  
  // Verify navigation worked
});
```

**Manual Testing Checklist:**
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Navigate entire app with keyboard only
- [ ] Test with browser zoom at 200%
- [ ] Test with high contrast mode
- [ ] Test with reduced motion preference

---

## Test Data Management

### Test Data Strategy

#### 1. Test Fixtures
**Location:** `src/test/fixtures/`

**Files:**
- `users.fixture.ts` - Sample user data
- `jobs.fixture.ts` - Sample job postings
- `resumes.fixture.ts` - Sample resume metadata
- `organizations.fixture.ts` - Sample organizations

**Example:**
```typescript
// src/test/fixtures/users.fixture.ts
export const mockUsers = {
  talent: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'talent@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'talent',
    emailVerified: true,
  },
  employer: {
    id: '123e4567-e89b-12d3-a456-426614174001',
    email: 'employer@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'employer',
    companyName: 'Tech Corp',
    emailVerified: true,
  },
  recruiter: {
    id: '123e4567-e89b-12d3-a456-426614174002',
    email: 'recruiter@example.com',
    firstName: 'Bob',
    lastName: 'Johnson',
    role: 'recruiter',
    emailVerified: true,
  },
};
```

#### 2. Factory Functions
**Location:** `src/test/factories/`

**Purpose:** Generate test data dynamically

**Example:**
```typescript
// src/test/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export const createUserFactory = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  passwordHash: faker.string.alphanumeric(60),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  role: 'talent',
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createJobFactory = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.person.jobTitle(),
  company: faker.company.name(),
  location: faker.location.city(),
  type: faker.helpers.arrayElement(['remote', 'hybrid', 'onsite']),
  salary: `$${faker.number.int({ min: 50, max: 200 })}k - $${faker.number.int({ min: 100, max: 300 })}k`,
  skills: faker.helpers.arrayElements(['JavaScript', 'TypeScript', 'React', 'Node.js'], 3),
  description: faker.lorem.paragraphs(3),
  status: 'active',
  postedAt: new Date(),
  ...overrides,
});
```

#### 3. Database Seeding
**Test Database Setup:**
```typescript
// src/test/helpers/db-setup.ts
export async function setupTestDatabase() {
  await db.query('BEGIN');
  
  await db.query('TRUNCATE TABLE users CASCADE');
  await db.query('TRUNCATE TABLE ct_job CASCADE');
  await db.query('TRUNCATE TABLE resumes CASCADE');
  await db.query('TRUNCATE TABLE organizations CASCADE');
  
  await db.query('COMMIT');
}

export async function seedTestData() {
  const users = await Promise.all([
    createUser(mockUsers.talent),
    createUser(mockUsers.employer),
    createUser(mockUsers.recruiter),
  ]);
  
  const jobs = await Promise.all([
    createJob({ company: 'Tech Corp' }),
    createJob({ company: 'StartupXYZ' }),
  ]);
  
  return { users, jobs };
}

export async function cleanupTestDatabase() {
  await setupTestDatabase();
}
```

#### 4. Mock Data for Frontend
**MSW (Mock Service Worker):**
```typescript
// src/test/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/jobs/available', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        createJobFactory(),
        createJobFactory(),
        createJobFactory(),
      ])
    );
  }),
  
  rest.post('/api/auth/login', async (req, res, ctx) => {
    const { email, password } = await req.json();
    
    if (email === 'test@example.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json({
          token: 'mock-jwt-token',
          user: mockUsers.talent,
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ error: 'Invalid credentials' })
    );
  }),
];
```

### Test Data Cleanup
**Strategy:**
- Use transactions for unit tests (rollback after each test)
- Truncate tables before integration tests
- Delete uploaded files after tests
- Clear Redis cache (if used)

**Implementation:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
    globalSetup: './src/test/global-setup.ts',
    globalTeardown: './src/test/global-teardown.ts',
  },
});

// src/test/global-setup.ts
export async function setup() {
  await setupTestDatabase();
  await seedTestData();
}

// src/test/global-teardown.ts
export async function teardown() {
  await cleanupTestDatabase();
  await db.end();
}
```

---

## Test Execution

### Running Tests

#### Local Development
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/components/Button.test.tsx

# Run tests with coverage
npm test -- --coverage

# Run tests matching pattern
npm test -- --grep "authentication"

# Run only unit tests
npm test -- src/**/*.test.ts

# Run only integration tests
npm test -- server/**/*.test.ts
```

#### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: cardinaltalent_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run database migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/cardinaltalent_test
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/cardinaltalent_test
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/cardinaltalent_test
```

### Test Organization

#### Directory Structure
```
project-root/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   └── Login.test.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useAuth.test.ts
│   └── test/
│       ├── setup.ts
│       ├── fixtures/
│       ├── factories/
│       ├── mocks/
│       └── helpers/
├── server/
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   └── auth.routes.test.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── auth.service.test.ts
│   └── test/
│       ├── setup.ts
│       └── helpers/
└── e2e/
    ├── auth.spec.ts
    ├── jobs.spec.ts
    └── fixtures/
```

### Test Naming Conventions
```typescript
// Component tests
describe('ComponentName', () => {
  describe('when condition', () => {
    it('should do something', () => {});
  });
});

// API tests
describe('POST /api/endpoint', () => {
  it('returns 200 with valid data', async () => {});
  it('returns 400 with invalid data', async () => {});
});

// Service tests
describe('ServiceName', () => {
  describe('methodName', () => {
    it('handles success case', () => {});
    it('handles error case', () => {});
  });
});
```

---

## Defect Management

### Bug Reporting Template
```markdown
## Bug Report

**Title:** [Clear, concise description]

**Priority:** Critical / High / Medium / Low

**Environment:**
- Browser: Chrome 120
- OS: macOS 14
- Node version: 18.17.0

**Steps to Reproduce:**
1. Navigate to /jobs
2. Click on first job
3. Click "Apply" button
4. ...

**Expected Behavior:**
Application should be submitted successfully

**Actual Behavior:**
Error message "Failed to submit application" appears

**Screenshots:**
[Attach screenshots]

**Console Errors:**
```
Error: Network request failed
  at fetch (...)
```

**Additional Context:**
- Happens only with specific job IDs
- Works fine in development environment
```

### Severity Levels
- **Critical**: System crash, data loss, security vulnerability
- **High**: Major feature broken, no workaround
- **Medium**: Feature partially broken, workaround exists
- **Low**: Minor issue, cosmetic problem

### Bug Lifecycle
1. **New** - Bug reported
2. **Confirmed** - Bug reproduced and validated
3. **In Progress** - Developer working on fix
4. **Fixed** - Fix implemented
5. **Testing** - QA verifying fix
6. **Closed** - Fix verified and deployed
7. **Reopened** - Bug still exists

---

## Test Metrics

### Code Coverage Targets
- **Overall Coverage**: ≥ 80%
- **Unit Test Coverage**: ≥ 85%
- **Integration Test Coverage**: ≥ 75%
- **Critical Paths**: 100%

**Coverage Report:**
```bash
npm test -- --coverage

# Output:
File                     | % Stmts | % Branch | % Funcs | % Lines
-------------------------|---------|----------|---------|--------
All files                |   82.5  |   78.3   |   85.1  |   82.8
 components/             |   88.2  |   82.5   |   90.3  |   88.5
 pages/                  |   75.3  |   70.2   |   78.9  |   75.8
 hooks/                  |   92.1  |   88.7   |   95.2  |   92.5
 services/               |   80.5  |   75.8   |   82.3  |   80.9
```

### Test Execution Metrics
- **Total Tests**: Track number of tests
- **Pass Rate**: % of passing tests
- **Execution Time**: Time to run full suite
- **Flaky Tests**: Tests that intermittently fail

**Example Dashboard:**
```
Test Execution Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tests:        487
Passed:            482 (98.9%)
Failed:              3 (0.6%)
Skipped:             2 (0.4%)
Execution Time:    2m 34s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Quality Gates
**Pre-Merge Requirements:**
- [ ] All tests passing
- [ ] Code coverage ≥ 80%
- [ ] No critical/high severity bugs
- [ ] Linter passing
- [ ] Type checking passing
- [ ] Security scan passing

### Continuous Monitoring
- Track test execution trends
- Monitor flaky test rate
- Measure test suite performance
- Track bug discovery rate
- Monitor production error rates

---

## Test Schedule

### Sprint Testing Activities

#### Week 1: Planning & Setup
- Review user stories and acceptance criteria
- Create test cases for new features
- Update test plan
- Set up test environment

#### Week 2-3: Development & Testing
- Write unit tests alongside development
- Perform integration testing
- Execute regression tests
- Log and track defects

#### Week 4: Release Testing
- Execute full regression suite
- Perform E2E testing
- Security testing
- Performance testing
- UAT (User Acceptance Testing)

### Regression Testing
**Frequency:** Before each release
**Scope:** All critical user workflows
**Duration:** 4-6 hours

**Test Suite:**
- Authentication flows
- Job application process
- Resume management
- Organization management
- Interview scheduling
- Search and filtering
- File uploads/downloads

---

## Appendix

### Test Tools & Libraries

#### Testing Frameworks
- **Vitest**: Unit and integration testing
- **React Testing Library**: Component testing
- **Playwright/Cypress**: E2E testing
- **Supertest**: API testing

#### Mocking & Fixtures
- **MSW**: API mocking
- **@faker-js/faker**: Test data generation
- **vitest mocks**: Function mocking

#### Assertion Libraries
- **@testing-library/jest-dom**: DOM assertions
- **vitest expect**: General assertions

#### Coverage Tools
- **c8/istanbul**: Code coverage
- **Codecov**: Coverage reporting

#### Accessibility
- **@axe-core/playwright**: Accessibility testing
- **pa11y**: Automated accessibility testing

### Useful Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test
npm run test:watch
npm test -- --coverage

# Run linter
npm run lint

# Run type checking
npx tsc --noEmit

# Database migrations
npm run migrate

# Build for production
npm run build

# Run E2E tests
npm run test:e2e
```

### Environment Variables

```env
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/cardinaltalent_test
JWT_SECRET=test-secret-key
SESSION_SECRET=test-session-secret
PORT=3001
UPLOAD_DIR=./test-uploads
```

### Resources
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

## Conclusion

This comprehensive test plan provides a structured approach to testing the CardinalTalent application across all layers - from unit tests to E2E tests, security to performance, and accessibility to API testing.

### Key Takeaways
1. **Test Early, Test Often**: Write tests alongside development
2. **Automate Everything**: Maximize automation to catch regressions
3. **Focus on Quality**: Maintain high code coverage and test quality
4. **Security First**: Always test for security vulnerabilities
5. **User-Centric**: Test real user workflows and scenarios
6. **Continuous Improvement**: Regularly review and update test plan

### Next Steps
1. Implement missing test infrastructure (E2E setup)
2. Achieve 80%+ code coverage
3. Set up CI/CD pipeline with automated testing
4. Establish test data management strategy
5. Create test documentation for team
6. Schedule regular test plan reviews

---

**Document Version:** 1.0  
**Last Updated:** February 10, 2026  
**Maintained By:** QA Team
