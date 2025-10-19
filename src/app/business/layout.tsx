'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { 
  BuildingOfficeIcon,
  HomeIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import GeneratorLogo from '@/components/GeneratorLogo';

interface BusinessUser {
  id: string;
  email: string;
  name: string;
  role: string;
  businessProfile?: {
    companyName: string;
    isApproved: boolean;
  };
}

interface BusinessProfile {
  companyName?: string;
  logoUrl?: string;
  contactName?: string;
}

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<BusinessUser | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignOutMenu, setShowSignOutMenu] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && user.role === 'owner') {
      fetchProfile();
    }
  }, [user]);

  // Fetch profile on page focus to get latest updates
  useEffect(() => {
    const handleFocus = () => {
      if (user && user.role === 'owner') {
        fetchProfile();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profileUpdated') {
        fetchProfile();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.sign-out-dropdown')) {
        setShowSignOutMenu(false);
      }
    };

    if (showSignOutMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSignOutMenu]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/business/profile', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched profile in layout:', data.data);
        setProfile(data.data);
      } else if (response.status === 404) {
        // Profile doesn't exist yet
        console.log('Profile not found in layout');
        setProfile({
          companyName: '',
          contactName: '',
          logoUrl: ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile in layout:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        const userData = data.data;
        
        if (userData.role !== 'owner') {
          router.push('/business/login');
          return;
        }
        
        // Ensure we have complete user data before setting
        if (userData && userData.businessProfile !== undefined) {
          setUser(userData);
          setLoading(false);
        } else if (userData && userData.role === 'owner') {
          // If businessProfile is missing, fetch it
          console.log('Business profile missing, user data:', userData);
          setUser(userData);
          setLoading(false);
        }
      } else {
        router.push('/business/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/business/login');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logged out successfully');
      router.push('/business/login');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed');
    }
  };

  // Don't show layout for auth pages
  const isAuthPage = pathname === '/business/login' || pathname === '/business/register';
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show pending approval if we have user data and they're not approved
  if (user.businessProfile && user.businessProfile.isApproved === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BuildingOfficeIcon className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Pending Approval</h2>
            <p className="text-gray-600 mb-6">
              Your business account is currently being reviewed by our team. 
              You&apos;ll receive an email notification once your account is approved.
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                <strong>Company:</strong> {user.businessProfile.companyName}
              </p>
              <p className="text-sm text-gray-500">
                <strong>Email:</strong> {user.email}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="mt-6"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/business/dashboard',
      icon: HomeIcon,
    },
    {
      name: 'New Project',
      href: '/business/projects/new',
      icon: PlusIcon,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link href="/business/dashboard" className="flex items-center space-x-3">
                <GeneratorLogo height={48} />
                <div className="h-10 w-px bg-gray-300"></div>
                <span className="text-xl font-semibold text-generator-dark">G1000 Business</span>
              </Link>

              <div className="ml-16 flex space-x-8">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                        isActive
                          ? 'text-primary-600 border-b-2 border-primary-600'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/business/profile" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.contactName || user.name || 'Business Owner'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {profile?.companyName || 'Update Profile'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-generator-green">
                  {profile?.logoUrl ? (
                    <img
                      src={profile.logoUrl}
                      alt={profile?.companyName || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </Link>

              <div className="h-8 w-px bg-gray-300"></div>

              <div className="relative sign-out-dropdown">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSignOutMenu(!showSignOutMenu)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                </Button>

                {showSignOutMenu && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
} 