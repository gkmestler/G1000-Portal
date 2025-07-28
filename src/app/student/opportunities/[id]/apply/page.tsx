'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Project, ApplicationForm } from '@/types';
import { 
  DocumentTextIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ApplicationForm>({
    coverNote: '',
    proofOfWorkUrl: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params.id) {
      fetchOpportunity();
    }
  }, [params.id]);

  const fetchOpportunity = async () => {
    try {
      const response = await fetch(`/api/opportunities/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setOpportunity(data.data);
        
        // Check if application window is open
        const now = new Date();
        const start = new Date(data.data.applyWindowStart);
        const end = new Date(data.data.applyWindowEnd);
        
        if (now < start || now > end) {
          setError('Application window is closed for this opportunity');
        }
      } else {
        setError('Opportunity not found');
      }
    } catch (error) {
      console.error('Failed to fetch opportunity:', error);
      setError('Failed to load opportunity');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.coverNote.trim()) {
      errors.coverNote = 'Cover note is required';
    } else if (formData.coverNote.trim().length < 50) {
      errors.coverNote = 'Cover note must be at least 50 characters';
    }

    if (!formData.proofOfWorkUrl.trim()) {
      errors.proofOfWorkUrl = 'Proof of work URL is required';
    } else {
      try {
        new URL(formData.proofOfWorkUrl);
      } catch {
        errors.proofOfWorkUrl = 'Please enter a valid URL';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/student/opportunities/${params.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Application submitted successfully!');
        router.push('/student/applications');
      } else {
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Failed to submit application:', error);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ApplicationForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application form...</p>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Cannot Apply</h1>
          <p className="text-gray-600 mb-6">{error || 'The opportunity you\'re trying to apply to doesn\'t exist.'}</p>
          <Button onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Back to Opportunity
          </Button>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Apply to: {opportunity.title}
                </h1>
                <p className="text-gray-600">
                  {opportunity.owner?.companyName || 'Business Owner'} • {opportunity.compensationValue}
                </p>
              </div>
              <div className="ml-6">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  Applications Open
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Application Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  Application Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Cover Note */}
                  <div>
                    <label htmlFor="coverNote" className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Note *
                    </label>
                    <textarea
                      id="coverNote"
                      rows={8}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        formErrors.coverNote ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Tell the business owner why you're interested in this opportunity and what unique value you can bring. Mention relevant experience, skills, and your enthusiasm for the project..."
                      value={formData.coverNote}
                      onChange={(e) => handleInputChange('coverNote', e.target.value)}
                    />
                    {formErrors.coverNote && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.coverNote}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.coverNote.length}/500 characters (minimum 50)
                    </p>
                  </div>

                  {/* Proof of Work URL */}
                  <div>
                    <label htmlFor="proofOfWorkUrl" className="block text-sm font-medium text-gray-700 mb-2">
                      Proof of Work URL *
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="proofOfWorkUrl"
                        type="url"
                        className={`pl-10 ${formErrors.proofOfWorkUrl ? 'border-red-500' : ''}`}
                        placeholder="https://github.com/yourusername/project"
                        value={formData.proofOfWorkUrl}
                        onChange={(e) => handleInputChange('proofOfWorkUrl', e.target.value)}
                      />
                    </div>
                    {formErrors.proofOfWorkUrl && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.proofOfWorkUrl}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Link to your portfolio, GitHub project, or relevant work sample
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full lg:w-auto"
                      size="lg"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting Application...
                        </>
                      ) : (
                        'Submit Application'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Opportunity Summary & Tips */}
          <div className="space-y-6">
            {/* Opportunity Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Opportunity Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900">Duration</p>
                  <p className="text-gray-600">{opportunity.duration}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Compensation</p>
                  <p className="text-gray-600">{opportunity.compensationValue}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Required Skills</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {opportunity.requiredSkills.length > 0 ? (
                      opportunity.requiredSkills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No specific skills required</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                  Application Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Be specific about your relevant experience and skills
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Explain why you're interested in this particular project
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Include a strong portfolio or work sample link
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Demonstrate your understanding of the business needs
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Proofread your application before submitting
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 