'use client';

import { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ShareGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  generationId: string;
  generationType: 'single' | 'bulk' | 'image-to-prompt' | 'image-generation-prompt' | 'keyword-search-prompt';
  generationName: string;
}

export default function ShareGenerationModal({
  isOpen,
  onClose,
  generationId,
  generationType,
  generationName,
}: ShareGenerationModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setFetchingUsers(true);

      // For prompt types, use the dedicated endpoint that returns available/assigned users
      const isPromptType = ['image-to-prompt', 'image-generation-prompt', 'keyword-search-prompt'].includes(generationType);

      let endpoint = '/api/users/list';
      if (isPromptType) {
        endpoint = `/api/${generationType}/${generationId}/users`;
      }

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();

        if (isPromptType) {
          // The prompt endpoints return { availableUsers, assignedUsers }
          setUsers(data.availableUsers || []);
          setAssignedUsers(data.assignedUsers || []);
        } else {
          // Other types just return users list
          setUsers(data);
          setAssignedUsers([]);
        }
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setFetchingUsers(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShare = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';

      switch (generationType) {
        case 'single':
          endpoint = `/api/generations/${generationId}/duplicate`;
          break;
        case 'bulk':
          endpoint = `/api/bulk-generations/${generationId}/duplicate`;
          break;
        case 'image-to-prompt':
          endpoint = `/api/image-to-prompt/${generationId}/duplicate`;
          break;
        case 'image-generation-prompt':
          endpoint = `/api/image-generation-prompt/${generationId}/duplicate`;
          break;
        case 'keyword-search-prompt':
          endpoint = `/api/keyword-search-prompt/${generationId}/duplicate`;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserIds: selectedUserIds }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Successfully shared ${generationName} with ${selectedUserIds.length} user(s)`);
        onClose();
        setSelectedUserIds([]);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to share generation');
      }
    } catch (error) {
      console.error('Error sharing generation:', error);
      toast.error('Failed to share generation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Share Generation
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Share <span className="font-semibold">{generationName}</span> with other users in your team
        </p>

        {/* Assigned Users Section */}
        {assignedUsers.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              Already Assigned ({assignedUsers.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
              {assignedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200"
                >
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{user.name}</p>
                      {user.role === 'ADMIN' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Users Section */}
        {assignedUsers.length > 0 && (
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Available Users
          </h4>
        )}

        {fetchingUsers ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            {assignedUsers.length > 0
              ? 'All users already have access to this prompt'
              : 'No users available'}
          </p>
        ) : (
          <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
            {users.map((user) => (
              <label
                key={user.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedUserIds.includes(user.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{user.name}</p>
                      {user.role === 'ADMIN' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                {selectedUserIds.includes(user.id) && (
                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
              </label>
            ))}
          </div>
        )}

        {selectedUserIds.length > 0 && (
          <p className="text-sm text-blue-600 mb-4">
            {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={loading || selectedUserIds.length === 0}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sharing...' : 'Share with Selected'}
          </button>
        </div>
      </div>
    </div>
  );
}
