'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { BuildingOfficeIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import GeneratorLogo from '@/components/GeneratorLogo';
import toast from 'react-hot-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle search params after mounting
  useEffect(() => {
    if (mounted) {
      const message = searchParams.get('message');
      if (message) {
        toast.success(message);
      }
    }
  }, [mounted, searchParams]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!email.includes('@')) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/login/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login successful, redirecting to dashboard...');
        toast.success('Welcome back to G1000 Portal!');
        // Force a hard navigation to ensure auth state is properly loaded
        window.location.href = '/business/dashboard';
      } else {
        if (response.status === 403) {
          setErrors({ 
            email: 'Your account is awaiting approval. Please contact support.' 
          });
        } else if (response.status === 401) {
          setErrors({ 
            password: 'Invalid email or password' 
          });
        } else {
          setErrors({ 
            email: data.error || 'Login failed' 
          });
        }
      }
    } catch {
      setErrors({ email: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#789b4a] rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-generator-dark">
            Business Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-generator-green/5 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-generator-dark/5 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 rounded-full bg-generator-gold/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-soft border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <Link href="/" className="flex items-center space-x-3">
              <GeneratorLogo height={48} />
              <div className="h-10 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-generator-dark">
                G1000 Portal
              </h1>
            </Link>
            <Link href="/">
              <Button
                variant="ghost"
                icon={<ArrowLeftIcon className="w-4 h-4" />}
              >
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8 mt-16">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#789b4a] rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-generator-dark">
            Business Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your business account
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="shadow-soft border-gray-100">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Enter your credentials to access your business dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Business Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                error={errors.email}
                required
              />
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-2.5 pr-12 bg-white border border-gray-200 rounded-xl shadow-sm placeholder:text-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary-500 focus:ring-primary-500/20 transition-all duration-200"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.password}
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={!email || !password}
              >
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/business/register" className="font-medium text-generator-green hover:text-generator-dark transition-colors">
                Register your business
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Are you a student?{' '}
              <Link href="/login" className="font-medium text-generator-green hover:text-generator-dark transition-colors">
                Student portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BusinessLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#789b4a] rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-generator-dark">
            Business Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Loading...
          </p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
} 