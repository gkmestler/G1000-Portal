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
  EyeIcon,
  ArrowUturnLeftIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { Application, Project } from '@/types';
import { formatMeetingDateTime, parseLocalDateTime, toDateTimeLocalValue, toISOString } from '@/lib/utils';
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
  const [rescheduleModal, setRescheduleModal] = useState<{isOpen: boolean, application: Application | null}>({
    isOpen: false,
    application: null
  });
  const [profileModal, setProfileModal] = useState<{isOpen: boolean, application: Application | null}>({
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

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject(projectData.data);
      }

      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        setApplications(applicationsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.coverNote?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

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
        toast.success('Application rejected successfully');
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

  const handleUndoReject = async (application: Application) => {
    if (!confirm('Are you sure you want to reconsider this application?')) return;

    try {
      const response = await fetch(
        `/api/business/projects/${projectId}/applications/${application.id}/undo-reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        toast.success('Application is now under review again');
        await fetchProjectAndApplications();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to undo rejection');
      }
    } catch (error) {
      console.error('Error undoing rejection:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleRescheduleInterview = async () => {
    if (!rescheduleModal.application || !meetingData.meetingDateTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/business/projects/${projectId}/applications/${rescheduleModal.application.id}/reschedule`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meetingData),
        }
      );

      if (response.ok) {
        toast.success('Interview rescheduled successfully!');
        await fetchProjectAndApplications();
        setRescheduleModal({ isOpen: false, application: null });
        setMeetingData({ meetingDateTime: '', meetingLink: '', message: '' });
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to reschedule interview');
      }
    } catch (error) {
      console.error('Error rescheduling interview:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      submitted: 'bg-blue-100 text-blue-800 border-blue-300',
      underReview: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      interviewScheduled: 'bg-purple-100 text-purple-800 border-purple-300',
      accepted: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
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

  const canUndoReject = (application: Application) => {
    return application.status === 'rejected';
  };

  const canReschedule = (application: Application) => {
    return application.status === 'interviewScheduled';
  };

  const getAllSkills = () => {
    const allSkills = new Set<string>();
    applications.forEach(app => {
      app.student?.skills?.forEach(skill => allSkills.add(skill));
    });
    return Array.from(allSkills).sort();
  };

  // Check if a proposed meeting time is within student's availability
  const checkAvailability = (studentProfile: any, proposedDateTime: string) => {
    // Check new flexible availability system first
    if (studentProfile?.availabilitySlots?.length > 0) {
      const proposedDate = parseLocalDateTime(proposedDateTime);
      const dayName = proposedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const proposedTime = proposedDate.toTimeString().substring(0, 5); // HH:MM format

      // Find all slots for the proposed day
      const daySlots = studentProfile.availabilitySlots.filter((slot: any) => slot.day === dayName);
      
      if (daySlots.length === 0) {
        return { 
          isAvailable: false, 
          message: `Student is not available on ${dayName}s` 
        };
      }

      // Check if the proposed time falls within any of the day's time slots
      const isWithinAnySlot = daySlots.some((slot: any) => 
        proposedTime >= slot.start_time && proposedTime <= slot.end_time
      );

      if (!isWithinAnySlot) {
        const availableTimes = daySlots.map((slot: any) => `${slot.start_time}-${slot.end_time}`).join(', ');
        return { 
          isAvailable: false, 
          message: `Proposed time (${proposedTime}) is outside student's available hours on ${dayName}: ${availableTimes}` 
        };
      }

      return { isAvailable: true, message: 'Time works with student\'s availability' };
    }

    // Fallback to legacy availability system
    if (!studentProfile?.availableDays?.length || !studentProfile.availableStartTime || !studentProfile.availableEndTime) {
      return { isAvailable: true, message: 'No availability restrictions set' };
    }

    const proposedDate = parseLocalDateTime(proposedDateTime);
    const dayName = proposedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const proposedTime = proposedDate.toTimeString().substring(0, 5); // HH:MM format

    // Check if the day is available
    if (!studentProfile.availableDays.includes(dayName)) {
      return { 
        isAvailable: false, 
        message: `Student is not available on ${dayName}s. Available days: ${studentProfile.availableDays.join(', ')}` 
      };
    }

    // Check if the time is within available hours
    if (proposedTime < studentProfile.availableStartTime || proposedTime > studentProfile.availableEndTime) {
      return { 
        isAvailable: false, 
        message: `Proposed time (${proposedTime}) is outside student's available hours (${studentProfile.availableStartTime} - ${studentProfile.availableEndTime})` 
      };
    }

    return { isAvailable: true, message: 'Time works with student\'s availability' };
  };

  // Fetch student availability for the invite modal
  const [studentAvailability, setStudentAvailability] = useState<any>(null);

  const fetchStudentAvailability = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}/profile`);
      if (response.ok) {
        const data = await response.json();
        setStudentAvailability(data.data.profile);
      }
    } catch (error) {
      console.error('Error fetching student availability:', error);
    }
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
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {project?.title}
                </h1>
                <p className="text-gray-600 mb-4 lg:mb-0">
                  Review and manage applications for this project
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">
                  {filteredApplications.length} of {applications.length} applications
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or cover note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="underReview">Under Review</option>
                <option value="interviewScheduled">Interview Scheduled</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Skills Filter */}
            <div>
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Skills</option>
                {getAllSkills().map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {applications.length === 0 ? 'No applications yet' : 'No applications match your filters'}
              </h3>
              <p className="text-gray-600 mb-6">
                {applications.length === 0 
                  ? 'Applications will appear here once students start applying to your project.'
                  : 'Try adjusting your search criteria to see more results.'
                }
              </p>
              {applications.length === 0 && (
                <Link href="/business/dashboard">
                  <Button variant="outline">Back to Dashboard</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredApplications.map((application) => (
              <Card key={application.id} hover>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    {/* Left Section - Student Info */}
                    <div className="flex-1 mb-4 lg:mb-0 lg:mr-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                            <span className="text-primary-600 text-lg font-bold">
                              {application.student?.user?.name?.charAt(0) || 'S'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {application.student?.user?.name || 'Unknown Student'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {application.student?.user?.email}
                            </p>
                            <p className="text-sm text-gray-500">
                              Applied {new Date(application.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(application.status)}
                        </div>
                      </div>

                      {/* Skills */}
                      {application.student?.skills && application.student.skills.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {application.student.skills.slice(0, 5).map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                            {application.student.skills.length > 5 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                +{application.student.skills.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cover Note */}
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Cover Note</p>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {application.coverNote}
                        </p>
                      </div>

                      {/* Interview Details */}
                      {application.status === 'interviewScheduled' && application.meetingDateTime && (
                        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="text-sm font-medium text-purple-800">
                              Interview scheduled for {formatMeetingDateTime(application.meetingDateTime)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex flex-col space-y-2 lg:min-w-[200px]">
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProfileModal({ isOpen: true, application })}
                        >
                          <UserIcon className="w-4 h-4 mr-2" />
                          View Profile
                        </Button>

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
                            onClick={() => {
                              setInviteModal({ isOpen: true, application });
                              if (application.studentId) {
                                fetchStudentAvailability(application.studentId);
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Invite to Interview
                          </Button>
                        )}

                        {canReschedule(application) && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setRescheduleModal({ isOpen: true, application });
                              setMeetingData({
                                meetingDateTime: application.meetingDateTime ? toDateTimeLocalValue(application.meetingDateTime) : '',
                                meetingLink: '',
                                message: ''
                              });
                              if (application.studentId) {
                                fetchStudentAvailability(application.studentId);
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <PencilSquareIcon className="w-4 h-4 mr-2" />
                            Reschedule
                          </Button>
                        )}

                        {canUndoReject(application) && (
                          <Button
                            size="sm"
                            onClick={() => handleUndoReject(application)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <ArrowUturnLeftIcon className="w-4 h-4 mr-2" />
                            Undo Reject
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
                    </div>
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
              {/* Student Availability Info */}
              {studentAvailability && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Student's Availability</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    <strong>Timezone:</strong> {studentAvailability.timezone?.replace('_', ' ').replace('America/', '').replace('Pacific/', '') || 'Not specified'}
                  </p>
                  
                  {/* Show flexible availability if available */}
                  {studentAvailability.availabilitySlots?.length > 0 ? (
                    <div className="space-y-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                        const daySlots = studentAvailability.availabilitySlots.filter((slot: any) => slot.day === day);
                        if (daySlots.length === 0) return null;
                        
                        return (
                          <p key={day} className="text-sm text-blue-800">
                            <strong>{day}:</strong> {daySlots.map((slot: any) => 
                              `${slot.start_time} - ${slot.end_time}`
                            ).join(', ')}
                          </p>
                        );
                      })}
                    </div>
                  ) : studentAvailability.availableDays?.length > 0 ? (
                    /* Fallback to legacy availability display */
                    <>
                      <p className="text-sm text-blue-800">
                        <strong>Available Days:</strong> {studentAvailability.availableDays.join(', ')}
                      </p>
                      {studentAvailability.availableStartTime && studentAvailability.availableEndTime && (
                        <p className="text-sm text-blue-800">
                          <strong>Available Hours:</strong> {studentAvailability.availableStartTime} - {studentAvailability.availableEndTime}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-blue-800">Student hasn't set specific availability preferences</p>
                  )}
                </div>
              )}

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
                
                {/* Availability Check Warning */}
                {meetingData.meetingDateTime && studentAvailability && (
                  (() => {
                    const availability = checkAvailability(studentAvailability, meetingData.meetingDateTime);
                    return (
                      <div className={`mt-2 p-3 rounded-lg ${
                        availability.isAvailable 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className={`text-sm ${
                          availability.isAvailable ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {availability.isAvailable ? '✓' : '⚠️'} {availability.message}
                        </p>
                      </div>
                    );
                  })()
                )}
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
                    setStudentAvailability(null);
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

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>Reschedule Interview</CardTitle>
              <CardDescription>
                Update the meeting time with {rescheduleModal.application?.student?.user?.name || 'this student'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Current Time:</strong> {rescheduleModal.application?.meetingDateTime 
                    ? formatMeetingDateTime(rescheduleModal.application.meetingDateTime) 
                    : 'Not set'}
                </p>
              </div>

              {/* Student Availability Info */}
              {studentAvailability && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Student's Availability</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    <strong>Timezone:</strong> {studentAvailability.timezone?.replace('_', ' ').replace('America/', '').replace('Pacific/', '') || 'Not specified'}
                  </p>
                  
                  {/* Show flexible availability if available */}
                  {studentAvailability.availabilitySlots?.length > 0 ? (
                    <div className="space-y-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                        const daySlots = studentAvailability.availabilitySlots.filter((slot: any) => slot.day === day);
                        if (daySlots.length === 0) return null;
                        
                        return (
                          <p key={day} className="text-sm text-blue-800">
                            <strong>{day}:</strong> {daySlots.map((slot: any) => 
                              `${slot.start_time} - ${slot.end_time}`
                            ).join(', ')}
                          </p>
                        );
                      })}
                    </div>
                  ) : studentAvailability.availableDays?.length > 0 ? (
                    /* Fallback to legacy availability display */
                    <>
                      <p className="text-sm text-blue-800">
                        <strong>Available Days:</strong> {studentAvailability.availableDays.join(', ')}
                      </p>
                      {studentAvailability.availableStartTime && studentAvailability.availableEndTime && (
                        <p className="text-sm text-blue-800">
                          <strong>Available Hours:</strong> {studentAvailability.availableStartTime} - {studentAvailability.availableEndTime}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-blue-800">Student hasn't set specific availability preferences</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Meeting Date & Time *
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={meetingData.meetingDateTime}
                  onChange={(e) => setMeetingData({ ...meetingData, meetingDateTime: e.target.value })}
                  required
                />
                
                {/* Availability Check Warning */}
                {meetingData.meetingDateTime && studentAvailability && (
                  (() => {
                    const availability = checkAvailability(studentAvailability, meetingData.meetingDateTime);
                    return (
                      <div className={`mt-2 p-3 rounded-lg ${
                        availability.isAvailable 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className={`text-sm ${
                          availability.isAvailable ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {availability.isAvailable ? '✓' : '⚠️'} {availability.message}
                        </p>
                      </div>
                    );
                  })()
                )}
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
                  Message about the change (optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={3}
                  placeholder="Explain why you're rescheduling..."
                  value={meetingData.message}
                  onChange={(e) => setMeetingData({ ...meetingData, message: e.target.value })}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleRescheduleInterview}
                  loading={actionLoading}
                  className="flex-1"
                >
                  Reschedule Interview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRescheduleModal({ isOpen: false, application: null });
                    setMeetingData({ meetingDateTime: '', meetingLink: '', message: '' });
                    setStudentAvailability(null);
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
                  placeholder="Provide constructive feedback to help the student improve..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleRejectApplication}
                  loading={actionLoading}
                  variant="outline"
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
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

      {/* Student Profile Modal */}
      <StudentProfileModal 
        isOpen={profileModal.isOpen}
        onClose={() => setProfileModal({ isOpen: false, application: null })}
        studentId={profileModal.application?.studentId}
      />
    </div>
  );
}

// Student Profile Modal Component
function StudentProfileModal({ 
  isOpen, 
  onClose, 
  studentId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  studentId?: string;
}) {
  const [studentData, setStudentData] = useState<{user: any, profile: any} | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchStudentProfile();
    }
  }, [isOpen, studentId]);

  const fetchStudentProfile = async () => {
    if (!studentId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/students/${studentId}/profile`);
      if (response.ok) {
        const data = await response.json();
        setStudentData(data.data);
      } else {
        console.error('Failed to fetch student profile');
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Student Profile</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : studentData ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 text-xl font-bold">
                      {studentData.user?.name?.charAt(0) || 'S'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{studentData.user?.name}</h4>
                    <p className="text-gray-600">{studentData.user?.email}</p>
                    {studentData.profile && (
                      <p className="text-sm text-gray-500">
                        {studentData.profile.major} • Class of {studentData.profile.year}
                      </p>
                    )}
                  </div>
                </div>

                {studentData.profile?.bio && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">About</h5>
                    <p className="text-gray-700 text-sm leading-relaxed">{studentData.profile.bio}</p>
                  </div>
                )}
              </div>

              {/* Skills */}
              {studentData.profile?.skills?.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Skills</h5>
                  <div className="flex flex-wrap gap-2">
                    {studentData.profile.skills.map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Professional Links</h5>
                <div className="space-y-2">
                  {studentData.profile?.linkedinUrl && (
                    <a
                      href={studentData.profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                    >
                      LinkedIn Profile →
                    </a>
                  )}
                  {studentData.profile?.githubUrl && (
                    <a
                      href={studentData.profile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                    >
                      GitHub Profile →
                    </a>
                  )}
                  {studentData.profile?.personalWebsiteUrl && (
                    <a
                      href={studentData.profile.personalWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Personal Website →
                    </a>
                  )}
                  {studentData.profile?.resumeUrl && (
                    <a
                      href={studentData.profile.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Resume →
                    </a>
                  )}
                </div>
              </div>

              {/* Proof of Work */}
              {studentData.profile?.proofOfWorkUrls?.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Portfolio & Work Samples</h5>
                  <div className="space-y-2">
                    {studentData.profile.proofOfWorkUrls.map((url: string, index: number) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-blue-600 hover:text-blue-800 text-sm truncate">
                          {url}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability */}
              {studentData.profile?.availableDays?.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Meeting Availability</h5>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Available Days:</strong> {studentData.profile.availableDays.join(', ')}
                    </p>
                    {studentData.profile.availableStartTime && studentData.profile.availableEndTime && (
                      <p className="text-sm text-green-800 mt-1">
                        <strong>Time:</strong> {studentData.profile.availableStartTime} - {studentData.profile.availableEndTime}
                      </p>
                    )}
                    <p className="text-sm text-green-800 mt-1">
                      <strong>Timezone:</strong> {studentData.profile.timezone?.replace('_', ' ').replace('America/', '').replace('Pacific/', '') || 'Not specified'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Unable to load student profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 