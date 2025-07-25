'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  UserIcon,
  PhoneIcon,
  ArrowRightIcon,
  HomeIcon,
  UserGroupIcon, // Using UserGroupIcon instead of BackpackIcon
  CheckIcon
} from '@heroicons/react/24/outline';
import Providers from '@/components/providers/Providers';
import AppLayout from '@/components/layout/AppLayout';

const RegisterPage = () => {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    user_type: '',
    phone: '',
    preferred_language: 'en'
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Password strength checker
  useEffect(() => {
    const password = formData.password;
    let strength = 0;
    
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    
    setPasswordStrength(strength);
  }, [formData.password]);

  const userTypes = [
    {
      type: 'tourist',
      title: 'Explorer',
      description: 'Discover authentic village experiences',
      icon: UserGroupIcon, // Fixed icon
      color: 'from-blue-500 to-cyan-600',
      features: ['Book village stays', 'Cultural experiences', 'AI travel assistant']
    },
    {
      type: 'host',
      title: 'Village Host',
      description: 'Share your village heritage with travelers',
      icon: HomeIcon,
      color: 'from-emerald-500 to-teal-600',
      features: ['List your property', 'AI content generation', 'Booking management']
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.user_type) {
        newErrors.user_type = 'Please select your account type';
      }
    }
    
    if (step === 2) {
      if (!formData.full_name) {
        newErrors.full_name = 'Full name is required';
      }
      
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }
    
    if (step === 3) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (passwordStrength < 75) {
        newErrors.password = 'Password should be stronger';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;
    
    setLoading(true);
    try {
      const result = await register(formData);
      if (result.success) {
        router.push('/auth/verify-email');
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return 'bg-red-500';
    if (passwordStrength < 50) return 'bg-orange-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Weak';
    if (passwordStrength < 50) return 'Fair';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50">
      
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 bg-gradient-to-r from-green-100/20 to-emerald-100/20 rounded-full blur-3xl"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600">Join our community of village enthusiasts</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Step {currentStep} of 3</span>
              <span className="text-sm text-gray-500">{Math.round((currentStep / 3) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / 3) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-6">
            
            <AnimatePresence mode="wait">
              
              {/* Step 1: User Type Selection */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Choose Your Role</h2>
                    <p className="text-gray-600">How would you like to use VillageStay?</p>
                  </div>

                  <div className="space-y-3">
                    {userTypes.map((type) => (
                      <motion.button
                        key={type.type}
                        onClick={() => setFormData(prev => ({ ...prev, user_type: type.type }))}
                        className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                          formData.user_type === type.type
                            ? 'border-green-500 bg-green-50 shadow-md scale-[1.02]'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${type.color} flex items-center justify-center shadow-lg`}>
                            <type.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{type.title}</h3>
                            <p className="text-gray-600 mb-2 text-sm">{type.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {type.features.map((feature, index) => (
                                <span key={index} className="inline-flex items-center space-x-1 text-xs text-gray-600">
                                  <CheckIcon className="w-3 h-3 text-green-500" />
                                  <span>{feature}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          {formData.user_type === type.type && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                            >
                              <CheckIcon className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {errors.user_type && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 text-sm text-red-600 font-medium text-center"
                    >
                      {errors.user_type}
                    </motion.p>
                  )}
                </motion.div>
              )}

              {/* Step 2: Personal Information */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Personal Information</h2>
                    <p className="text-gray-600">Tell us a bit about yourself</p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Full Name */}
                    <div>
                      <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="full_name"
                          name="full_name"
                          type="text"
                          value={formData.full_name}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 ${
                            errors.full_name ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="Enter your full name"
                        />
                      </div>
                      {errors.full_name && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-1 text-sm text-red-600 font-medium"
                        >
                          {errors.full_name}
                        </motion.p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 ${
                            errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="Enter your email address"
                        />
                      </div>
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-1 text-sm text-red-600 font-medium"
                        >
                          {errors.email}
                        </motion.p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <PhoneIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 ${
                            errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="Enter your phone number"
                        />
                      </div>
                      {errors.phone && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-1 text-sm text-red-600 font-medium"
                        >
                          {errors.phone}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Password Setup */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Secure Your Account</h2>
                    <p className="text-gray-600">Create a strong password</p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Password */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-10 py-3 bg-gray-50 border-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 ${
                            errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="Create a strong password"
                        />
                        <motion.button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </motion.button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      {formData.password && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2"
                        >
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Password strength:</span>
                            <span className={`font-medium ${
                              passwordStrength < 50 ? 'text-red-600' : 
                              passwordStrength < 75 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {getPasswordStrengthText()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className={`h-2 rounded-full ${getPasswordStrengthColor()}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${passwordStrength}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </motion.div>
                      )}
                      
                      {errors.password && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-600 font-medium"
                        >
                          {errors.password}
                        </motion.p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-10 py-3 bg-gray-50 border-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 ${
                            errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="Confirm your password"
                        />
                        <motion.button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {showConfirmPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </motion.button>
                      </div>
                      {errors.confirmPassword && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-1 text-sm text-red-600 font-medium"
                        >
                          {errors.confirmPassword}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-6 flex items-center justify-between space-x-3">
              
              {/* Back Button */}
              {currentStep > 1 && (
                <motion.button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all duration-300"
                  whileHover={{ x: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowRightIcon className="w-4 h-4 transform rotate-180" />
                  <span>Back</span>
                </motion.button>
              )}

              {/* Next/Submit Button */}
              {currentStep < 3 ? (
                <motion.button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ml-auto"
                  whileHover={{ x: 5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Continue</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center space-x-2"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        <span>Creating...</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center space-x-2"
                      >
                        <span>Create Account</span>
                        <CheckIcon className="w-4 h-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}
            </div>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600">Already have an account? </span>
              <Link
                href="/auth/login"
                className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors duration-200"
              >
                Sign in
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Wrap with providers
const RegisterPageWithProviders = () => {
  return (
    <Providers>
      <AppLayout>
        <RegisterPage />
      </AppLayout>
    </Providers>
  );
};

export default RegisterPageWithProviders;