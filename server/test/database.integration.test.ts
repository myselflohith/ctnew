import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../database/connection';
import { users, jobs, resumes, applications } from '../database/schema';
import { eq } from 'drizzle-orm';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from './helpers/db-setup';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Users Table', () => {
    it('creates a new user', async () => {
      const [user] = await db
        .insert(users)
        .values({
          email: 'test@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Test',
          lastName: 'User',
        })
        .returning();

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('talent');
      expect(user.id).toBeDefined();
    });

    it('enforces unique email constraint', async () => {
      await db.insert(users).values({
        email: 'duplicate@example.com',
        password: 'hashedpassword',
        role: 'talent',
        firstName: 'First',
        lastName: 'User',
      });

      await expect(
        db.insert(users).values({
          email: 'duplicate@example.com',
          password: 'hashedpassword',
          role: 'employer',
          firstName: 'Second',
          lastName: 'User',
        })
      ).rejects.toThrow();
    });

    it('retrieves user by email', async () => {
      await db.insert(users).values({
        email: 'find@example.com',
        password: 'hashedpassword',
        role: 'talent',
        firstName: 'Find',
        lastName: 'Me',
      });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, 'find@example.com'));

      expect(user).toBeDefined();
      expect(user.email).toBe('find@example.com');
    });

    it('updates user information', async () => {
      const [user] = await db
        .insert(users)
        .values({
          email: 'update@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Old',
          lastName: 'Name',
        })
        .returning();

      const [updated] = await db
        .update(users)
        .set({ firstName: 'New', lastName: 'Name' })
        .where(eq(users.id, user.id))
        .returning();

      expect(updated.firstName).toBe('New');
      expect(updated.lastName).toBe('Name');
    });

    it('deletes user', async () => {
      const [user] = await db
        .insert(users)
        .values({
          email: 'delete@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Delete',
          lastName: 'Me',
        })
        .returning();

      await db.delete(users).where(eq(users.id, user.id));

      const [deleted] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id));

      expect(deleted).toBeUndefined();
    });
  });

  describe('Jobs Table', () => {
    it('creates a new job', async () => {
      const [employer] = await db
        .insert(users)
        .values({
          email: 'employer@example.com',
          password: 'hashedpassword',
          role: 'employer',
          firstName: 'Employer',
          lastName: 'User',
        })
        .returning();

      const [job] = await db
        .insert(jobs)
        .values({
          title: 'Software Engineer',
          description: 'Job description',
          location: 'Remote',
          salary: '$100k - $150k',
          employerId: employer.id,
          status: 'active',
        })
        .returning();

      expect(job).toBeDefined();
      expect(job.title).toBe('Software Engineer');
      expect(job.employerId).toBe(employer.id);
    });

    it('retrieves jobs by employer', async () => {
      const [employer] = await db
        .insert(users)
        .values({
          email: 'employer2@example.com',
          password: 'hashedpassword',
          role: 'employer',
          firstName: 'Employer',
          lastName: 'Two',
        })
        .returning();

      await db.insert(jobs).values([
        {
          title: 'Job 1',
          description: 'Description 1',
          location: 'Remote',
          salary: '$100k',
          employerId: employer.id,
          status: 'active',
        },
        {
          title: 'Job 2',
          description: 'Description 2',
          location: 'On-site',
          salary: '$120k',
          employerId: employer.id,
          status: 'active',
        },
      ]);

      const employerJobs = await db
        .select()
        .from(jobs)
        .where(eq(jobs.employerId, employer.id));

      expect(employerJobs).toHaveLength(2);
    });

    it('updates job status', async () => {
      const [employer] = await db
        .insert(users)
        .values({
          email: 'employer3@example.com',
          password: 'hashedpassword',
          role: 'employer',
          firstName: 'Employer',
          lastName: 'Three',
        })
        .returning();

      const [job] = await db
        .insert(jobs)
        .values({
          title: 'Job to Update',
          description: 'Description',
          location: 'Remote',
          salary: '$100k',
          employerId: employer.id,
          status: 'active',
        })
        .returning();

      const [updated] = await db
        .update(jobs)
        .set({ status: 'closed' })
        .where(eq(jobs.id, job.id))
        .returning();

      expect(updated.status).toBe('closed');
    });
  });

  describe('Resumes Table', () => {
    it('creates a new resume', async () => {
      const [talent] = await db
        .insert(users)
        .values({
          email: 'talent@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Talent',
          lastName: 'User',
        })
        .returning();

      const [resume] = await db
        .insert(resumes)
        .values({
          userId: talent.id,
          fileName: 'resume.pdf',
          fileUrl: 'https://example.com/resume.pdf',
          fileSize: 1024,
        })
        .returning();

      expect(resume).toBeDefined();
      expect(resume.userId).toBe(talent.id);
      expect(resume.fileName).toBe('resume.pdf');
    });

    it('retrieves resumes by user', async () => {
      const [talent] = await db
        .insert(users)
        .values({
          email: 'talent2@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Talent',
          lastName: 'Two',
        })
        .returning();

      await db.insert(resumes).values([
        {
          userId: talent.id,
          fileName: 'resume1.pdf',
          fileUrl: 'https://example.com/resume1.pdf',
          fileSize: 1024,
        },
        {
          userId: talent.id,
          fileName: 'resume2.pdf',
          fileUrl: 'https://example.com/resume2.pdf',
          fileSize: 2048,
        },
      ]);

      const userResumes = await db
        .select()
        .from(resumes)
        .where(eq(resumes.userId, talent.id));

      expect(userResumes).toHaveLength(2);
    });

    it('deletes resume', async () => {
      const [talent] = await db
        .insert(users)
        .values({
          email: 'talent3@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Talent',
          lastName: 'Three',
        })
        .returning();

      const [resume] = await db
        .insert(resumes)
        .values({
          userId: talent.id,
          fileName: 'delete-resume.pdf',
          fileUrl: 'https://example.com/delete-resume.pdf',
          fileSize: 1024,
        })
        .returning();

      await db.delete(resumes).where(eq(resumes.id, resume.id));

      const [deleted] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, resume.id));

      expect(deleted).toBeUndefined();
    });
  });

  describe('Applications Table', () => {
    it('creates a new application', async () => {
      const [talent] = await db
        .insert(users)
        .values({
          email: 'applicant@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Applicant',
          lastName: 'User',
        })
        .returning();

      const [employer] = await db
        .insert(users)
        .values({
          email: 'hiring@example.com',
          password: 'hashedpassword',
          role: 'employer',
          firstName: 'Hiring',
          lastName: 'Manager',
        })
        .returning();

      const [job] = await db
        .insert(jobs)
        .values({
          title: 'Open Position',
          description: 'Description',
          location: 'Remote',
          salary: '$100k',
          employerId: employer.id,
          status: 'active',
        })
        .returning();

      const [application] = await db
        .insert(applications)
        .values({
          jobId: job.id,
          userId: talent.id,
          status: 'pending',
        })
        .returning();

      expect(application).toBeDefined();
      expect(application.jobId).toBe(job.id);
      expect(application.userId).toBe(talent.id);
      expect(application.status).toBe('pending');
    });

    it('prevents duplicate applications', async () => {
      const [talent] = await db
        .insert(users)
        .values({
          email: 'applicant2@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Applicant',
          lastName: 'Two',
        })
        .returning();

      const [employer] = await db
        .insert(users)
        .values({
          email: 'hiring2@example.com',
          password: 'hashedpassword',
          role: 'employer',
          firstName: 'Hiring',
          lastName: 'Manager',
        })
        .returning();

      const [job] = await db
        .insert(jobs)
        .values({
          title: 'Position',
          description: 'Description',
          location: 'Remote',
          salary: '$100k',
          employerId: employer.id,
          status: 'active',
        })
        .returning();

      await db.insert(applications).values({
        jobId: job.id,
        userId: talent.id,
        status: 'pending',
      });

      await expect(
        db.insert(applications).values({
          jobId: job.id,
          userId: talent.id,
          status: 'pending',
        })
      ).rejects.toThrow();
    });

    it('updates application status', async () => {
      const [talent] = await db
        .insert(users)
        .values({
          email: 'applicant3@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Applicant',
          lastName: 'Three',
        })
        .returning();

      const [employer] = await db
        .insert(users)
        .values({
          email: 'hiring3@example.com',
          password: 'hashedpassword',
          role: 'employer',
          firstName: 'Hiring',
          lastName: 'Manager',
        })
        .returning();

      const [job] = await db
        .insert(jobs)
        .values({
          title: 'Position',
          description: 'Description',
          location: 'Remote',
          salary: '$100k',
          employerId: employer.id,
          status: 'active',
        })
        .returning();

      const [application] = await db
        .insert(applications)
        .values({
          jobId: job.id,
          userId: talent.id,
          status: 'pending',
        })
        .returning();

      const [updated] = await db
        .update(applications)
        .set({ status: 'accepted' })
        .where(eq(applications.id, application.id))
        .returning();

      expect(updated.status).toBe('accepted');
    });
  });

  describe('Relationships', () => {
    it('cascades delete from user to resumes', async () => {
      const [talent] = await db
        .insert(users)
        .values({
          email: 'cascade@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Cascade',
          lastName: 'Test',
        })
        .returning();

      await db.insert(resumes).values({
        userId: talent.id,
        fileName: 'resume.pdf',
        fileUrl: 'https://example.com/resume.pdf',
        fileSize: 1024,
      });

      await db.delete(users).where(eq(users.id, talent.id));

      const userResumes = await db
        .select()
        .from(resumes)
        .where(eq(resumes.userId, talent.id));

      expect(userResumes).toHaveLength(0);
    });

    it('cascades delete from job to applications', async () => {
      const [talent] = await db
        .insert(users)
        .values({
          email: 'cascade2@example.com',
          password: 'hashedpassword',
          role: 'talent',
          firstName: 'Cascade',
          lastName: 'Test',
        })
        .returning();

      const [employer] = await db
        .insert(users)
        .values({
          email: 'cascade-employer@example.com',
          password: 'hashedpassword',
          role: 'employer',
          firstName: 'Cascade',
          lastName: 'Employer',
        })
        .returning();

      const [job] = await db
        .insert(jobs)
        .values({
          title: 'Cascade Job',
          description: 'Description',
          location: 'Remote',
          salary: '$100k',
          employerId: employer.id,
          status: 'active',
        })
        .returning();

      await db.insert(applications).values({
        jobId: job.id,
        userId: talent.id,
        status: 'pending',
      });

      await db.delete(jobs).where(eq(jobs.id, job.id));

      const jobApplications = await db
        .select()
        .from(applications)
        .where(eq(applications.jobId, job.id));

      expect(jobApplications).toHaveLength(0);
    });
  });
});
