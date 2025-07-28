'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  CalendarIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  LinkIcon,
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Application } from '@/types';
import { formatMeetingDateTime, parseLocalDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [interviewModal, setInterviewModal] = useState<{isOpen: boolean, application: Application | null}>({
    isOpen: false,
    application: null
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/student/applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data.data);
      } else {
        toast.error('Failed to load applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      submitted: 'bg-blue-100 text-blue-800',
      underReview: 'bg-yellow-100 text-yellow-800',
      interviewScheduled: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    
    const labels = {
      submitted: 'Submitted',
      underReview: 'Under Review',
      interviewScheduled: 'Interview Scheduled',
      accepted: 'Accepted',
      rejected: 'Rejected',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return;
    
    try {
      const response = await fetch(`/api/student/applications/${applicationId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Application withdrawn successfully');
        fetchApplications();
      } else {
        toast.error('Failed to withdraw application');
      }
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const generateCalendarLink = (application: Application) => {
    if (!application.meetingDateTime) return '';
    
    const startDate = parseLocalDateTime(application.meetingDateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
    
    const title = `Interview: ${application.project?.title}`;
    const details = `Interview for ${application.project?.title}`;
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(details)}`;
    
    return googleCalendarUrl;
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="mt-2 text-gray-600">Track your project applications and interview schedules</p>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <DocumentTextIcon className="w-12 h-12 text-gray-400" />
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
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    {/* Left Section */}
                    <div className="flex-1 mb-4 lg:mb-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {application.project?.title}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Business Owner ID: {application.project?.ownerId}</span>
                            <span>•</span>
                            <span>Applied {new Date(application.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(application.status)}
                        </div>
                      </div>

                      {/* Interview Details */}
                      {application.status === 'interviewScheduled' && application.meetingDateTime && (
                        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center mb-2">
                            <CalendarIcon className="w-5 h-5 text-purple-600 mr-2" />
                            <span className="text-sm font-medium text-purple-800">Interview Scheduled</span>
                          </div>
                          <div className="flex items-center mb-2">
                            <ClockIcon className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="text-sm text-purple-700">
                              {formatMeetingDateTime(application.meetingDateTime)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Project Details */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {application.project?.industryTags?.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {application.project?.duration}
                        </span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          {application.project?.compensationType}: {application.project?.compensationValue}
                        </span>
                      </div>

                      {/* Cover Note */}
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
                        <Button 
                          variant="accent" 
                          className="w-full"
                          onClick={() => setInterviewModal({ isOpen: true, application })}
                        >
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          Interview Details
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
                            <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Interview Details Modal */}
      {interviewModal.isOpen && interviewModal.application && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>Interview Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  {interviewModal.application.project?.title}
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Interview scheduled for your application
                </p>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <CalendarIcon className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="font-medium text-purple-800">Meeting Time</span>
                </div>
                <p className="text-sm text-purple-700 mb-3">
                  {formatMeetingDateTime(interviewModal.application.meetingDateTime!)}
                </p>
                
                <div className="flex flex-col space-y-2">
                  <a
                    href={generateCalendarLink(interviewModal.application)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full"
                  >
                    <Button variant="outline" className="w-full">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Add to Calendar
                    </Button>
                  </a>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> The meeting link will be provided by the business owner closer to the interview time. 
                  Check your email for meeting details or contact them directly if needed.
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setInterviewModal({ isOpen: false, application: null })}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 