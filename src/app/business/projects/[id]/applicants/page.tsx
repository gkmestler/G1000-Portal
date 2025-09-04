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
  PencilSquareIcon,
  DocumentIcon,
  GlobeAltIcon,
  LinkIcon,
  ClockIcon
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
        fetch(`/api/business/projects/${projectId}`, { credentials: 'same-origin' }),
        fetch(`/api/business/projects/${projectId}/applications`, { credentials: 'same-origin' })
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
      const response = await fetch(`/api/students/${studentId}/profile`, {
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        }
      });
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
        application={profileModal.application}
      />
    </div>
  );
}

// New Student Profile Modal Component with better data handling
function StudentProfileModal({ 
  isOpen, 
  onClose, 
  application 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  application: Application | null;
}) {
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && application?.studentId) {
      fetchFullProfile();
    } else if (!isOpen) {
      // Reset state when modal closes
      setProfileData(null);
      setError(null);
    }
  }, [isOpen, application?.studentId]);

  const fetchFullProfile = async () => {
    if (!application?.studentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the auth token from cookies or localStorage
      const response = await fetch(`/api/students/${application.studentId}/profile`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfileData(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load profile');
        console.error('Profile fetch failed:', response.status, errorData);
      }
    } catch (err) {
      console.error('Network error fetching profile:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Use data from application first, then enhance with full profile if available
  const student = application?.student;
  const fullProfile = profileData?.profile;
  const user = profileData?.user || student?.user;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Student Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600">Loading profile details...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <XMarkIcon className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-gray-900 font-medium mb-2">Could not load profile</p>
              <p className="text-gray-600 text-sm">{error}</p>
              {/* Show basic info from application if available */}
              {student && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                  <p className="text-sm text-gray-700 font-medium mb-1">Available Information:</p>
                  <p className="text-sm text-gray-600">{user?.name} • {user?.email}</p>
                  {student.skills?.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">Skills: {student.skills.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 text-2xl font-bold">
                      {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-900">{user?.name || 'Student Name'}</h4>
                    <p className="text-gray-600">{user?.email}</p>
                    {(fullProfile?.major || fullProfile?.year) && (
                      <p className="text-sm text-gray-500 mt-1">
                        {fullProfile?.major && <span>{fullProfile.major}</span>}
                        {fullProfile?.major && fullProfile?.year && <span> • </span>}
                        {fullProfile?.year && <span>Class of {fullProfile.year}</span>}
                      </p>
                    )}
                  </div>
                </div>
                
                {fullProfile?.bio && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-gray-700 leading-relaxed">{fullProfile.bio}</p>
                  </div>
                )}
              </div>

              {/* Skills Section */}
              {((fullProfile?.skills?.length ?? 0) > 0 || (student?.skills?.length ?? 0) > 0) && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Technical Skills</h5>
                  <div className="flex flex-wrap gap-2">
                    {(fullProfile?.skills || student?.skills || []).map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links Section */}
              {(fullProfile?.linkedinUrl || fullProfile?.githubUrl || fullProfile?.personalWebsiteUrl || fullProfile?.resumeUrl || student?.resumeUrl) && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Professional Links</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(fullProfile?.resumeUrl || student?.resumeUrl) && (
                      <a
                        href={fullProfile?.resumeUrl || student?.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <DocumentIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-700">View Resume</span>
                        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 ml-auto" />
                      </a>
                    )}
                    {fullProfile?.linkedinUrl && (
                      <a
                        href={fullProfile.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-5 h-5 text-gray-400 mr-3">
                          <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .4C4.698.4.4 4.698.4 10s4.298 9.6 9.6 9.6 9.6-4.298 9.6-9.6S15.302.4 10 .4zM7.65 13.979H5.706V7.723H7.65v6.256zm-.984-7.024c-.614 0-1.011-.435-1.011-.973 0-.549.409-.971 1.036-.971s1.011.422 1.023.971c0 .538-.396.973-1.048.973zm8.084 7.024h-1.944v-3.467c0-.807-.282-1.355-.985-1.355-.537 0-.856.371-.997.728-.052.127-.065.307-.065.486v3.607H8.814v-4.26c0-.781-.025-1.434-.051-1.996h1.689l.089.869h.039c.256-.408.883-1.01 1.932-1.01 1.279 0 2.238.857 2.238 2.699v3.699z"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">LinkedIn</span>
                        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 ml-auto" />
                      </a>
                    )}
                    {fullProfile?.githubUrl && (
                      <a
                        href={fullProfile.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-5 h-5 text-gray-400 mr-3">
                          <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">GitHub</span>
                        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 ml-auto" />
                      </a>
                    )}
                    {fullProfile?.personalWebsiteUrl && (
                      <a
                        href={fullProfile.personalWebsiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <GlobeAltIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-700">Portfolio</span>
                        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 ml-auto" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Portfolio/Proof of Work */}
              {fullProfile?.proofOfWorkUrls?.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Work Samples & Projects</h5>
                  <div className="space-y-2">
                    {fullProfile.proofOfWorkUrls.map((url: string, index: number) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                      >
                        <div className="flex items-center">
                          <LinkIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-blue-600 group-hover:text-blue-800 truncate flex-1">
                            {url}
                          </span>
                          <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 ml-2" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability Section */}
              {(fullProfile?.availabilitySlots?.length > 0 || fullProfile?.availableDays?.length > 0) && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Interview Availability</h5>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <ClockIcon className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">Timezone</p>
                          <p className="text-sm text-green-700">
                            {fullProfile?.timezone?.replace('_', ' ').replace('America/', '').replace('Pacific/', '') || 'Not specified'}
                          </p>
                        </div>
                      </div>
                      
                      {fullProfile?.availabilitySlots?.length > 0 ? (
                        <div className="flex items-start">
                          <CalendarIcon className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900 mb-1">Available Times</p>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                              const slots = fullProfile.availabilitySlots.filter((slot: any) => slot.day === day);
                              if (slots.length === 0) return null;
                              return (
                                <p key={day} className="text-sm text-green-700">
                                  <span className="font-medium">{day}:</span> {slots.map((slot: any) => 
                                    `${slot.start_time} - ${slot.end_time}`
                                  ).join(', ')}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      ) : fullProfile?.availableDays?.length > 0 && (
                        <div className="flex items-start">
                          <CalendarIcon className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900">Available Days</p>
                            <p className="text-sm text-green-700">{fullProfile.availableDays.join(', ')}</p>
                            {fullProfile.availableStartTime && fullProfile.availableEndTime && (
                              <p className="text-sm text-green-700 mt-1">
                                {fullProfile.availableStartTime} - {fullProfile.availableEndTime}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Application Cover Note */}
              {application?.coverNote && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Application Cover Note</h5>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 leading-relaxed">{application.coverNote}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 