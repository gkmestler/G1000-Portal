'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { ProjectForm, INDUSTRY_TAGS, SKILL_TAGS, COMPENSATION_TYPES, PROJECT_TYPES } from '@/types';
import { getTodayDate, getNextWeekDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<ProjectForm>({
    title: '',
    description: '',
    type: 'project-based',
    typeExplanation: '',
    industryTags: [],
    duration: '',
    deliverables: [''],
    compensationType: 'unpaid',
    compensationValue: '',
    applyWindowStart: '',
    applyWindowEnd: '',
    requiredSkills: []
  });

  const [skillInput, setSkillInput] = useState('');
  const [industryInput, setIndustryInput] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<string[]>([]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Opportunity Title is required';
    if (!formData.description.trim()) newErrors.description = 'Opportunity Description is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (formData.type === 'other' && !formData.typeExplanation?.trim()) {
      newErrors.typeExplanation = 'Please explain the type when selecting "other"';
    }
    if (formData.industryTags.length === 0) newErrors.industryTags = 'Industry is required';
    
    // Only validate selected optional details
    if (selectedDetails.includes('duration') && !formData.duration.trim()) {
      newErrors.duration = 'Duration is required when added';
    }
    if (selectedDetails.includes('compensation')) {
      if (!formData.compensationType) newErrors.compensationType = 'Compensation type is required when added';
      if (!formData.compensationValue.trim()) newErrors.compensationValue = 'Compensation value is required when added';
    }
    
    if (!formData.applyWindowStart) newErrors.applyWindowStart = 'Application start date is required';
    if (!formData.applyWindowEnd) newErrors.applyWindowEnd = 'Application end date is required';

    if (formData.applyWindowStart && formData.applyWindowEnd) {
      if (new Date(formData.applyWindowStart) >= new Date(formData.applyWindowEnd)) {
        newErrors.applyWindowEnd = 'End date must be after start date';
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for comparison
      const startDate = new Date(formData.applyWindowStart);
      startDate.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        newErrors.applyWindowStart = 'Start date cannot be in the past';
      }
    }

    // Only validate deliverables if they're selected
    if (selectedDetails.includes('deliverables')) {
      const validDeliverables = formData.deliverables.filter(d => d.trim());
      if (validDeliverables.length === 0) {
        newErrors.deliverables = 'At least one deliverable is required when added';
      }
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
        // Only include deliverables if they were selected and have content
        deliverables: selectedDetails.includes('deliverables') 
          ? formData.deliverables.filter(d => d.trim())
          : [],
        // Clear out unselected optional fields
        duration: selectedDetails.includes('duration') ? formData.duration : '',
        compensationType: selectedDetails.includes('compensation') ? formData.compensationType : 'unpaid',
        compensationValue: selectedDetails.includes('compensation') ? formData.compensationValue : '',
        requiredSkills: selectedDetails.includes('skills') ? formData.requiredSkills : []
      };

      const response = await fetch('/api/business/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        toast.success('Opportunity created successfully!');
        router.push('/business/dashboard');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create opportunity');
      }
    } catch (error) {
      console.error('Error creating opportunity:', error);
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



  const getCompensationTypeLabel = (type: string) => {
    switch (type) {
      case 'unpaid': return 'Unpaid (for experience)';
      case 'hourly-wage': return 'Hourly Wage';
      case 'salary': return 'Salary';
      case 'stipend': return 'Stipend';
      case 'commission': return 'Commission';
      case 'hourly-commission': return 'Hourly + Commission';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'project-based': return 'Project-based';
      case 'internship': return 'Internship';
      case 'micro-internship': return 'Micro-internship';
      case 'consulting-gig': return 'Consulting gig';
      case 'other': return 'Other - explain';
      default: return type;
    }
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Business Portal</h1>
              <h2 className="text-xl font-semibold text-gray-700 mt-1">Create New Opportunity</h2>
              <p className="text-gray-600">Post a new opportunity for G1000 students</p>
            </div>
          </div>
        </div>
      </div>

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
                Provide the core details about your opportunity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input
                label="Opportunity Title *"
                placeholder="e.g., AI-Powered Customer Service Chatbot"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                error={errors.title}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opportunity Description *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={6}
                  placeholder="Describe your opportunity in detail. Include the problem you're solving, the scope of work, and what success looks like..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ProjectForm['type'] })}
                  required
                >
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {getProjectTypeLabel(type)}
                    </option>
                  ))}
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                )}
              </div>

              {formData.type === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Please explain the type
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Please explain what type of opportunity this is..."
                    value={formData.typeExplanation || ''}
                    onChange={(e) => setFormData({ ...formData, typeExplanation: e.target.value })}
                  />
                  {errors.typeExplanation && (
                    <p className="mt-1 text-sm text-red-600">{errors.typeExplanation}</p>
                  )}
                </div>
              )}

              {/* Industry Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
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
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <select
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      value={industryInput}
                      onChange={(e) => {
                        setIndustryInput(e.target.value);
                        if (e.target.value !== 'other') {
                          setCustomIndustry('');
                        }
                      }}
                    >
                      <option value="">Select an industry...</option>
                      {INDUSTRY_TAGS.filter(tag => !formData.industryTags.includes(tag)).map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                      <option value="other">Other (custom)</option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (industryInput === 'other' && customIndustry) {
                          addIndustryTag(customIndustry);
                          setCustomIndustry('');
                        } else if (industryInput && industryInput !== 'other') {
                          addIndustryTag(industryInput);
                        }
                        setIndustryInput('');
                      }}
                      disabled={!industryInput || (industryInput === 'other' && !customIndustry)}
                    >
                      Add
                    </Button>
                  </div>
                  {industryInput === 'other' && (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter custom industry..."
                      value={customIndustry}
                      onChange={(e) => setCustomIndustry(e.target.value)}
                    />
                  )}
                </div>
                {errors.industryTags && (
                  <p className="mt-1 text-sm text-red-600">{errors.industryTags}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClockIcon className="w-5 h-5 mr-2" />
                Opportunity Details
              </CardTitle>
              <CardDescription>
                Add details about your opportunity as needed. Not all fields are required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
<<<<<<< HEAD
              {/* Detail Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Details to Add
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'duration', label: 'Duration' },
                    { id: 'compensation', label: 'Compensation' },
                    { id: 'deliverables', label: 'Deliverables' },
                    { id: 'skills', label: 'Required Skills' }
                  ].map((detail) => (
                    <button
                      key={detail.id}
                      type="button"
                      onClick={() => {
                        if (selectedDetails.includes(detail.id)) {
                          setSelectedDetails(selectedDetails.filter(d => d !== detail.id));
                        } else {
                          setSelectedDetails([...selectedDetails, detail.id]);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        selectedDetails.includes(detail.id)
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {selectedDetails.includes(detail.id) ? '✓ ' : '+ '}{detail.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Duration */}
              {selectedDetails.includes('duration') && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Duration (estimated)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectedDetails(selectedDetails.filter(d => d !== 'duration'))}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
