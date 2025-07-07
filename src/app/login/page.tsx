'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function StudentLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});
  const [devCode, setDevCode] = useState<string>(''); // For development mode
  const [mounted, setMounted] = useState(false); // Fix hydration

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required';
    if (!email.includes('@')) return 'Please enter a valid email';
    if (!email.toLowerCase().endsWith('@babson.edu')) {
      return 'Please use your @babson.edu email address';
    }
    return '';
  };

  const validateCode = (code: string) => {
    if (!code) return 'Verification code is required';
    if (code.length !== 6) return 'Verification code must be 6 digits';
    if (!/^\d{6}$/.test(code)) return 'Verification code must contain only numbers';
    return '';
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setLoading(true);
    setErrors({});
    setDevCode(''); // Clear any previous dev code

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('code');
        // If we got a verification code back (development mode), store it
        if (data.verificationCode) {
          setDevCode(data.verificationCode);
          if (mounted) {
            toast.success(`Code generated: ${data.verificationCode} (Dev mode)`);
          }
        } else {
          if (mounted) {
            toast.success('Verification code sent to your email!');
          }
        }
      } else {
        if (response.status === 404) {
          setErrors({ email: 'Email not found. Please make sure you are registered for G1000.' });
        } else {
          setErrors({ email: data.error || 'Failed to send verification code' });
        }
      }
    } catch {
      setErrors({ email: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const codeError = validateCode(code);
    if (codeError) {
      setErrors({ code: codeError });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        if (mounted) {
          toast.success('Welcome to G1000 Portal!');
        }
        router.push('/student/dashboard');
      } else {
        setErrors({ code: data.error || 'Invalid verification code' });
      }
    } catch {
      setErrors({ code: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setErrors({});
    setDevCode('');
  };

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
              <AcademicCapIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Student Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
            <AcademicCapIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Student Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in with your Babson email address
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 'email' ? 'Enter Your Email' : 'Enter Verification Code'}
            </CardTitle>
            <CardDescription>
              {step === 'email' 
                ? 'We\'ll send you a verification code to sign in'
                : `We sent a 6-digit code to ${email}`
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Development Mode Code Display */}
            {step === 'code' && devCode && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <strong>🧪 Development Mode</strong>
                </div>
                <div className="text-lg font-mono mt-1">
                  Your verification code: <strong>{devCode}</strong>
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  (In production, this would be sent to your email)
                </div>
              </div>
            )}
            
            {step === 'email' ? (
              <form onSubmit={handleRequestCode} className="space-y-6">
                <Input
                  label="Babson Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@babson.edu"
                  error={errors.email}
                  required
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={!email}
                >
                  Send Verification Code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <Input
                  label="Verification Code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  error={errors.code}
                  maxLength={6}
                  required
                />
                
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    loading={loading}
                    disabled={code.length !== 6}
                  >
                    Sign In
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleBackToEmail}
                  >
                    Use Different Email
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Are you a business owner?{' '}
            <Link href="/business/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 