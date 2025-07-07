'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, AcademicCapIcon, BuildingOfficeIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/">
                  <h1 className="text-2xl font-bold text-gradient cursor-pointer">G1000 Portal</h1>
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4 relative z-10">
              <Button 
                variant="ghost"
                onClick={() => router.push('/login')}
                className="hover:bg-gray-100 transition-colors duration-200"
              >
                Student Portal
              </Button>
              <Button 
                variant="primary"
                onClick={() => router.push('/business/register')}
                className="hover:bg-primary-700 transition-colors duration-200"
              >
                Business Portal
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20">
        <div className="gradient-bg">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Connecting Students with
                <br />
                <span className="text-accent-100">Real-World Projects</span>
              </h1>
              <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
                The G1000 Portal bridges Babson AI Innovators Bootcamp alumni with small business owners 
                for meaningful AI and automation projects.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login" className="no-underline">
                  <Button 
                    size="lg"
                    type="button"
                    style={{ 
                      backgroundColor: 'white', 
                      color: '#006744',
                      fontSize: '1.125rem',
                      paddingLeft: '2rem',
                      paddingRight: '2rem',
                      paddingTop: '0.75rem',
                      paddingBottom: '0.75rem'
                    }}
                    className="hover:bg-gray-50 cursor-pointer w-full"
                  >
                    <AcademicCapIcon className="w-5 h-5 mr-2" />
                    Student Portal
                  </Button>
                </Link>
                <Link href="/business/register" className="no-underline">
                  <Button 
                    variant="accent"
                    size="lg"
                    type="button"
                    className="text-lg px-8 py-3 cursor-pointer w-full"
                  >
                    <BuildingOfficeIcon className="w-5 h-5 mr-2" />
                    Business Portal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-transparent pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-accent-400/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary-400/20 blur-3xl pointer-events-none"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How G1000 Portal Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A streamlined platform designed to create meaningful connections between talented students and innovative businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* For Students */}
            <div className="card-hover text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AcademicCapIcon className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">For Students</h3>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>• Browse real-world AI projects</li>
                <li>• Apply with your portfolio</li>
                <li>• Get matched with businesses</li>
                <li>• Gain practical experience</li>
              </ul>
              <Button 
                variant="outline"
                onClick={() => router.push('/login')}
                className="inline-flex items-center"
              >
                Get Started
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* For Businesses */}
            <div className="card-hover text-center">
              <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BuildingOfficeIcon className="w-8 h-8 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">For Businesses</h3>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>• Post your AI project needs</li>
                <li>• Review qualified applications</li>
                <li>• Connect with skilled students</li>
                <li>• Drive innovation forward</li>
              </ul>
              <Button 
                variant="outline"
                onClick={() => router.push('/business/register')}
                className="inline-flex items-center"
              >
                Post Project
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Analytics */}
            <div className="card-hover text-center">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChartBarIcon className="w-8 h-8 text-accent-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Track Success</h3>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>• Monitor project progress</li>
                <li>• Measure student success</li>
                <li>• Analyze business outcomes</li>
                <li>• Continuous improvement</li>
              </ul>
              <div className="btn-ghost cursor-default inline-flex items-center justify-center">
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">500+</div>
              <div className="text-gray-600">G1000 Alumni</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-secondary-600 mb-2">100+</div>
              <div className="text-gray-600">Business Partners</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-accent-600 mb-2">50+</div>
              <div className="text-gray-600">Active Projects</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">95%</div>
              <div className="text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-bg">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join the G1000 community and be part of the future of AI innovation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => router.push('/login')}
              style={{ 
                backgroundColor: 'white', 
                color: '#006744',
                fontSize: '1.125rem',
                paddingLeft: '2rem',
                paddingRight: '2rem',
                paddingTop: '0.75rem',
                paddingBottom: '0.75rem'
              }}
              className="hover:bg-gray-50"
            >
              Student Login
            </Button>
            <Button 
              variant="accent"
              size="lg"
              onClick={() => router.push('/business/register')}
              className="text-lg px-8 py-3"
            >
              Register Business
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <h3 className="text-2xl font-bold text-gradient mb-4">G1000 Portal</h3>
              <p className="text-gray-300 mb-4">
                Connecting Babson AI Innovators Bootcamp alumni with small business owners 
                for meaningful AI and automation projects.
              </p>
              <p className="text-sm text-gray-400">
                © 2024 Generator Team. All rights reserved.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Students</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/login" className="hover:text-white">Sign In</Link></li>
                <li><Link href="/student/opportunities" className="hover:text-white">Browse Projects</Link></li>
                <li><Link href="/student/profile" className="hover:text-white">Create Profile</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Businesses</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/business/register" className="hover:text-white">Register</Link></li>
                <li><Link href="/business/login" className="hover:text-white">Sign In</Link></li>
                <li><Link href="/business/projects/new" className="hover:text-white">Post Project</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 