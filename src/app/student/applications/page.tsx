'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Application } from '@/types';
import Link from 'next/link';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/student/applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      submitted: { color: 'bg-blue-100 text-blue-800', icon: '⏳', text: 'Submitted' },
      underReview: { color: 'bg-yellow-100 text-yellow-800', icon: '🔍', text: 'Under Review' },
      interviewScheduled: { color: 'bg-purple-100 text-purple-800', icon: '📅', text: 'Interview Scheduled' },
      accepted: { color: 'bg-green-100 text-green-800', icon: '✅', text: 'Accepted' },
      rejected: { color: 'bg-red-100 text-red-800', icon: '❌', text: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to withdraw this application?')) {
      return;
    }

    try {
      const response = await fetch(`/api/student/applications/${applicationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh applications list
        fetchApplications();
      } else {
        alert('Failed to withdraw application');
      }
    } catch (error) {
      console.error('Failed to withdraw application:', error);
      alert('Failed to withdraw application');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="mt-2 text-gray-600">
            Track the status of your project applications and manage upcoming interviews
          </p>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600 mb-6">Start browsing opportunities and submit your first application!</p>
              <Link href="/student/opportunities">
                <Button>Browse Opportunities</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {applications.map((application) => (
              <Card key={application.id} hover>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    {/* Left Section */}
                    <div className="flex-1 mb-4 lg:mb-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {application.project?.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {application.project?.owner?.companyName}
                          </p>
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(application.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Submitted</p>
                          <p className="text-sm text-gray-600">
                            {new Date(application.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {application.status === 'interviewScheduled' && application.meetingDateTime && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Interview Scheduled</p>
                            <p className="text-sm text-gray-600">
                              {new Date(application.meetingDateTime).toLocaleString()}
                            </p>
                          </div>
                        )}

                        {application.invitedAt && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Invitation Date</p>
                            <p className="text-sm text-gray-600">
                              {new Date(application.invitedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                        {application.rejectedAt && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Decision Date</p>
                            <p className="text-sm text-gray-600">
                              {new Date(application.rejectedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Cover Note Preview */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Cover Note</p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {application.coverNote}
                        </p>
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex flex-col space-y-2 lg:ml-6 lg:min-w-[200px]">
                      <Link href={`/student/opportunities/${application.projectId}`}>
                        <Button variant="outline" className="w-full">
                          View Project
                        </Button>
                      </Link>

                      {application.status === 'interviewScheduled' && application.meetingDateTime && (
                        <Button variant="accent" className="w-full">
                          Join Interview
                        </Button>
                      )}

                      {application.proofOfWorkUrl && (
                        <a 
                          href={application.proofOfWorkUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full"
                        >
                          <Button variant="ghost" className="w-full">
                            View Portfolio
                          </Button>
                        </a>
                      )}

                      {(application.status === 'submitted' || application.status === 'underReview') && (
                        <Button 
                          variant="danger" 
                          onClick={() => handleWithdrawApplication(application.id)}
                          className="w-full"
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className={`flex items-center ${
                        ['submitted', 'underReview', 'interviewScheduled', 'accepted', 'rejected'].includes(application.status)
                          ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                        Submitted
                      </div>
                      
                      <div className="flex-1 h-px bg-gray-200"></div>
                      
                      <div className={`flex items-center ${
                        ['underReview', 'interviewScheduled', 'accepted', 'rejected'].includes(application.status)
                          ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                        Under Review
                      </div>
                      
                      <div className="flex-1 h-px bg-gray-200"></div>
                      
                      <div className={`flex items-center ${
                        application.status === 'interviewScheduled' 
                          ? 'text-blue-600' 
                          : ['accepted', 'rejected'].includes(application.status)
                            ? 'text-green-600' 
                            : 'text-gray-400'
                      }`}>
                        <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                        Interview
                      </div>
                      
                      <div className="flex-1 h-px bg-gray-200"></div>
                      
                      <div className={`flex items-center ${
                        application.status === 'accepted' 
                          ? 'text-green-600'
                          : application.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-gray-400'
                      }`}>
                        <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                        Decision
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 