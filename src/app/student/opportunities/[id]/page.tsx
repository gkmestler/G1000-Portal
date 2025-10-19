'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Project, Application } from '@/types';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function OpportunityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Project | null>(null);
  const [userApplication, setUserApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Check if user has applied
        if (data.data.userApplication) {
          setUserApplication(data.data.userApplication);
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

  const handleWithdraw = async () => {
    if (!userApplication || !confirm('Are you sure you want to withdraw your application?')) {
      return;
    }

    try {
      const response = await fetch(`/api/student/applications/${userApplication.applicationId}/withdraw`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Application withdrawn successfully');
        setUserApplication(null);
        // Refresh opportunity data
        fetchOpportunity();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to withdraw application');
      }
    } catch (error) {
      console.error('Failed to withdraw application:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const isApplicationWindowOpen = (project: Project) => {
    const now = new Date();
    const start = new Date(project.applyWindowStart);
    const end = new Date(project.applyWindowEnd);

    // Allow applications if window opens within 24 hours
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const isOpeningSoon = now < start && start <= twentyFourHoursFromNow;

    return (now >= start && now <= end) || isOpeningSoon;
  };

  const getCompensationIcon = (type: string) => {
    switch (type) {
      case 'stipend': return '💰';
      case 'equity': return '📈';
      case 'credit': return '🎓';
      case 'hourly-wage': return '⏱️';
      case 'salary': return '💵';
      case 'commission': return '💼';
      case 'hourly-commission': return '⏱️💼';
      case 'unpaid': return '🤝';
      default: return '💼';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading opportunity details...</p>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Opportunity Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The opportunity you\'re looking for doesn\'t exist or has been removed.'}</p>
          <Button onClick={() => router.push('/student/opportunities')}>
            Back to Opportunities
          </Button>
        </div>
      </div>
    );
  }

  const isOpen = isApplicationWindowOpen(opportunity);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/student/opportunities')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Opportunities
          </Button>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {opportunity.title}
              </h1>
              <p className="text-gray-600 mb-4">
                {opportunity.owner?.companyName || 'Business Owner'}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {opportunity.industryTags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 md:mt-0 md:ml-6 flex flex-col items-start md:items-end">
              <div className="flex items-center space-x-2 text-gray-700 mb-3">
                <span className="text-xl">{getCompensationIcon(opportunity.compensationType)}</span>
                <span className="font-medium">{opportunity.compensationValue}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500 mb-3">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {opportunity.duration}
              </div>
              <div className="mt-4">
                {userApplication ? (
                  userApplication.status === 'withdrawn' ? (
                    <div className="text-gray-500">
                      Application Withdrawn
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        <span className="font-medium">Applied</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={handleWithdraw}
                      >
                        Withdraw
                      </Button>
                    </div>
                  )
                ) : (
                  isOpen ? (
                    <Link href={`/student/opportunities/${opportunity.id}/apply`}>
                      <Button size="lg">
                        Apply Now
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled size="lg">
                      {new Date() > new Date(opportunity.applyWindowEnd) ? 'Applications Closed' : 'Applications Not Open Yet'}
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* AI Consultation Banner */}
            {opportunity.isAiConsultation && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-blue-900">AI Solutions Consultation</h3>
                      <p className="mt-1 text-sm text-blue-700">
                        This business is looking for help identifying where AI can add the most value to their operations.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                <div className="prose max-w-none text-gray-700">
                  <p className="whitespace-pre-line">{opportunity.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Current Software & Pain Points (for AI Consultation) */}
            {opportunity.isAiConsultation && (
              <>
                {opportunity.currentSoftwareTools && (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Software & Tools</h2>
                      <p className="text-gray-700 whitespace-pre-line">{opportunity.currentSoftwareTools}</p>
                    </CardContent>
                  </Card>
                )}
                {opportunity.painPoints && (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Pain Points & Challenges</h2>
                      <p className="text-gray-700 whitespace-pre-line">{opportunity.painPoints}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Deliverables */}
            {opportunity.deliverables.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Deliverables</h2>
                  <ul className="space-y-2">
                    {opportunity.deliverables.map((deliverable, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-800 text-sm font-medium mr-3">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{deliverable}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Project Type */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Type</h2>
                <div className="flex items-center mb-2">
                  <span className="text-gray-700 capitalize font-medium">{opportunity.type.replace(/-/g, ' ')}</span>
                </div>
                {opportunity.typeExplanation && (
                  <p className="text-gray-600">{opportunity.typeExplanation}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Compensation */}
            {opportunity.compensationType && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Compensation</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">
                        {opportunity.compensationType === 'paid-hourly' && '💰'}
                        {opportunity.compensationType === 'paid-stipend' && '💵'}
                        {opportunity.compensationType === 'paid-fixed' && '💸'}
                        {opportunity.compensationType === 'paid-salary' && '💴'}
                        {opportunity.compensationType === 'equity' && '📈'}
                        {opportunity.compensationType === 'experience' && '🎓'}
                        {opportunity.compensationType === 'other' && '🤝'}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {opportunity.compensationType === 'paid-hourly' && 'Paid (Hourly)'}
                          {opportunity.compensationType === 'paid-stipend' && 'Paid (Stipend)'}
                          {opportunity.compensationType === 'paid-fixed' && 'Paid (Fixed Fee)'}
                          {opportunity.compensationType === 'paid-salary' && 'Paid (Salary)'}
                          {opportunity.compensationType === 'equity' && 'Equity/Ownership'}
                          {opportunity.compensationType === 'experience' && 'Experience/Portfolio'}
                          {opportunity.compensationType === 'other' && 'Other'}
                        </p>
                        {opportunity.compensationValue && (
                          <p className="text-sm text-gray-600">{opportunity.compensationValue}</p>
                        )}
                      </div>
                    </div>
                    {opportunity.budget && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-gray-600">Budget: {opportunity.budget}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Duration & Hours */}
            {(opportunity.estimatedDuration || opportunity.estimatedHoursPerWeek) && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Time Commitment</h3>
                  <div className="space-y-2 text-gray-700">
                    {opportunity.estimatedDuration && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">Duration: {opportunity.estimatedDuration}</span>
                      </div>
                    )}
                    {opportunity.estimatedHoursPerWeek && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">{opportunity.estimatedHoursPerWeek}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            {opportunity.location && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="font-medium capitalize">{opportunity.location}</p>
                      {opportunity.location === 'onsite' && opportunity.onsiteLocation && (
                        <p className="text-sm text-gray-600">{opportunity.onsiteLocation}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Application Window */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Application Window</h3>
                <div className="space-y-2 text-gray-700">
                  <div className="flex justify-between">
                    <span>Opens:</span>
                    <span>{new Date(opportunity.applyWindowStart).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Closes:</span>
                    <span>{new Date(opportunity.applyWindowEnd).toLocaleDateString()}</span>
                  </div>
                  <div className="pt-2">
                    <div className={`py-1 px-2 text-center text-sm rounded-full ${
                      (() => {
                        const now = new Date();
                        const start = new Date(opportunity.applyWindowStart);
                        if (now < start) {
                          const hoursUntilOpen = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
                          if (hoursUntilOpen <= 24) {
                            return 'bg-yellow-100 text-yellow-800';
                          }
                        }
                        return isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                      })()
                    }`}>
                      {(() => {
                        const now = new Date();
                        const start = new Date(opportunity.applyWindowStart);
                        const end = new Date(opportunity.applyWindowEnd);
                        if (now < start) {
                          const hoursUntilOpen = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
                          if (hoursUntilOpen <= 24) {
                            return `Opening Soon (${Math.ceil(hoursUntilOpen)} hours)`;
                          }
                          return 'Not Yet Open';
                        }
                        if (now > end) {
                          return 'Applications Closed';
                        }
                        return 'Currently Open';
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Required Skills */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Required Skills</h3>
                {opportunity.requiredSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {opportunity.requiredSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No specific skills required</p>
                )}
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3">About the Company</h3>
                <p className="text-gray-700 mb-3">
                  {opportunity.owner?.companyName || 'Business Owner'}
                </p>
                {opportunity.owner?.websiteUrl && (
                  <a 
                    href={opportunity.owner.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-800 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Visit Website
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Apply Button (Mobile) */}
            <div className="lg:hidden">
              {userApplication ? (
                userApplication.status === 'withdrawn' ? (
                  <div className="text-center text-gray-500 py-3">
                    Application Withdrawn
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center text-green-600 py-2">
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      <span className="font-medium">Application Submitted</span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-300 hover:bg-red-50"
                      onClick={handleWithdraw}
                    >
                      Withdraw Application
                    </Button>
                  </div>
                )
              ) : (
                isOpen ? (
                  <Link href={`/student/opportunities/${opportunity.id}/apply`}>
                    <Button className="w-full">
                      Apply Now
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="w-full">
                    {new Date() > new Date(opportunity.applyWindowEnd) ? 'Applications Closed' : 'Applications Not Open Yet'}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}