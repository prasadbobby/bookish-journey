// src/app/admin/users/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { adminAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const AdminUsersPage = () => {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    user_type: '',
    is_verified: false,
    is_active: true
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total_count: 0,
    total_pages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    user_type: '',
    is_verified: ''
  });

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [isAdmin, router, pagination.page, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      // Mock data for demonstration
      const mockUsers = [
        {
          id: '1',
          full_name: 'Rajesh Kumar',
          email: 'rajesh.farmer@gmail.com',
          phone: '+91-9876543210',
          user_type: 'host',
          is_verified: true,
          is_active: true,
          created_at: '2024-01-15T10:30:00Z',
          last_login: '2024-12-10T14:20:00Z',
          listings_count: 3,
          bookings_count: 25,
          total_earnings: 45000,
          location: 'Punjab, India'
        },
        {
          id: '2',
          full_name: 'Priya Sharma',
          email: 'priya.traveler@gmail.com',
          phone: '+91-8765432109',
          user_type: 'tourist',
          is_verified: true,
          is_active: true,
          created_at: '2024-02-20T09:15:00Z',
          last_login: '2024-12-09T16:45:00Z',
          trips_count: 8,
          total_spent: 32000,
          favorite_locations: ['Rajasthan', 'Kerala']
        },
        {
          id: '3',
          full_name: 'Admin User',
          email: 'admin@villagestay.com',
          phone: '+91-7654321098',
          user_type: 'admin',
          is_verified: true,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          last_login: '2024-12-11T08:00:00Z'
        }
      ];

      setUsers(mockUsers);
      setPagination(prev => ({
        ...prev,
        total_count: mockUsers.length,
        total_pages: 1
      }));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const editUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      user_type: user.user_type,
      is_verified: user.is_verified,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  const deleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      // In real implementation, call API
      // await adminAPI.updateUser(selectedUser.id, editFormData);
      
      // Mock update
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { ...user, ...editFormData }
          : user
      ));
      
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    try {
      // In real implementation, call API
      // await adminAPI.deleteUser(selectedUser.id);
      
      // Mock delete
      setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      // In real implementation, call API
      const action = currentStatus ? 'suspend' : 'activate';
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, is_active: !currentStatus }
          : user
      ));
      
      toast.success(`User ${action}d successfully`);
    } catch (error) {
      toast.error(`Failed to ${currentStatus ? 'suspend' : 'activate'} user`);
    }
  };

  const userTypeColors = {
    host: 'bg-green-100 text-green-800',
    tourist: 'bg-blue-100 text-blue-800',
    admin: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                User Management 👥
              </h1>
              <p className="text-gray-600 mt-2">
                Manage platform users and their accounts
              </p>
            </div>
            
            <div className="text-sm text-gray-600">
              {pagination.total_count} total users
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filters.user_type}
              onChange={(e) => handleFilterChange('user_type', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All User Types</option>
              <option value="host">Hosts</option>
              <option value="tourist">Tourists</option>
              <option value="admin">Admins</option>
            </select>

            <select
              value={filters.is_verified}
              onChange={(e) => handleFilterChange('is_verified', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Verification Status</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>

            <button
              onClick={() => {
                setFilters({ search: '', user_type: '', is_verified: '' });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : users.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {user.full_name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="text-xs text-gray-400">
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${userTypeColors[user.user_type]}`}>
                            {user.user_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {user.is_verified ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircleIcon className="w-5 h-5 text-red-500" />
                            )}
                            <span className={`text-sm ${user.is_verified ? 'text-green-600' : 'text-red-600'}`}>
                              {user.is_verified ? 'Verified' : 'Unverified'}
                            </span>
                            {!user.is_active && (
                              <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                Suspended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {user.user_type === 'host' ? `${user.listings_count || 0} listings` : 
                               user.user_type === 'tourist' ? `${user.trips_count || 0} trips` : 
                               'Admin user'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.user_type === 'host' ? `${user.bookings_count || 0} bookings` :
                               user.user_type === 'tourist' ? `₹${user.total_spent || 0} spent` :
                               'System access'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>{formatDate(user.created_at)}</div>
                            {user.last_login && (
                              <div className="text-xs">
                                Last: {formatDate(user.last_login)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => viewUserDetails(user)}
                              className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => editUser(user)}
                              className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleUserStatus(user.id, user.is_active)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.is_active 
                                  ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                                  : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                              }`}
                              title={user.is_active ? 'Suspend User' : 'Activate User'}
                            >
                              {user.is_active ? (
                                <XCircleIcon className="w-4 h-4" />
                              ) : (
                                <CheckCircleIcon className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteUser(user)}
                              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total_count)} of{' '}
                      {pagination.total_count} users
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      <div className="flex space-x-1">
                        {[...Array(Math.min(pagination.total_pages, 5))].map((_, i) => {
                          const pageNum = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i;
                          if (pageNum > pagination.total_pages) return null;
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                              className={`px-3 py-2 rounded-lg font-medium ${
                                pageNum === pagination.page
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.total_pages}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Try adjusting your search criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                User Details - {selectedUser.full_name}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Basic Information</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium">{selectedUser.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{selectedUser.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">User Type</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${userTypeColors[selectedUser.user_type]}`}>
                        {selectedUser.user_type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Account Status</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Verification Status</p>
                      <div className="flex items-center space-x-2">
                        {selectedUser.is_verified ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${selectedUser.is_verified ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedUser.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Account Status</p>
                      <div className="flex items-center space-x-2">
                        {selectedUser.is_active ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${selectedUser.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedUser.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity & Stats */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Activity & Statistics</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Member Since</p>
                      <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Login</p>
                      <p className="font-medium">{selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}</p>
                    </div>
                    {selectedUser.user_type === 'host' && (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Total Listings</p>
                          <p className="font-medium">{selectedUser.listings_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Earnings</p>
                          <p className="font-medium">₹{selectedUser.total_earnings?.toLocaleString() || 0}</p>
                        </div>
                      </>
                    )}
                    {selectedUser.user_type === 'tourist' && (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Total Trips</p>
                          <p className="font-medium">{selectedUser.trips_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Spent</p>
                          <p className="font-medium">₹{selectedUser.total_spent?.toLocaleString() || 0}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  editUser(selectedUser);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit User
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit User - {selectedUser.full_name}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(); }}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.full_name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User Type
                    </label>
                    <select
                      value={editFormData.user_type}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, user_type: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="tourist">Tourist</option>
                      <option value="host">Host</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_verified"
                      checked={editFormData.is_verified}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, is_verified: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_verified" className="ml-2 text-sm font-medium text-gray-700">
                      Email Verified
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={editFormData.is_active}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                      Account Active
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update User
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              Delete User Account
            </h3>
            
            <p className="text-gray-600 mb-6 text-center">
              Are you sure you want to delete <strong>{selectedUser.full_name}</strong>'s account? 
              This action cannot be undone and will permanently remove all associated data.
            </p>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;