# Testing Guide

This guide provides comprehensive information about testing in the CardinalTalent application.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Coverage](#test-coverage)
6. [CI/CD Integration](#cicd-integration)

## Overview

The CardinalTalent application uses a comprehensive testing strategy that includes:

- **Unit Tests**: Testing individual components, functions, and services in isolation
- **Integration Tests**: Testing API routes and database interactions
- **End-to-End (E2E) Tests**: Testing complete user workflows in a browser environment

### Testing Stack

- **Vitest**: Fast unit test framework for frontend and backend
- **React Testing Library**: Testing React components
- **Playwright**: E2E testing framework
- **MSW (Mock Service Worker)**: API mocking for frontend tests
- **Supertest**: HTTP assertion library for API testing

## Test Structure

```
ctnew/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Navbar.test.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── button.test.tsx
│   │       ├── input.test.tsx
│   │       └── card.test.tsx
│   ├── hooks/
│   │   ├── useResumes.ts
│   │   └── useResumes.test.ts
│   └── test/
│       ├── setup.ts
│       ├── fixtures/
│       │   ├── users.fixture.ts
│       │   ├── jobs.fixture.ts
│       │   └── resumes.fixture.ts
│       ├── factories/
│       │   └── index.ts
│       ├── helpers/
│       │   ├── test-utils.ts
│       │   └── test-utils.tsx
│       └── mocks/
│           ├── handlers.ts
│           └── server.ts
├── server/
│   ├── services/
│   │   └── auth.service.test.ts
│   ├── routes/
│   │   └── auth.routes.test.ts
│   ├── middleware/
│   │   └── auth.middleware.test.ts
│   └── test/
│       ├── database.integration.test.ts
│       └── helpers/
│           └── db-setup.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── job-search.spec.ts
│   ├── resume-management.spec.ts
│   ├── employer-job-posting.spec.ts
│   └── fixtures/
│       └── auth.fixture.ts
├── vitest.config.ts
└── playwright.config.ts
```

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

### Watch Mode (for development)

```bash
npm run test:watch
```

### With UI

```bash
npm run test:ui
```

### With Coverage

```bash
npm run test:coverage
```

### E2E Tests with UI

```bash
npm run test:e2e:ui
```

### E2E Tests in Headed Mode

```bash
npm run test:e2e:headed
```

### Debug E2E Tests

```bash
npm run test:e2e:debug
```

### Run All Tests (Unit + Integration + E2E)

```bash
npm run test:all
```

## Writing Tests

### Unit Tests

#### Frontend Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/helpers/test-utils';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    const button = screen.getByRole('button', { name: /click/i });
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Backend Service Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';

vi.mock('../database/connection');

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a new user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      role: 'talent',
      firstName: 'Test',
      lastName: 'User',
    };

    const result = await authService.registerUser(userData);

    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
  });
});
```

#### Hook Tests

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResumes } from '@/hooks/useResumes';

describe('useResumes Hook', () => {
  it('fetches resumes successfully', async () => {
    const { result } = renderHook(() => useResumes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.resumes).toBeDefined();
  });
});
```

### Integration Tests

#### API Route Tests

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { setupTestDatabase, cleanupTestDatabase } from './helpers/db-setup';

describe('Auth Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  it('POST /api/auth/register - successful registration', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#',
        role: 'talent',
        firstName: 'Test',
        lastName: 'User',
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
  });
});
```

### E2E Tests

#### Authentication Flow

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/auth?mode=signup');
    
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
```

#### Using Fixtures

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Job Search', () => {
  test('should browse jobs', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/jobs');
    
    await expect(authenticatedPage.getByText(/available jobs/i)).toBeVisible();
  });
});
```

## Test Coverage

### Viewing Coverage Reports

After running tests with coverage:

```bash
npm run test:coverage
```

Open the HTML report:

```bash
open coverage/index.html
```

### Coverage Goals

- **Overall**: 80%+
- **Critical paths**: 90%+
- **Business logic**: 95%+

### Coverage Exclusions

The following are excluded from coverage:

- Test files (`*.test.ts`, `*.spec.ts`)
- Type definitions (`*.d.ts`)
- Configuration files
- Build output directories

## CI/CD Integration

### GitHub Actions Workflow

The project includes a comprehensive CI/CD pipeline that runs on every push and pull request:

1. **Lint**: Code quality checks
2. **Unit Tests**: Fast feedback on component/function changes
3. **Integration Tests**: API and database testing
4. **E2E Tests**: Full user workflow validation
5. **Build**: Application compilation
6. **Deploy**: Automatic deployment to production (main branch only)

### Running Tests Locally Before Push

```bash
npm run lint
npm run test:all
```

### Test Database Setup

For integration and E2E tests, a PostgreSQL test database is required:

```bash
# Set environment variables
export DATABASE_URL=postgresql://test:test@localhost:5432/cardinaltalent_test
export JWT_SECRET=test-secret-key
export NODE_ENV=test

# Run migrations
npm run migrate
```

## Best Practices

### 1. Test Naming

- Use descriptive test names that explain what is being tested
- Follow the pattern: "should [expected behavior] when [condition]"

```typescript
it('should display error message when login fails', async () => {
  // test implementation
});
```

### 2. Test Organization

- Group related tests using `describe` blocks
- Use `beforeEach` and `afterEach` for setup and cleanup
- Keep tests independent and isolated

### 3. Mocking

- Mock external dependencies (APIs, databases, services)
- Use MSW for API mocking in frontend tests
- Use `vi.mock()` for module mocking in Vitest

### 4. Assertions

- Use specific assertions (`toHaveBeenCalledWith` vs `toHaveBeenCalled`)
- Test both positive and negative cases
- Verify error handling

### 5. Async Testing

- Always use `async/await` for asynchronous operations
- Use `waitFor` for waiting on async state changes
- Set appropriate timeouts for slow operations

### 6. Test Data

- Use fixtures for consistent test data
- Use factories for dynamic test data generation
- Clean up test data after each test

### 7. E2E Testing

- Test critical user workflows
- Use page objects for reusable page interactions
- Test across multiple browsers and devices
- Keep E2E tests focused and fast

## Troubleshooting

### Tests Failing Locally

1. Ensure all dependencies are installed: `npm ci`
2. Check database connection and migrations
3. Verify environment variables are set
4. Clear test database: `npm run migrate`

### E2E Tests Timing Out

1. Increase timeout in `playwright.config.ts`
2. Check if application is running on correct port
3. Verify database is accessible
4. Use `--headed` mode to debug visually

### Coverage Not Updating

1. Delete coverage directory: `rm -rf coverage`
2. Run tests with coverage flag: `npm run test:coverage`
3. Check coverage configuration in `vitest.config.ts`

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
