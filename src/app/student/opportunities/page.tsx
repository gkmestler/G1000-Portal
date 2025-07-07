'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Project, INDUSTRY_TAGS, SKILL_TAGS, COMPENSATION_TYPES, DURATION_OPTIONS } from '@/types';
import Link from 'next/link';

interface FilterState {
  search: string;
  industry: string[];
  skills: string[];
  compensationType: string[];
  duration: string[];
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    industry: [],
    skills: [],
    compensationType: [],
    duration: []
  });

  useEffect(() => {
    fetchOpportunities();
  }, [filters]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.industry.length > 0) params.append('industry', filters.industry.join(','));
      if (filters.skills.length > 0) params.append('skills', filters.skills.join(','));
      if (filters.compensationType.length > 0) params.append('compensationType', filters.compensationType.join(','));
      if (filters.duration.length > 0) params.append('duration', filters.duration.join(','));

      const response = await fetch(`/api/opportunities?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (filterType: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentValues = prev[filterType] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [filterType]: newValues };
    });
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      industry: [],
      skills: [],
      compensationType: [],
      duration: []
    });
  };

  const getCompensationIcon = (type: string) => {
    switch (type) {
      case 'stipend': return '💰';
      case 'equity': return '📈';
      case 'credit': return '🎓';
      default: return '💼';
    }
  };

  const isApplicationWindowOpen = (project: Project) => {
    const now = new Date();
    const start = new Date(project.applyWindowStart);
    const end = new Date(project.applyWindowEnd);
    return now >= start && now <= end;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Opportunities</h1>
          <p className="mt-2 text-gray-600">
            Discover exciting AI and automation projects from small business owners
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by keyword or project title"
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Industry Filter */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Industry</h3>
                    <div className="space-y-2">
                      {INDUSTRY_TAGS.map((industry) => (
                        <label key={industry} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.industry.includes(industry)}
                            onChange={() => handleFilterChange('industry', industry)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{industry}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Skills Filter */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Skills Required</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {SKILL_TAGS.map((skill) => (
                        <label key={skill} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.skills.includes(skill)}
                            onChange={() => handleFilterChange('skills', skill)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{skill}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Compensation Filter */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Compensation Type</h3>
                    <div className="space-y-2">
                      {COMPENSATION_TYPES.map((type) => (
                        <label key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.compensationType.includes(type)}
                            onChange={() => handleFilterChange('compensationType', type)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Duration Filter */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Duration</h3>
                    <div className="space-y-2">
                      {DURATION_OPTIONS.map((duration) => (
                        <label key={duration} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.duration.includes(duration)}
                            onChange={() => handleFilterChange('duration', duration)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{duration}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Button variant="ghost" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Opportunities Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-600 text-lg">No opportunities found matching your criteria.</p>
                <p className="text-gray-500 mt-2">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              opportunities.map((opportunity) => {
                const isOpen = isApplicationWindowOpen(opportunity);
                return (
                  <Card key={opportunity.id} hover className="flex flex-col">
                    <CardContent className="p-6 flex-1">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {opportunity.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {opportunity.industryTags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{getCompensationIcon(opportunity.compensationType)}</span>
                          <span>{opportunity.compensationValue}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {opportunity.description}
                      </p>

                      {/* Duration */}
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {opportunity.duration}
                      </div>

                      {/* Skills */}
                      {opportunity.requiredSkills.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Skills Required:</p>
                          <div className="flex flex-wrap gap-1">
                            {opportunity.requiredSkills.slice(0, 3).map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {skill}
                              </span>
                            ))}
                            {opportunity.requiredSkills.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{opportunity.requiredSkills.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Application Window */}
                      <div className="text-xs text-gray-500 mb-4">
                        Applications: {new Date(opportunity.applyWindowStart).toLocaleDateString()} - {new Date(opportunity.applyWindowEnd).toLocaleDateString()}
                      </div>
                    </CardContent>

                    {/* Footer */}
                    <div className="p-6 pt-0">
                      <div className="flex space-x-3">
                        <Link href={`/student/opportunities/${opportunity.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {isOpen ? (
                          <Link href={`/student/opportunities/${opportunity.id}/apply`}>
                            <Button className="px-6">
                              Apply
                            </Button>
                          </Link>
                        ) : (
                          <Button disabled className="px-6">
                            {new Date() > new Date(opportunity.applyWindowEnd) ? 'Closed' : 'Not Open'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
} 