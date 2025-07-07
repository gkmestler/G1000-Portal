import { clsx, type ClassValue } from 'clsx';
import { format, isAfter, isBefore, parseISO, isValid } from 'date-fns';
import { Project } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  if (!isValid(dateObj)) {
    console.error('Invalid date provided to formatDate:', date);
    return 'Invalid Date';
  }
  
  return format(dateObj, 'MMM d, yyyy');
}

export function formatDateTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  if (!isValid(dateObj)) {
    console.error('Invalid date provided to formatDateTime:', date);
    return 'Invalid Date';
  }
  
  return format(dateObj, 'MMM d, yyyy h:mm a');
}

export function isDateInPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isBefore(dateObj, new Date());
}

export function isDateInFuture(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isAfter(dateObj, new Date());
}

export function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function createSearchParams(params: Record<string, string | number | boolean | undefined>): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams;
}

// Transform snake_case database fields to camelCase for frontend
export const transformProject = (dbProject: any): Project => {
  return {
    id: dbProject.id,
    title: dbProject.title,
    description: dbProject.description,
    industryTags: dbProject.industry_tags || dbProject.industryTags || [],
    duration: dbProject.duration,
    deliverables: dbProject.deliverables || [],
    compensationType: dbProject.compensation_type || dbProject.compensationType,
    compensationValue: dbProject.compensation_value || dbProject.compensationValue,
    applyWindowStart: dbProject.apply_window_start || dbProject.applyWindowStart,
    applyWindowEnd: dbProject.apply_window_end || dbProject.applyWindowEnd,
    requiredSkills: dbProject.required_skills || dbProject.requiredSkills || [],
    status: dbProject.status,
    ownerId: dbProject.owner_id || dbProject.ownerId,
    createdAt: dbProject.created_at || dbProject.createdAt,
    updatedAt: dbProject.updated_at || dbProject.updatedAt,
    applications: dbProject.applications || []
  };
};

// Safe function to get industry tags with fallback
export const getIndustryTags = (project: Project) => {
  return Array.isArray(project.industryTags) ? project.industryTags : [];
};

// Format date for input fields
export const formatDateForInput = (dateString: string) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

// Get tomorrow's date for minimum date validation
export const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

// Get next week's date for default date selection
export const getNextWeekDate = () => {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek.toISOString().split('T')[0];
}; 