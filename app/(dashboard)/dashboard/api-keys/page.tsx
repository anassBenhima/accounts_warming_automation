'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Edit2, Check, X, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ConfirmModal from '@/components/ConfirmModal';

interface ApiKey {
  id: string;
  name: string;
  type: string;
  usageType: string;
  modelName: string | null;
  isActive: boolean;
  createdAt: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  assignments?: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ApiKeysPage() {
  const { data: session } = useSession();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'seedream',
    usageType: 'all',
    apiKey: '',
    modelName: '',
  });
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [visibleKeys, setVisibleKeys] = useState<{ [key: string]: string }>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });
  const [managingKey, setManagingKey] = useState<ApiKey | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    fetchApiKeys();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/users/list')
        .then((res) => res.json())
        .then(setAllUsers)
        .catch((error) => console.error('Error fetching users:', error));
    }
  }, [isAdmin]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      const data = await response.json();
      setApiKeys(data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingId ? `/api/api-keys/${editingId}` : '/api/api-keys';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '', type: 'seedream', usageType: 'all', apiKey: '', modelName: '' });
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  };

  const handleEdit = async (id: string) => {
    // Fetch the full API key data including the actual key value
    try {
      const response = await fetch(`/api/api-keys/${id}`);
      const data = await response.json();

      setFormData({
        name: data.name,
        type: data.type,
        usageType: data.usageType || 'all',
        apiKey: data.key || '',
        modelName: data.modelName || '',
      });
      setEditingId(id);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching API key for edit:', error);
    }
  };

  const toggleShowKey = async (id: string) => {
    if (visibleKeys[id]) {
      // Hide the key
      setVisibleKeys(prev => {
        const newKeys = { ...prev };
        delete newKeys[id];
        return newKeys;
      });
    } else {
      // Fetch and show the key
      try {
        const response = await fetch(`/api/api-keys/${id}`);
        const data = await response.json();
        setVisibleKeys(prev => ({ ...prev, [id]: data.key }));
      } catch (error) {
        console.error('Error fetching API key:', error);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      const response = await fetch(`/api/api-keys/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error updating API key:', error);
    }
  };

  const assignKeyToUser = async (keyId: string, userId: string) => {
    try {
      const response = await fetch(`/api/api-keys/${keyId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchApiKeys();
        // Update the managingKey state to reflect new assignment
        if (managingKey) {
          const updated = apiKeys.find((k) => k.id === keyId);
          if (updated) setManagingKey(updated);
        }
      }
    } catch (error) {
      console.error('Error assigning API key:', error);
    }
  };

  const removeAssignment = async (keyId: string, userId: string) => {
    try {
      const response = await fetch(`/api/api-keys/${keyId}/assignments?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchApiKeys();
        // Update the managingKey state to reflect removed assignment
        if (managingKey) {
          const updated = apiKeys.find((k) => k.id === keyId);
          if (updated) setManagingKey(updated);
        }
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'seedream':
        return 'bg-blue-100 text-blue-800';
      case 'openai':
        return 'bg-green-100 text-green-800';
      case 'deepseek':
        return 'bg-purple-100 text-purple-800';
      case 'fal':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsageTypeColor = (usageType: string) => {
    switch (usageType) {
      case 'imageGeneration':
        return 'bg-pink-100 text-pink-800';
      case 'keywordSearch':
        return 'bg-cyan-100 text-cyan-800';
      case 'imageDescription':
        return 'bg-yellow-100 text-yellow-800';
      case 'all':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsageTypeLabel = (usageType: string) => {
    switch (usageType) {
      case 'imageGeneration':
        return 'Image Gen';
      case 'keywordSearch':
        return 'Keyword Search';
      case 'imageDescription':
        return 'Image Desc';
      case 'all':
        return 'All Uses';
      default:
        return usageType;
    }
  };

  const getModelPlaceholder = (type: string) => {
    switch (type) {
      case 'seedream':
        return 'seedream-4-0-250828';
      case 'fal':
        return 'fal-ai/flux/dev';
      case 'openai':
        return 'gpt-4-vision-preview';
      case 'deepseek':
        return 'deepseek-chat';
      default:
        return '';
    }
  };

  const getModelSuggestions = (type: string): string[] => {
    switch (type) {
      case 'fal':
        return [
          'fal-ai/flux/dev', // FLUX.1 [dev] - 12B parameter model
          'fal-ai/flux/schnell', // FLUX.1 [schnell] - Fastest (1-4 steps)
          'fal-ai/flux-pro/v1.1', // FLUX Pro 1.1 - Professional grade
          'fal-ai/flux-pro/v1.1-ultra', // FLUX Pro Ultra - Up to 2K
          'fal-ai/imagen4/preview', // Google Imagen 4 - Highest quality
          'fal-ai/recraft/v3/text-to-image', // Recraft V3 - Vector art, typography
          'fal-ai/hidream-i1-full', // HiDream-I1 - 17B parameters
          'fal-ai/qwen-image', // Qwen-Image - Complex text rendering
        ];
      case 'seedream':
        return ['seedream-4-0-250828'];
      case 'openai':
        return ['gpt-4-vision-preview', 'gpt-4-turbo', 'gpt-4.1-2025-04-14'];
      case 'deepseek':
        return ['deepseek-chat', 'deepseek-coder'];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Manage your API keys for image generation and keyword search
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', type: 'seedream', usageType: 'all', apiKey: '', modelName: '' });
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg text-sm md:text-base w-full md:w-auto"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Add API Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 text-center">
          <p className="text-sm md:text-base text-gray-500">No API keys found. Add your first API key to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                      {key.name}
                    </h3>
                    <span
                      className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(
                        key.type
                      )}`}
                    >
                      {key.type}
                    </span>
                    <span
                      className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${getUsageTypeColor(
                        key.usageType
                      )}`}
                    >
                      {getUsageTypeLabel(key.usageType)}
                    </span>
                    <button
                      onClick={() => toggleActive(key.id, key.isActive)}
                      className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${
                        key.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {key.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  {key.modelName && (
                    <p className="text-xs md:text-sm text-gray-600 mb-2">
                      Model: {key.modelName}
                    </p>
                  )}
                  {isAdmin && key.user && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Owner:</span> {key.user.name} ({key.user.email})
                      </p>
                      {key.assignments && key.assignments.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          Assigned to {key.assignments.length} user(s)
                        </p>
                      )}
                    </div>
                  )}
                  {!isAdmin && key.userId !== session?.user?.id && (
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Assigned to you by {key.user?.name}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2 overflow-x-auto">
                    <p className="text-xs text-gray-500 font-mono break-all">
                      {visibleKeys[key.id] ? visibleKeys[key.id] : '••••••••••••••••'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex md:flex-col lg:flex-row items-center gap-2 justify-end">
                  <button
                    onClick={() => toggleShowKey(key.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title={visibleKeys[key.id] ? 'Hide API Key' : 'Show API Key'}
                  >
                    {visibleKeys[key.id] ? (
                      <EyeOff className="w-4 h-4 md:w-5 md:h-5" />
                    ) : (
                      <Eye className="w-4 h-4 md:w-5 md:h-5" />
                    )}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setManagingKey(key)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                      title="Manage Access"
                    >
                      <Users className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(key.id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                    title="Edit API Key"
                  >
                    <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, id: key.id })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete API Key"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-md w-full">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
              {editingId ? 'Edit API Key' : 'Add New API Key'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alias Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
                  placeholder="My Seedream Key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value, modelName: '' })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                >
                  <option value="seedream">Seedream (Image Generation)</option>
                  <option value="fal">fal.ai (Image Generation - FLUX, Imagen, etc.)</option>
                  <option value="openai">OpenAI (Keyword Search)</option>
                  <option value="deepseek">Deepseek (Keyword Search)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usage Type
                </label>
                <select
                  value={formData.usageType}
                  onChange={(e) =>
                    setFormData({ ...formData, usageType: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                >
                  <option value="all">All Uses (Can be used anywhere)</option>
                  <option value="imageGeneration">Image Generation Only</option>
                  <option value="keywordSearch">Keyword Search Only</option>
                  <option value="imageDescription">Image Description Only</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Restricts where this API key can be used in the application
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData({ ...formData, apiKey: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
                  placeholder="sk-..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model Name {formData.type === 'fal' ? '(Required)' : '(Optional)'}
                </label>
                {getModelSuggestions(formData.type).length > 0 ? (
                  <select
                    value={formData.modelName}
                    onChange={(e) =>
                      setFormData({ ...formData, modelName: e.target.value })
                    }
                    required={formData.type === 'fal'}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  >
                    <option value="">Select a model...</option>
                    {getModelSuggestions(formData.type).map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.modelName}
                    onChange={(e) =>
                      setFormData({ ...formData, modelName: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
                    placeholder={getModelPlaceholder(formData.type)}
                  />
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-gray-900 text-sm md:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-sm md:text-base"
                >
                  {editingId ? 'Update Key' : 'Add Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Management Modal */}
      {managingKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Manage Access: {managingKey.name}
            </h3>

            {/* Current Assignments */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Assigned To:</h4>
              {managingKey.assignments && managingKey.assignments.length > 0 ? (
                <div className="space-y-2">
                  {managingKey.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {assignment.user.name}
                        </p>
                        <p className="text-xs text-gray-500">{assignment.user.email}</p>
                      </div>
                      <button
                        onClick={() =>
                          removeAssignment(managingKey.id, assignment.user.id)
                        }
                        className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No users assigned yet
                </p>
              )}
            </div>

            {/* Add User */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to User:
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    assignKeyToUser(managingKey.id, e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
              >
                <option value="">Select User...</option>
                {allUsers
                  .filter(
                    (u) =>
                      u.id !== managingKey.userId &&
                      !managingKey.assignments?.some((a) => a.user.id === u.id)
                  )
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={() => setManagingKey(null)}
              className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete API Key"
        message="Are you sure you want to delete this API key? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
}
