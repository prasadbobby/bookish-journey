"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
  ArrowRightIcon,
  SparklesIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import Providers from "@/components/providers/Providers";
import AppLayout from "@/components/layout/AppLayout";

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user, loading } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Demo accounts data
  const demoAccounts = [
    {
      type: "Host",
      email: "rajesh.farmer@gmail.com",
      password: "SecurePass123",
      description: "Manage properties & bookings",
      icon: "🏠",
      color: "from-green-500 to-emerald-600",
    },
    {
      type: "Tourist",
      email: "priya.traveler@gmail.com",
      password: "TravelLove123",
      description: "Book authentic village stays",
      icon: "🎒",
      color: "from-blue-500 to-cyan-600",
    },
    {
      type: "Admin",
      email: "admin@villagestay.com",
      password: "AdminPass123",
      description: "Platform administration",
      icon: "⚙️",
      color: "from-purple-500 to-violet-600",
    },
  ];

  // Testimonials data
  const testimonials = [
    {
      text: "VillageStay connected me with authentic rural experiences. The AI recommendations were spot-on!",
      author: "Sarah Johnson",
      role: "Travel Enthusiast",
      location: "California, USA",
    },
    {
      text: "As a village host, this platform helped me showcase our heritage and earn sustainable income.",
      author: "Raj Kumar",
      role: "Village Host",
      location: "Rajasthan, India",
    },
    {
      text: "The cultural concierge made my village stay educational and meaningful. Highly recommended!",
      author: "Maria Santos",
      role: "Cultural Explorer",
      location: "São Paulo, Brazil",
    },
  ];

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const returnUrl = searchParams.get("returnUrl");

      if (returnUrl) {
        router.push(returnUrl);
      } else {
        switch (user.user_type) {
          case "host":
            router.push("/host/dashboard");
            break;
          case "tourist":
            router.push("/tourist/dashboard");
            break;
          case "admin":
            router.push("/admin/dashboard");
            break;
          default:
            router.push("/dashboard");
        }
      }
    }
  }, [isAuthenticated, user, loading, router, searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoginLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        // Redirect will be handled by useEffect
      }
    } catch (error) {
      console.error("Login submission error:", error);
    } finally {
      setLoginLoading(false);
    }
  };

  const fillDemoAccount = (account) => {
    setFormData({
      email: account.email,
      password: account.password,
    });
    setErrors({});
  };

  // Loading state
  if (loading) {
    return (
      <Providers>
        <AppLayout>
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <SparklesIcon className="w-8 h-8 text-white" />
                </motion.div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Authenticating...
              </h3>
              <p className="text-gray-600">
                Please wait while we verify your session
              </p>
            </motion.div>
          </div>
        </AppLayout>
      </Providers>
    );
  }

  // Already authenticated state
  if (isAuthenticated) {
    return (
      <Providers>
        <AppLayout>
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Redirecting to dashboard...
              </h3>
              <p className="text-gray-600">
                Welcome back! Taking you to your dashboard
              </p>
            </motion.div>
          </div>
        </AppLayout>
      </Providers>
    );
  }

  return (
    <Providers>
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Floating elements */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-64 h-64 bg-gradient-to-r from-emerald-100/20 to-teal-100/20 rounded-full blur-3xl"
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

          <div className="relative z-10 flex min-h-screen">
            {/* Left Side - Branding & Testimonials */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-lg"
              >
                {/* Logo & Brand */}
                <div className="mb-12">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl">
                      <span className="text-white font-bold text-2xl">V</span>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                        VillageStay
                      </h1>
                      <p className="text-gray-600 font-medium">
                        Authentic Rural Experiences
                      </p>
                    </div>
                  </div>

                  <h2 className="text-4xl font-bold text-gray-900 leading-tight mb-6">
                    Welcome back to your
                    <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      village adventure
                    </span>
                  </h2>

                  <p className="text-xl text-gray-600 leading-relaxed">
                    Connect with authentic rural communities and discover the
                    beauty of village life through AI-powered recommendations.
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-12">
                  {[
                    {
                      icon: SparklesIcon,
                      text: "AI-powered village discovery",
                    },
                    { icon: ShieldCheckIcon, text: "Verified local hosts" },
                    {
                      icon: GlobeAltIcon,
                      text: "Cultural immersion experiences",
                    },
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center space-x-3"
                    >
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="text-gray-700 font-medium">
                        {feature.text}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Testimonial */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTestimonial}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50"
                  >
                    <p className="text-gray-700 italic mb-4 leading-relaxed">
                      "{testimonials[currentTestimonial].text}"
                    </p>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {testimonials[currentTestimonial].author.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {testimonials[currentTestimonial].author}
                        </p>
                        <p className="text-sm text-gray-600">
                          {testimonials[currentTestimonial].role} •{" "}
                          {testimonials[currentTestimonial].location}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Testimonial indicators */}
                <div className="flex justify-center space-x-2 mt-6">
                  {testimonials.map((_, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setCurrentTestimonial(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentTestimonial
                          ? "bg-emerald-500 w-8"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-full max-w-md"
              >
                {/* Mobile Logo */}
                <div className="lg:hidden text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <span className="text-white font-bold text-2xl">V</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Welcome Back
                  </h1>
                  <p className="text-gray-600">
                    Sign in to your VillageStay account
                  </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/50 p-8">
                  {/* Header */}
                  <div className="hidden lg:block text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Sign In
                    </h2>
                    <p className="text-gray-600">Welcome back to VillageStay</p>
                  </div>

                  {/* Demo Accounts */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                      <UserIcon className="w-4 h-4 mr-2" />
                      Try Demo Accounts
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {demoAccounts.map((account, index) => (
                        <motion.button
                          key={index}
                          onClick={() => fillDemoAccount(account)}
                          className={`p-4 rounded-xl border-2 border-transparent bg-gradient-to-r ${account.color} text-white transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group`}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{account.icon}</span>
                              <div className="text-left">
                                <div className="font-bold">
                                  {account.type} Account
                                </div>
                                <div className="text-sm opacity-90">
                                  {account.description}
                                </div>
                              </div>
                            </div>
                            <ArrowRightIcon className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500 font-medium">
                        Or sign in with email
                      </span>
                    </div>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email Field */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-gray-900 placeholder-gray-500 ${
                            errors.email
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          placeholder="Enter your email address"
                        />
                      </div>
                      <AnimatePresence>
                        {errors.email && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-2 text-sm text-red-600 font-medium"
                          >
                            {errors.email}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Password Field */}
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={handleChange}
                          className={`w-full pl-12 pr-12 py-4 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-gray-900 placeholder-gray-500 ${
                            errors.password
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          placeholder="Enter your password"
                        />
                        <motion.button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center"
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
                      <AnimatePresence>
                        {errors.password && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-2 text-sm text-red-600 font-medium"
                          >
                            {errors.password}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <AnimatePresence mode="wait">
                        {loginLoading ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center space-x-2"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>Signing In...</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center space-x-2"
                          >
                            <span>Sign In</span>
                            <ArrowRightIcon className="w-5 h-5" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </form>

                  {/* Footer Links */}
                  <div className="mt-8 space-y-4">
                    <div className="text-center">
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-200"
                      >
                        Forgot your password?
                      </Link>
                    </div>

                    <div className="text-center">
                      <span className="text-sm text-gray-600">
                        Don't have an account?{" "}
                      </span>
                      <Link
                        href="/auth/register"
                        className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors duration-200"
                      >
                        Create account
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </AppLayout>
    </Providers>
  );
};

export default LoginPage;
