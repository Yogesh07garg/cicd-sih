import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  BarChart3, 
  Shield, 
  Smartphone,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const features = [
    {
      icon: Users,
      title: 'User Management',
      description: 'Comprehensive role-based access control for admins, faculty, and students'
    },
    {
      icon: BookOpen,
      title: 'Academic Management',
      description: 'Complete academic workflow from admissions to examinations'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Real-time insights and detailed reporting for better decision making'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with JWT authentication and data encryption'
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      description: 'Responsive design that works seamlessly on all devices'
    },
    {
      icon: GraduationCap,
      title: 'Complete Solution',
      description: 'All-in-one platform for education management needs'
    }
  ];

  const benefits = [
    'QR Code-based smart attendance system',
    'Real-time notice board with targeted messaging',
    'Comprehensive fee management and tracking',
    'Digital library with AI-powered recommendations',
    'Hostel management with AI room allocation',
    'Placement portal with resume builder'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">College ERP</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Modern College
              <span className="text-primary-600 block">Management System</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline your educational institution with our comprehensive ERP solution. 
              Manage students, faculty, academics, and operations all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/register"
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition duration-200 flex items-center group"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 px-8 py-3 rounded-lg text-lg font-semibold border-2 border-primary-600 hover:bg-primary-50 transition duration-200"
              >
                Login to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Institution
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our comprehensive ERP system covers all aspects of educational institution management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition duration-200"
                >
                  <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Powerful Features for Modern Education
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Experience the future of educational management with our advanced features
                designed specifically for colleges and universities.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-8 border">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-32 bg-primary-50 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-12 w-12 text-primary-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-green-50 rounded-lg flex items-center justify-center">
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="h-20 bg-blue-50 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Institution?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of educational institutions already using our ERP system 
            to streamline their operations and improve student experience.
          </p>
          <Link
            to="/register"
            className="bg-white hover:bg-gray-100 text-primary-600 px-8 py-3 rounded-lg text-lg font-semibold transition duration-200 inline-flex items-center group"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">College ERP</span>
            </div>
            <p className="text-gray-400 mb-6">
              Empowering educational institutions with modern management solutions
            </p>
            <div className="border-t border-gray-800 pt-8">
              <p className="text-gray-400 text-sm">
                © 2024 College ERP System. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;