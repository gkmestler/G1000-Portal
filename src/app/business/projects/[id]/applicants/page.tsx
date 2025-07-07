'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  UserIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  FunnelIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Application, Project } from '@/types';
import toast from 'react-hot-toast';

export default function ApplicantsPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('');
  
  // Modal states
  const [inviteModal, setInviteModal] = useState<{isOpen: boolean, application: Application | null}>({
    isOpen: false,
    application: null
  });
  const [rejectModal, setRejectModal] = useState<{isOpen: boolean, application: Application | null}>({
    isOpen: false,
    application: null
  });
  const [meetingData, setMeetingData] = useState({
    meetingDateTime: '',
    meetingLink: '',
    message: ''
  });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProjectAndApplications();
  }, [projectId]);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter, skillFilter]);

  const fetchProjectAndApplications = async () => {
    try {
      const [projectResponse, applicationsResponse] = await Promise.all([
        fetch(`/api/business/projects/${projectId}`),
        fetch(`/api/business/projects/${projectId}/applications`)
      ]);

      if (projectResponse.ok && applicationsResponse.ok) {
        const projectData = await projectResponse.json();
        const applicationsData = await applicationsResponse.json();
        
        setProject(projectData.data);
        setApplications(applicationsData.data);
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.student?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Skill filter
    if (skillFilter) {
      filtered = filtered.filter(app => 
        app.student?.skills?.some(skill => 
          skill.toLowerCase().includes(skillFilter.toLowerCase())
        )
      );
    }

    setFilteredApplications(filtered);
  };

  const handleInviteToMeeting = async () => {
    if (!inviteModal.application || !meetingData.meetingDateTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/business/projects/${projectId}/applications/${inviteModal.application.id}/invite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meetingData),
        }
      );

      if (response.ok) {
        toast.success('Invitation sent successfully!');
        await fetchProjectAndApplications();
        setInviteModal({ isOpen: false, application: null });
        setMeetingData({ meetingDateTime: '', meetingLink: '', message: '' });
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectApplication = async () => {
    if (!rejectModal.application) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/business/projects/${projectId}/applications/${rejectModal.application.id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: rejectReason }),
        }
      );

      if (response.ok) {
        toast.success('Application rejected');
        await fetchProjectAndApplications();
        setRejectModal({ isOpen: false, application: null });
        setRejectReason('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'submitted':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'underReview':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'interviewScheduled':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'accepted':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'New Application';
      case 'underReview':
        return 'Under Review';
      case 'interviewScheduled':
        return 'Interview Scheduled';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const canInvite = (application: Application) => {
    return ['submitted', 'underReview'].includes(application.status);
  };

  const canReject = (application: Application) => {
    return ['submitted', 'underReview', 'interviewScheduled'].includes(application.status);
  };

  const getAllSkills = () => {
    const allSkills = new Set<string>();
    applications.forEach(app => {
      app.student?.skills?.forEach(skill => allSkills.add(skill));
    });
    return Array.from(allSkills).sort();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center mb-4">
              <Link href="/business/dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeftIcon className="w-5 h-5 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project?.title}</h1>
              <p className="text-gray-600 mt-1">
                {applications.length} total applications • {filteredApplications.length} showing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Applicants
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">New Applications</option>
                  <option value="underReview">Under Review</option>
                  <option value="interviewScheduled">Interview Scheduled</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Skill
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                >
                  <option value="">All Skills</option>
                  {getAllSkills().map(skill => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setSkillFilter('');
                  }}
                  className="w-full"
                >
                  <FunnelIcon className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {applications.length === 0 ? 'No applications yet' : 'No applications match your filters'}
              </h3>
              <p className="text-gray-600">
                {applications.length === 0 
                  ? 'Students will be able to apply once your application window opens.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <Card key={application.id} hover>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {application.student?.user?.name || 'Unknown Student'}
                        </h3>
                        <p className="text-gray-600">{application.student?.user?.email || 'No email'}</p>
                        <p className="text-sm text-gray-500">
                          {application.student?.major || 'Unknown Major'} • {application.student?.year || 'Unknown Year'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className={getStatusBadge(application.status)}>
                        {getStatusLabel(application.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Applied {new Date(application.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {application.student?.skills && application.student.skills.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {application.student.skills.slice(0, 8).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {application.student.skills.length > 8 && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            +{application.student.skills.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cover Note */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Cover Note</h4>
                    <p className="text-gray-600 text-sm">{application.coverNote}</p>
                  </div>

                  {/* Meeting Info (if scheduled) */}
                  {application.status === 'interviewScheduled' && application.meetingDateTime && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 text-purple-600 mr-2" />
                        <span className="text-sm font-medium text-purple-800">
                          Interview scheduled for {new Date(application.meetingDateTime).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {application.proofOfWorkUrl && (
                      <a
                        href={application.proofOfWorkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center"
                      >
                        <Button variant="outline" size="sm">
                          <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
                          View Portfolio
                        </Button>
                      </a>
                    )}

                    {application.student?.resumeUrl && (
                      <a
                        href={application.student.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center"
                      >
                        <Button variant="outline" size="sm">
                          <EyeIcon className="w-4 h-4 mr-2" />
                          View Resume
                        </Button>
                      </a>
                    )}

                    {canInvite(application) && (
                      <Button
                        size="sm"
                        onClick={() => setInviteModal({ isOpen: true, application })}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Invite to Interview
                      </Button>
                    )}

                    {canReject(application) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectModal({ isOpen: true, application })}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XMarkIcon className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>Invite to Interview</CardTitle>
              <CardDescription>
                Schedule a meeting with {inviteModal.application?.student?.user?.name || 'this student'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Date & Time *
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={meetingData.meetingDateTime}
                  onChange={(e) => setMeetingData({ ...meetingData, meetingDateTime: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Link (optional)
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://zoom.us/j/..."
                  value={meetingData.meetingLink}
                  onChange={(e) => setMeetingData({ ...meetingData, meetingLink: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Message (optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={3}
                  placeholder="Add a personal message for the candidate..."
                  value={meetingData.message}
                  onChange={(e) => setMeetingData({ ...meetingData, message: e.target.value })}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleInviteToMeeting}
                  loading={actionLoading}
                  className="flex-1"
                >
                  Send Invitation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setInviteModal({ isOpen: false, application: null });
                    setMeetingData({ meetingDateTime: '', meetingLink: '', message: '' });
                  }}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>Reject Application</CardTitle>
              <CardDescription>
                Provide feedback for {rejectModal.application?.student?.user?.name || 'this student'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for rejection (optional but recommended)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={4}
                  placeholder="Provide constructive feedback to help the student improve future applications..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="danger"
                  onClick={handleRejectApplication}
                  loading={actionLoading}
                  className="flex-1"
                >
                  Reject Application
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectModal({ isOpen: false, application: null });
                    setRejectReason('');
                  }}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 