=======
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration * (estimated duration)
                  </label>
>>>>>>> 97dbc55 (fix: Update business API routes to use supabaseAdmin client)
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., 6 weeks, 2-3 months, 10 hours/week for 8 weeks"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
<<<<<<< HEAD
=======
                    required
>>>>>>> 97dbc55 (fix: Update business API routes to use supabaseAdmin client)
                  />
                  {errors.duration && (
                    <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
                  )}
                </div>
              )}

<<<<<<< HEAD
              {/* Compensation */}
              {selectedDetails.includes('compensation') && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Compensation
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectedDetails(selectedDetails.filter(d => d !== 'compensation'))}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Type
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        value={formData.compensationType}
                        onChange={(e) => setFormData({ ...formData, compensationType: e.target.value as ProjectForm['compensationType'] })}
                      >
                        {COMPENSATION_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {getCompensationTypeLabel(type)}
                          </option>
                        ))}
                      </select>
                      {errors.compensationType && (
                        <p className="mt-1 text-sm text-red-600">{errors.compensationType}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Value/Details
                      </label>
=======
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compensation Type *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData.compensationType}
                    onChange={(e) => setFormData({ ...formData, compensationType: e.target.value as ProjectForm['compensationType'] })}
                    required
                  >
                    {COMPENSATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {getCompensationTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                  {errors.compensationType && (
                    <p className="mt-1 text-sm text-red-600">{errors.compensationType}</p>
                  )}
                </div>
              </div>

              <Input
                label="Compensation Value *"
                placeholder="e.g., $25/hour, $2,000 total, Great experience and portfolio piece"
                value={formData.compensationValue}
                onChange={(e) => setFormData({ ...formData, compensationValue: e.target.value })}
                error={errors.compensationValue}
                required
              />

              {/* Deliverables */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opportunity Deliverables
                </label>
                <div className="space-y-3">
                  {formData.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex space-x-2">
>>>>>>> 97dbc55 (fix: Update business API routes to use supabaseAdmin client)
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="e.g., $25/hour, $2,000 total, Great experience"
                        value={formData.compensationValue}
                        onChange={(e) => setFormData({ ...formData, compensationValue: e.target.value })}
                      />
                      {errors.compensationValue && (
                        <p className="mt-1 text-sm text-red-600">{errors.compensationValue}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Deliverables */}
              {selectedDetails.includes('deliverables') && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Opportunity Deliverables
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectedDetails(selectedDetails.filter(d => d !== 'deliverables'))}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
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
              )}

              {/* Required Skills */}
              {selectedDetails.includes('skills') && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Required Skills
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectedDetails(selectedDetails.filter(d => d !== 'skills'))}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
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
              )}
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
                Set when students can apply to this opportunity
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
                    min={getTodayDate()}
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
              Create Opportunity
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 