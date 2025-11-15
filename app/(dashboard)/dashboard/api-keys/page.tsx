'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Edit2, Check, X } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

interface ApiKey {
  id: string;
  name: string;
  type: string;
  modelName: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'seedream',
    apiKey: '',
    modelName: '',
  });
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [visibleKeys, setVisibleKeys] = useState<{ [key: string]: string }>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

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
        setFormData({ name: '', type: 'seedream', apiKey: '', modelName: '' });
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'seedream':
        return 'bg-blue-100 text-blue-800';
      case 'openai':
        return 'bg-green-100 text-green-800';
      case 'deepseek':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-1">
            Manage your API keys for image generation and keyword search
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', type: 'seedream', apiKey: '', modelName: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add API Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No API keys found. Add your first API key to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {key.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(
                        key.type
                      )}`}
                    >
                      {key.type}
                    </span>
                    <button
                      onClick={() => toggleActive(key.id, key.isActive)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        key.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {key.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  {key.modelName && (
                    <p className="text-sm text-gray-600 mb-2">
                      Model: {key.modelName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-gray-500 font-mono">
                      {visibleKeys[key.id] ? visibleKeys[key.id] : '••••••••••••••••'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleShowKey(key.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title={visibleKeys[key.id] ? 'Hide API Key' : 'Show API Key'}
                  >
                    {visibleKeys[key.id] ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(key.id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                    title="Edit API Key"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, id: key.id })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete API Key"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
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
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                >
                  <option value="seedream">Seedream (Image Generation)</option>
                  <option value="openai">OpenAI (Keyword Search)</option>
                  <option value="deepseek">Deepseek (Keyword Search)</option>
                </select>
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
                  Model Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.modelName}
                  onChange={(e) =>
                    setFormData({ ...formData, modelName: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
                  placeholder="seedream-4-0-250828"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  {editingId ? 'Update Key' : 'Add Key'}
                </button>
              </div>
            </form>
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
