'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Project, ProjectForm, INDUSTRY_TAGS, SKILL_TAGS, DURATION_OPTIONS, COMPENSATION_TYPES } from '@/types';
import { transformProject, formatDateForInput, getTomorrowDate, getNextWeekDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [project, setProject] = useState<Project | null>(null);
  
  const [formData, setFormData] = useState<ProjectForm>({
    title: '',
    description: '',
    industryTags: [],
    duration: '',
    deliverables: [''],
    compensationType: 'stipend',
    compensationValue: '',
    applyWindowStart: '',
    applyWindowEnd: '',
    requiredSkills: []
  });

  const [skillInput, setSkillInput] = useState('');
  const [industryInput, setIndustryInput] = useState('');

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/business/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        // Transform the project data to ensure consistent camelCase naming
        const projectData = transformProject(data.data);
        setProject(projectData);
        
        // Populate form with existing data
        setFormData({
          title: projectData.title,
          description: projectData.description,
          industryTags: projectData.industryTags || [],
          duration: projectData.duration,
          deliverables: projectData.deliverables.length > 0 ? projectData.deliverables : [''],
          compensationType: projectData.compensationType,
          compensationValue: projectData.compensationValue,
          applyWindowStart: formatDateForInput(projectData.applyWindowStart),
          applyWindowEnd: formatDateForInput(projectData.applyWindowEnd),
          requiredSkills: projectData.requiredSkills || []
        });
      } else {
        throw new Error('Failed to fetch project');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
      router.push('/business/dashboard');
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.duration) newErrors.duration = 'Duration is required';
    if (!formData.compensationType) newErrors.compensationType = 'Compensation type is required';
    if (!formData.compensationValue.trim()) newErrors.compensationValue = 'Compensation value is required';
    if (!formData.applyWindowStart) newErrors.applyWindowStart = 'Application start date is required';
    if (!formData.applyWindowEnd) newErrors.applyWindowEnd = 'Application end date is required';

    if (formData.applyWindowStart && formData.applyWindowEnd) {
      if (new Date(formData.applyWindowStart) >= new Date(formData.applyWindowEnd)) {
        newErrors.applyWindowEnd = 'End date must be after start date';
      }
    }

    const validDeliverables = formData.deliverables.filter(d => d.trim());
    if (validDeliverables.length === 0) {
      newErrors.deliverables = 'At least one deliverable is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const submissionData = {
        ...formData,
        deliverables: formData.deliverables.filter(d => d.trim())
      };

      const response = await fetch(`/api/business/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        toast.success('Project updated successfully!');
        router.push('/business/dashboard');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.requiredSkills.includes(skill)) {
      setFormData({
        ...formData,
        requiredSkills: [...formData.requiredSkills, skill]
      });
    }
    setSkillInput('');
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      requiredSkills: formData.requiredSkills.filter(skill => skill !== skillToRemove)
    });
  };

  const addIndustryTag = (tag: string) => {
    if (tag && !formData.industryTags.includes(tag)) {
      setFormData({
        ...formData,
        industryTags: [...formData.industryTags, tag]
      });
    }
    setIndustryInput('');
  };

  const removeIndustryTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      industryTags: formData.industryTags.filter(tag => tag !== tagToRemove)
    });
  };

  const addDeliverable = () => {
    setFormData({
      ...formData,
      deliverables: [...formData.deliverables, '']
    });
  };

  const updateDeliverable = (index: number, value: string) => {
    const newDeliverables = [...formData.deliverables];
    newDeliverables[index] = value;
    setFormData({
      ...formData,
      deliverables: newDeliverables
    });
  };

  const removeDeliverable = (index: number) => {
    if (formData.deliverables.length > 1) {
      setFormData({
        ...formData,
        deliverables: formData.deliverables.filter((_, i) => i !== index)
      });
    }
  };

  const hasApplications = project?.applications && project.applications.length > 0;

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/business/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Project</h1>
              <p className="text-gray-600">Update your project details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning for projects with applications */}
      {hasApplications && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    This project has applications
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Be careful when editing project details as it may affect existing applicants. 
                    Consider communicating significant changes to applicants.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Update the core details about your project opportunity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input
                label="Project Title"
                placeholder="e.g., AI-Powered Customer Service Chatbot"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                error={errors.title}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={6}
                  placeholder="Describe your project in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              {/* Industry Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.industryTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeIndustryTag(tag)}
                        className="ml-2 hover:text-blue-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <select
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={industryInput}
                    onChange={(e) => setIndustryInput(e.target.value)}
                  >
                    <option value="">Select an industry...</option>
                    {INDUSTRY_TAGS.filter(tag => !formData.industryTags.includes(tag)).map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addIndustryTag(industryInput)}
                    disabled={!industryInput}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClockIcon className="w-5 h-5 mr-2" />
                Project Details
              </CardTitle>
              <CardDescription>
                Update the timeline, deliverables, and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                  >
                    <option value="">Select duration...</option>
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.duration && (
                    <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compensation Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData.compensationType}
                    onChange={(e) => setFormData({ ...formData, compensationType: e.target.value as 'stipend' | 'equity' | 'credit' })}
                    required
                  >
                    {COMPENSATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                  {errors.compensationType && (
                    <p className="mt-1 text-sm text-red-600">{errors.compensationType}</p>
                  )}
                </div>
              </div>

              <Input
                label="Compensation Value"
                placeholder="e.g., $2,000, 0.5%, Course Credit"
                value={formData.compensationValue}
                onChange={(e) => setFormData({ ...formData, compensationValue: e.target.value })}
                error={errors.compensationValue}
                required
              />

              {/* Deliverables */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Deliverables
                </label>
                <div className="space-y-3">
                  {formData.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder={`Deliverable ${index + 1}`}
                        value={deliverable}
                        onChange={(e) => updateDeliverable(index, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDeliverable(index)}
                        disabled={formData.deliverables.length === 1}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDeliverable}
                    className="w-full"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Deliverable
                  </Button>
                </div>
                {errors.deliverables && (
                  <p className="mt-1 text-sm text-red-600">{errors.deliverables}</p>
                )}
              </div>

              {/* Required Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Skills
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.requiredSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-2 hover:text-green-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <select
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                  >
                    <option value="">Select a skill...</option>
                    {SKILL_TAGS.filter(skill => !formData.requiredSkills.includes(skill)).map((skill) => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addSkill(skillInput)}
                    disabled={!skillInput}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Window */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Application Window
              </CardTitle>
              <CardDescription>
                Update when students can apply to this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData.applyWindowStart}
                    onChange={(e) => setFormData({ ...formData, applyWindowStart: e.target.value })}
                    min={getTomorrowDate()}
                    required
                  />
                  {errors.applyWindowStart && (
                    <p className="mt-1 text-sm text-red-600">{errors.applyWindowStart}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application End Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData.applyWindowEnd}
                    onChange={(e) => setFormData({ ...formData, applyWindowEnd: e.target.value })}
                    min={formData.applyWindowStart || getNextWeekDate()}
                    required
                  />
                  {errors.applyWindowEnd && (
                    <p className="mt-1 text-sm text-red-600">{errors.applyWindowEnd}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Link href="/business/dashboard">
              <Button variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={loading}>
              Update Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 