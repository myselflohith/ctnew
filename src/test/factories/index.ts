import { v4 as uuidv4 } from 'uuid';

export interface UserFactoryOptions {
  id?: string;
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  role?: 'talent' | 'employer' | 'recruiter' | 'admin';
  emailVerified?: boolean;
  verificationToken?: string | null;
  resetToken?: string | null;
  resetTokenExpires?: Date | null;
}

export const createUserFactory = (overrides: UserFactoryOptions = {}) => {
  const role = overrides.role || 'talent';
  return {
    id: overrides.id || uuidv4(),
    email: overrides.email || `user-${Date.now()}@example.com`,
    passwordHash: overrides.passwordHash || '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    companyName: overrides.companyName || (role === 'employer' ? 'Test Company' : null),
    role,
    emailVerified: overrides.emailVerified !== undefined ? overrides.emailVerified : true,
    verificationToken: overrides.verificationToken !== undefined ? overrides.verificationToken : null,
    resetToken: overrides.resetToken !== undefined ? overrides.resetToken : null,
    resetTokenExpires: overrides.resetTokenExpires !== undefined ? overrides.resetTokenExpires : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export interface JobFactoryOptions {
  id?: string;
  title?: string;
  company?: string;
  location?: string;
  type?: 'remote' | 'hybrid' | 'onsite';
  salary?: string;
  postedAt?: Date;
  matchScore?: number;
  skills?: string[];
  description?: string;
  status?: 'active' | 'paused' | 'closed';
  statusReason?: string | null;
  pausedAt?: Date | null;
}

export const createJobFactory = (overrides: JobFactoryOptions = {}) => ({
  id: overrides.id || uuidv4(),
  title: overrides.title || 'Software Engineer',
  company: overrides.company || 'Tech Company',
  location: overrides.location || 'Remote',
  type: overrides.type || 'remote',
  salary: overrides.salary || '$100k - $150k',
  postedAt: overrides.postedAt || new Date(),
  matchScore: overrides.matchScore || 80,
  skills: overrides.skills || ['JavaScript', 'TypeScript', 'React'],
  description: overrides.description || 'Great opportunity to join our team...',
  status: overrides.status || 'active',
  statusReason: overrides.statusReason !== undefined ? overrides.statusReason : null,
  pausedAt: overrides.pausedAt !== undefined ? overrides.pausedAt : null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export interface ResumeFactoryOptions {
  id?: string;
  userId?: string;
  name?: string;
  filePath?: string;
  fileSize?: number;
  isDefault?: boolean;
}

export const createResumeFactory = (overrides: ResumeFactoryOptions = {}) => ({
  id: overrides.id || uuidv4(),
  userId: overrides.userId || uuidv4(),
  name: overrides.name || `resume-${Date.now()}.pdf`,
  filePath: overrides.filePath || `/uploads/resumes/resume-${Date.now()}.pdf`,
  fileSize: overrides.fileSize || 250000,
  isDefault: overrides.isDefault !== undefined ? overrides.isDefault : false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export interface OrganizationFactoryOptions {
  id?: string;
  name?: string;
  companyName?: string;
  industry?: string;
  size?: string;
  founded?: number;
  headquarters?: string;
  description?: string;
  website?: string;
  linkedinUrl?: string;
  twitterUrl?: string | null;
  benefits?: string;
  culture?: string;
  logoPath?: string | null;
}

export const createOrganizationFactory = (overrides: OrganizationFactoryOptions = {}) => ({
  id: overrides.id || uuidv4(),
  name: overrides.name || 'Test Organization',
  companyName: overrides.companyName || `test-org-${Date.now()}`,
  industry: overrides.industry || 'Technology',
  size: overrides.size || '100-500',
  founded: overrides.founded || 2020,
  headquarters: overrides.headquarters || 'San Francisco, CA',
  description: overrides.description || 'A great company to work for...',
  website: overrides.website || 'https://example.com',
  linkedinUrl: overrides.linkedinUrl || 'https://linkedin.com/company/example',
  twitterUrl: overrides.twitterUrl !== undefined ? overrides.twitterUrl : null,
  benefits: overrides.benefits || 'Health insurance, 401k, PTO',
  culture: overrides.culture || 'Collaborative and innovative',
  logoPath: overrides.logoPath !== undefined ? overrides.logoPath : null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export interface ApplicationFactoryOptions {
  id?: string;
  userId?: string;
  jobId?: string;
  resumeId?: string | null;
  status?: 'Application Sent' | 'Under Review' | 'Interview Scheduled' | 'Rejected' | 'Accepted';
  appliedAt?: Date;
}

export const createApplicationFactory = (overrides: ApplicationFactoryOptions = {}) => ({
  id: overrides.id || uuidv4(),
  userId: overrides.userId || uuidv4(),
  jobId: overrides.jobId || uuidv4(),
  resumeId: overrides.resumeId !== undefined ? overrides.resumeId : uuidv4(),
  status: overrides.status || 'Application Sent',
  appliedAt: overrides.appliedAt || new Date(),
  updatedAt: new Date(),
});

export interface InterviewFactoryOptions {
  id?: string;
  userId?: string;
  applicationId?: string;
  interviewType?: 'Video' | 'Phone' | 'Onsite';
  scheduledDate?: Date | null;
  scheduledTime?: string | null;
  interviewer?: string;
  status?: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  notes?: string | null;
}

export const createInterviewFactory = (overrides: InterviewFactoryOptions = {}) => ({
  id: overrides.id || uuidv4(),
  userId: overrides.userId || uuidv4(),
  applicationId: overrides.applicationId || uuidv4(),
  interviewType: overrides.interviewType || 'Video',
  scheduledDate: overrides.scheduledDate !== undefined ? overrides.scheduledDate : new Date(),
  scheduledTime: overrides.scheduledTime !== undefined ? overrides.scheduledTime : '10:00',
  interviewer: overrides.interviewer || 'John Smith',
  status: overrides.status || 'Scheduled',
  notes: overrides.notes !== undefined ? overrides.notes : null,
  createdAt: new Date(),
  updatedAt: new Date(),
});
