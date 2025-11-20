'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  name: string;
  type: string;
  modelName?: string;
  isActive: boolean;
}

interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (config: {
    imageGenApiKeyId: string;
    imageGenModel: string;
    keywordSearchApiKeyId: string;
    keywordSearchModel: string;
    imageDescApiKeyId: string;
    imageDescModel: string;
    quantity: number;
  }) => Promise<void>;
  currentConfig: {
    imageGenApiKeyId?: string;
    imageGenModel?: string;
    keywordSearchApiKeyId?: string;
    keywordSearchModel?: string;
    imageDescApiKeyId?: string;
    imageDescModel?: string;
  };
}

export default function RegenerateModal({ isOpen, onClose, onRegenerate, currentConfig }: RegenerateModalProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Form state
  const [imageGenApiKeyId, setImageGenApiKeyId] = useState(currentConfig.imageGenApiKeyId || '');
  const [imageGenModel, setImageGenModel] = useState(currentConfig.imageGenModel || '');
  const [keywordSearchApiKeyId, setKeywordSearchApiKeyId] = useState(currentConfig.keywordSearchApiKeyId || '');
  const [keywordSearchModel, setKeywordSearchModel] = useState(currentConfig.keywordSearchModel || '');
  const [imageDescApiKeyId, setImageDescApiKeyId] = useState(currentConfig.imageDescApiKeyId || '');
  const [imageDescModel, setImageDescModel] = useState(currentConfig.imageDescModel || '');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      fetchApiKeys();
    }
  }, [isOpen]);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/api-keys');
      const data = await response.json();
      setApiKeys(data.filter((key: ApiKey) => key.isActive));
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageGenApiKeyId || !keywordSearchApiKeyId || !imageDescApiKeyId || !imageGenModel || !keywordSearchModel || !imageDescModel) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (quantity < 1 || quantity > 50) {
      toast.error('Quantity must be between 1 and 50');
      return;
    }

    setRegenerating(true);
    try {
      await onRegenerate({
        imageGenApiKeyId,
        imageGenModel,
        keywordSearchApiKeyId,
        keywordSearchModel,
        imageDescApiKeyId,
        imageDescModel,
        quantity,
      });
      onClose();
    } catch (error) {
      console.error('Regeneration error:', error);
    } finally {
      setRegenerating(false);
    }
  };

  if (!isOpen) return null;

  const imageGenKeys = apiKeys.filter(k => k.type === 'fal-ai' || k.type === 'seedream');
  const llmKeys = apiKeys.filter(k => k.type === 'openai' || k.type === 'deepseek');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Configure Regeneration</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading API keys...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Number of Pins to Generate *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Between 1 and 50 pins</p>
              </div>

              {/* Image Generation */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Image Generation</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">API Key *</label>
                    <select
                      value={imageGenApiKeyId}
                      onChange={(e) => {
                        setImageGenApiKeyId(e.target.value);
                        const key = apiKeys.find(k => k.id === e.target.value);
                        if (key?.modelName) setImageGenModel(key.modelName);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Select API Key</option>
                      {imageGenKeys.map(key => (
                        <option key={key.id} value={key.id}>{key.name} ({key.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Model *</label>
                    <input
                      type="text"
                      value={imageGenModel}
                      onChange={(e) => setImageGenModel(e.target.value)}
                      placeholder="e.g., fal-ai/flux-pro/v1.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Keyword Search / Content Generation */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Generation</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">API Key *</label>
                    <select
                      value={keywordSearchApiKeyId}
                      onChange={(e) => {
                        setKeywordSearchApiKeyId(e.target.value);
                        const key = apiKeys.find(k => k.id === e.target.value);
                        if (key?.modelName) setKeywordSearchModel(key.modelName);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Select API Key</option>
                      {llmKeys.map(key => (
                        <option key={key.id} value={key.id}>{key.name} ({key.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Model *</label>
                    <input
                      type="text"
                      value={keywordSearchModel}
                      onChange={(e) => setKeywordSearchModel(e.target.value)}
                      placeholder="e.g., gpt-4o or deepseek-chat"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Image Description */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Image Description</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">API Key *</label>
                    <select
                      value={imageDescApiKeyId}
                      onChange={(e) => {
                        setImageDescApiKeyId(e.target.value);
                        const key = apiKeys.find(k => k.id === e.target.value);
                        if (key?.modelName) setImageDescModel(key.modelName);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Select API Key</option>
                      {llmKeys.map(key => (
                        <option key={key.id} value={key.id}>{key.name} ({key.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Model *</label>
                    <input
                      type="text"
                      value={imageDescModel}
                      onChange={(e) => setImageDescModel(e.target.value)}
                      placeholder="e.g., gpt-4o"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  disabled={regenerating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regenerating}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
