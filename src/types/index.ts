export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'owner' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  userId: string;
  bio?: string;
  major: string;
  year: string;
  linkedinUrl?: string;
  githubUrl?: string;
  personalWebsiteUrl?: string;
  resumeUrl?: string;
  skills: string[];
  proofOfWorkUrls: string[];
  updatedAt: string;
  user?: User;
}

export interface BusinessOwnerProfile {
  userId: string;
  companyName: string;
  industryTags: string[];
  websiteUrl?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  industryTags: string[];
  duration: string;
  deliverables: string[];
  compensationType: 'stipend' | 'equity' | 'credit';
  compensationValue: string;
  applyWindowStart: string;
  applyWindowEnd: string;
  requiredSkills: string[];
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  owner?: BusinessOwnerProfile;
  applications?: Application[];
}

export interface Application {
  id: string;
  projectId: string;
  studentId: string;
  coverNote: string;
  proofOfWorkUrl: string;
  status: 'submitted' | 'underReview' | 'interviewScheduled' | 'accepted' | 'rejected';
  submittedAt: string;
  invitedAt?: string;
  rejectedAt?: string;
  meetingDateTime?: string;
  reflectionOwner?: string;
  reflectionStudent?: string;
  project?: Project;
  student?: StudentProfile;
}

export interface AdminMetrics {
  pendingOwnerCount: number;
  activeProjectCount: number;
  openApplicationCount: number;
  userCountByRole: {
    student: number;
    owner: number;
    admin: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface LoginForm {
  email: string;
  password?: string;
  code?: string;
}

export interface ProjectForm {
  title: string;
  description: string;
  industryTags: string[];
  duration: string;
  deliverables: string[];
  compensationType: 'stipend' | 'equity' | 'credit';
  compensationValue: string;
  applyWindowStart: string;
  applyWindowEnd: string;
  requiredSkills: string[];
}

export interface ApplicationForm {
  coverNote: string;
  proofOfWorkUrl: string;
}

export interface ProfileForm {
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  personalWebsiteUrl?: string;
  skills: string[];
  proofOfWorkUrls: string[];
}

// Constants
export const ROLES = ['student', 'owner', 'admin'] as const;
export const APPLICATION_STATUSES = ['submitted', 'underReview', 'interviewScheduled', 'accepted', 'rejected'] as const;
export const PROJECT_STATUSES = ['open', 'closed'] as const;
export const COMPENSATION_TYPES = ['stipend', 'equity', 'credit'] as const;

export const DURATION_OPTIONS = [
  '< 4 weeks',
  '4-8 weeks',
  '8-12 weeks',
  '> 12 weeks'
] as const;

export const INDUSTRY_TAGS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Real Estate',
  'Non-profit',
  'Food & Beverage',
  'Marketing',
  'Other'
] as const;

export const SKILL_TAGS = [
  'Python',
  'JavaScript',
  'React',
  'Node.js',
  'Machine Learning',
  'Data Analysis',
  'UI/UX Design',
  'Project Management',
  'SQL',
  'API Development',
  'Mobile Development',
  'Cloud Computing',
  'Digital Marketing',
  'Business Strategy',
  'Research',
  'Content Creation'
] as const; 