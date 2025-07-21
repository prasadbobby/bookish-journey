'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  CurrencyRupeeIcon,
  GlobeAltIcon,
  UsersIcon,
  DocumentTextIcon,
  ChartBarIcon,
  KeyIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const AdminSettingsPage = () => {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      platform_name: 'VillageStay',
      platform_description: 'Authentic rural tourism platform',
      contact_email: 'admin@villagestay.com',
      support_phone: '+91-9876543210',
      default_language: 'en',
      default_currency: 'INR'
    },
    fees: {
      platform_fee_percentage: 5,
      community_contribution_percentage: 2,
      host_payout_percentage: 93,
      payment_processing_fee: 2.9
    },
    policies: {
      min_booking_amount: 500,
      max_booking_amount: 50000,
      cancellation_window_hours: 24,
      auto_approval_enabled: false,
      review_moderation_enabled: true
    },
    notifications: {
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      booking_alerts: true,
      payment_alerts: true,
      system_alerts: true
    },
    security: {
      two_factor_required: false,
      session_timeout_minutes: 60,
      max_login_attempts: 5,
      password_min_length: 8
    }
  });

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
  }, [isAdmin, router]);

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const saveSettings = async (category) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`${category} settings saved successfully`);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: CogIcon },
    { id: 'fees', label: 'Fees & Pricing', icon: CurrencyRupeeIcon },
    { id: 'policies', label: 'Policies', icon: DocumentTextIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'system', label: 'System', icon: ServerIcon }
  ];

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Platform Settings ⚙️
          </h1>
          <p className="text-gray-600">
            Configure platform settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* General Settings */}
            {activeTab === 'general' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
                  <button
                    onClick={() => saveSettings('general')}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        value={settings.general.platform_name}
                        onChange={(e) => handleSettingChange('general', 'platform_name', e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={settings.general.contact_email}
                        onChange={(e) => handleSettingChange('general', 'contact_email', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform Description
                    </label>
                    <textarea
                      rows={3}
                      value={settings.general.platform_description}
                      onChange={(e) => handleSettingChange('general', 'platform_description', e.target.value)}
                      className="input-field resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Support Phone
                      </label>
                      <input
                        type="tel"
                        value={settings.general.support_phone}
                        onChange={(e) => handleSettingChange('general', 'support_phone', e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Currency
                      </label>
                      <select
                        value={settings.general.default_currency}
                        onChange={(e) => handleSettingChange('general', 'default_currency', e.target.value)}
                        className="input-field"
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Fees & Pricing */}
            {activeTab === 'fees' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Fees & Pricing</h2>
                  <button
                    onClick={() => saveSettings('fees')}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform Fee (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={settings.fees.platform_fee_percentage}
                        onChange={(e) => handleSettingChange('fees', 'platform_fee_percentage', parseFloat(e.target.value))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Community Contribution (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={settings.fees.community_contribution_percentage}
                        onChange={(e) => handleSettingChange('fees', 'community_contribution_percentage', parseFloat(e.target.value))}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Fee Breakdown</h3>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>Platform Fee: {settings.fees.platform_fee_percentage}%</p>
                      <p>Community Contribution: {settings.fees.community_contribution_percentage}%</p>
                      <p>Host Payout: {100 - settings.fees.platform_fee_percentage - settings.fees.community_contribution_percentage}%</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Policies */}
            {activeTab === 'policies' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Platform Policies</h2>
                  <button
                    onClick={() => saveSettings('policies')}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Booking Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="100"
                        value={settings.policies.min_booking_amount}
                        onChange={(e) => handleSettingChange('policies', 'min_booking_amount', parseInt(e.target.value))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Booking Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="1000"
                        value={settings.policies.max_booking_amount}
                        onChange={(e) => handleSettingChange('policies', 'max_booking_amount', parseInt(e.target.value))}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cancellation Window (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={settings.policies.cancellation_window_hours}
                      onChange={(e) => handleSettingChange('policies', 'cancellation_window_hours', parseInt(e.target.value))}
                      className="input-field"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Auto-approve listings</h3>
                        <p className="text-sm text-gray-600">Automatically approve new listings without manual review</p>
                      </div>
                      <button
                        onClick={() => handleSettingChange('policies', 'auto_approval_enabled', !settings.policies.auto_approval_enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.policies.auto_approval_enabled ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.policies.auto_approval_enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Review moderation</h3>
                        <p className="text-sm text-gray-600">Moderate reviews before they are published</p>
                      </div>
                      <button
                        onClick={() => handleSettingChange('policies', 'review_moderation_enabled', !settings.policies.review_moderation_enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.policies.review_moderation_enabled ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.policies.review_moderation_enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Add other tabs (notifications, security, system) with similar structure */}
            {/* For brevity, I'll show just one more tab */}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
                  <button
                    onClick={() => saveSettings('security')}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="480"
                        value={settings.security.session_timeout_minutes}
                        onChange={(e) => handleSettingChange('security', 'session_timeout_minutes', parseInt(e.target.value))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Login Attempts
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="10"
                        value={settings.security.max_login_attempts}
                        onChange={(e) => handleSettingChange('security', 'max_login_attempts', parseInt(e.target.value))}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Require Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-600">Require 2FA for all admin accounts</p>
                      </div>
                      <button
                        onClick={() => handleSettingChange('security', 'two_factor_required', !settings.security.two_factor_required)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.security.two_factor_required ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.security.two_factor_required ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Add placeholders for other tabs */}
            {(activeTab === 'notifications' || activeTab === 'system') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  {activeTab === 'notifications' ? 'Notification Settings' : 'System Settings'}
                </h2>
                <div className="text-center py-12">
                  <CogIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
                  <p className="text-gray-600">
                    {activeTab === 'notifications' ? 'Notification' : 'System'} settings will be available in the next update.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;