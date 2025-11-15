'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

interface Prompt {
  id: string;
  name: string;
  prompt: string;
  llmType?: string;
  isActive: boolean;
  createdAt: string;
}

interface PromptTemplate {
  name: string;
  template: string;
}

interface Props {
  title: string;
  description: string;
  apiEndpoint: string;
  showLlmType?: boolean;
  presetTemplates?: PromptTemplate[];
}

export default function PromptManager({
  title,
  description,
  apiEndpoint,
  showLlmType = false,
  presetTemplates = [],
}: Props) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    prompt: '',
    llmType: 'openai',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch(apiEndpoint);
      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingId ? `${apiEndpoint}/${editingId}` : apiEndpoint;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingId ? 'Prompt updated successfully' : 'Prompt created successfully');
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '', prompt: '', llmType: 'openai' });
        fetchPrompts();
      } else {
        toast.error('Failed to save prompt');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setFormData({
      name: prompt.name,
      prompt: prompt.prompt,
      llmType: prompt.llmType || 'openai',
    });
    setEditingId(prompt.id);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      const response = await fetch(`${apiEndpoint}/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Prompt deleted successfully');
        fetchPrompts();
      } else {
        toast.error('Failed to delete prompt');
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${apiEndpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchPrompts();
      }
    } catch (error) {
      console.error('Error updating prompt:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', prompt: '', llmType: 'openai' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Prompt
        </button>
      </div>

      {prompts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            No prompts found. Add your first prompt to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {prompt.name}
                    </h3>
                    {showLlmType && prompt.llmType && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {prompt.llmType}
                      </span>
                    )}
                    <button
                      onClick={() => toggleActive(prompt.id, prompt.isActive)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        prompt.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {prompt.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Created {new Date(prompt.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(prompt)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, id: prompt.id })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {prompt.prompt}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowModal(false);
            setEditingId(null);
          }}
        >
          <div
            className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingId ? 'Edit Prompt' : 'Add New Prompt'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
                  placeholder="My Awesome Prompt"
                />
              </div>

              {showLlmType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LLM Type
                  </label>
                  <select
                    value={formData.llmType}
                    onChange={(e) =>
                      setFormData({ ...formData, llmType: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="deepseek">Deepseek</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt
                </label>

                {/* Preset Templates */}
                {presetTemplates.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-2">Quick Templates:</p>
                    <div className="flex flex-wrap gap-2">
                      {presetTemplates.map((template, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, prompt: template.template })
                          }
                          className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all border border-purple-200"
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  value={formData.prompt}
                  onChange={(e) =>
                    setFormData({ ...formData, prompt: e.target.value })
                  }
                  required
                  rows={12}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-gray-900 placeholder:text-gray-400"
                  placeholder="Enter your prompt here..."
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
                  {editingId ? 'Update' : 'Create'}
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
        title="Delete Prompt"
        message="Are you sure you want to delete this prompt? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
}
