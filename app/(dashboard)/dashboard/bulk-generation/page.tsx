'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, Save, FolderOpen } from 'lucide-react';

// Model presets for different API types
const MODEL_PRESETS = {
  seedream: [
    'seedream-4-0-250828',
    'seedream-3-5-250815',
    'seedream-3-0-250801',
  ],
  fal: [
    'fal-ai/flux-pro/v1.1',
    'fal-ai/flux/dev',
    'fal-ai/flux/schnell',
    'fal-ai/flux-pro/v1.1-ultra',
    'fal-ai/imagen4/preview',
    'fal-ai/recraft/v3/text-to-image',
    'fal-ai/hidream-i1-full',
    'fal-ai/qwen-image',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4-vision-preview',
    'gpt-3.5-turbo',
  ],
  deepseek: [
    'deepseek-chat',
    'deepseek-coder',
  ],
};

interface ApiKey {
  id: string;
  name: string;
  type: string;
  usageType: string;
  modelName?: string | null;
}

interface Row {
  id: string;
  keywords: string;
  imageUrl: string;
  quantity: number;
  title: string;
  description: string;
  altText: string;
  publishDate: string;
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export default function BulkGenerationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [imageGenApiKeyId, setImageGenApiKeyId] = useState('');
  const [keywordSearchApiKeyId, setKeywordSearchApiKeyId] = useState('');
  const [imageDescApiKeyId, setImageDescApiKeyId] = useState('');
  const [imageGenModel, setImageGenModel] = useState('');
  const [keywordSearchModel, setKeywordSearchModel] = useState('');
  const [imageDescModel, setImageDescModel] = useState('');
  const [imageWidth, setImageWidth] = useState(1000);
  const [imageHeight, setImageHeight] = useState(1500);
  const [rows, setRows] = useState<Row[]>([
    { id: '1', keywords: '', imageUrl: '', quantity: 1, title: '', description: '', altText: '', publishDate: getTodayDate() },
  ]);
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [configName, setConfigName] = useState('');

  useEffect(() => {
    fetchApiKeys();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('bulkGenerationConfigs');
    if (saved) {
      setSavedConfigs(JSON.parse(saved));
    }
  }, []);

  // Auto-set default model when image generation API key changes
  useEffect(() => {
    if (imageGenApiKeyId) {
      const selectedKey = apiKeys.find((k) => k.id === imageGenApiKeyId);
      if (selectedKey) {
        // Use API key's default model or the first preset for its type
        const defaultModel = selectedKey.modelName || MODEL_PRESETS[selectedKey.type as keyof typeof MODEL_PRESETS]?.[0] || '';
        setImageGenModel(defaultModel);
      }
    }
  }, [imageGenApiKeyId, apiKeys]);

  // Auto-set default model when keyword search API key changes
  useEffect(() => {
    if (keywordSearchApiKeyId) {
      const selectedKey = apiKeys.find((k) => k.id === keywordSearchApiKeyId);
      if (selectedKey) {
        const defaultModel = selectedKey.modelName || MODEL_PRESETS[selectedKey.type as keyof typeof MODEL_PRESETS]?.[0] || '';
        setKeywordSearchModel(defaultModel);
      }
    }
  }, [keywordSearchApiKeyId, apiKeys]);

  // Auto-set default model when image description API key changes
  useEffect(() => {
    if (imageDescApiKeyId) {
      const selectedKey = apiKeys.find((k) => k.id === imageDescApiKeyId);
      if (selectedKey) {
        const defaultModel = selectedKey.modelName || MODEL_PRESETS[selectedKey.type as keyof typeof MODEL_PRESETS]?.[0] || '';
        setImageDescModel(defaultModel);
      }
    }
  }, [imageDescApiKeyId, apiKeys]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);

        // Auto-select first key of each type
        const falKey = data.find((k: ApiKey) => k.type === 'fal');
        const seedreamKey = data.find((k: ApiKey) => k.type === 'seedream');
        const openaiKey = data.find((k: ApiKey) => k.type === 'openai');
        const deepseekKey = data.find((k: ApiKey) => k.type === 'deepseek');

        // Prefer fal over seedream, but use seedream if fal is not available
        if (falKey) {
          setImageGenApiKeyId(falKey.id);
        } else if (seedreamKey) {
          setImageGenApiKeyId(seedreamKey.id);
        }

        if (openaiKey) {
          setKeywordSearchApiKeyId(openaiKey.id);
          setImageDescApiKeyId(openaiKey.id);
        } else if (deepseekKey) {
          setKeywordSearchApiKeyId(deepseekKey.id);
          setImageDescApiKeyId(deepseekKey.id);
        }
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const addRow = () => {
    setRows([
      ...rows,
      { id: Date.now().toString(), keywords: '', imageUrl: '', quantity: 1, title: '', description: '', altText: '', publishDate: getTodayDate() },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof Row, value: string | number) => {
    setRows(
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const saveConfig = () => {
    if (!configName.trim()) {
      toast.error('Please enter a config name');
      return;
    }

    const config = {
      id: Date.now().toString(),
      name: configName,
      timestamp: new Date().toISOString(),
      imageGenApiKeyId,
      keywordSearchApiKeyId,
      imageDescApiKeyId,
      imageGenModel,
      keywordSearchModel,
      imageDescModel,
      imageWidth,
      imageHeight,
    };

    const updated = [...savedConfigs, config];
    localStorage.setItem('bulkGenerationConfigs', JSON.stringify(updated));
    setSavedConfigs(updated);
    setConfigName('');
    setShowSaveModal(false);
    toast.success(`Config "${configName}" saved!`);
  };

  const loadConfig = (config: any) => {
    setImageGenApiKeyId(config.imageGenApiKeyId || '');
    setKeywordSearchApiKeyId(config.keywordSearchApiKeyId || '');
    setImageDescApiKeyId(config.imageDescApiKeyId || '');
    setImageGenModel(config.imageGenModel || '');
    setKeywordSearchModel(config.keywordSearchModel || '');
    setImageDescModel(config.imageDescModel || '');
    setImageWidth(config.imageWidth || 1000);
    setImageHeight(config.imageHeight || 1500);
    setShowLoadModal(false);
    toast.success(`Config "${config.name}" loaded!`);
  };

  const deleteConfig = (configId: string) => {
    const updated = savedConfigs.filter(c => c.id !== configId);
    localStorage.setItem('bulkGenerationConfigs', JSON.stringify(updated));
    setSavedConfigs(updated);
    toast.success('Config deleted');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a name for this bulk generation');
      return;
    }

    if (!imageGenApiKeyId || !keywordSearchApiKeyId || !imageDescApiKeyId) {
      toast.error('Please select all required API keys');
      return;
    }

    const validRows = rows.filter(
      (row) => row.keywords.trim() && row.imageUrl.trim() && row.quantity > 0
    );

    if (validRows.length === 0) {
      toast.error('Please add at least one valid row');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/bulk-generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          imageGenApiKeyId,
          keywordSearchApiKeyId,
          imageDescApiKeyId,
          imageGenModel: imageGenModel.trim() || null,
          keywordSearchModel: keywordSearchModel.trim() || null,
          imageDescModel: imageDescModel.trim() || null,
          imageWidth,
          imageHeight,
          rows: validRows.map((row) => ({
            keywords: row.keywords,
            imageUrl: row.imageUrl,
            quantity: parseInt(row.quantity.toString(), 10),
            title: row.title.trim() || null,
            description: row.description.trim() || null,
            altText: row.altText.trim() || null,
          })),
        }),
      });

      if (response.ok) {
        toast.success('Bulk generation started! Processing in background...');
        router.push('/dashboard/bulk-history');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create bulk generation');
      }
    } catch (error) {
      console.error('Error creating bulk generation:', error);
      toast.error('Failed to create bulk generation');
    } finally {
      setLoading(false);
    }
  };

  // Filter API keys by type AND usageType
  const imageGenKeys = apiKeys.filter((k) => (k.type === 'fal' || k.type === 'seedream') && (k.usageType === 'imageGeneration' || k.usageType === 'all'));
  const keywordSearchKeys = apiKeys.filter((k) => (k.type === 'openai' || k.type === 'deepseek') && (k.usageType === 'keywordSearch' || k.usageType === 'all'));
  const imageDescKeys = apiKeys.filter((k) => (k.type === 'openai' || k.type === 'deepseek') && (k.usageType === 'imageDescription' || k.usageType === 'all'));

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bulk Generation</h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">
          Generate multiple Pinterest pins from a list of keywords and images
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Batch Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm md:text-base"
            placeholder="e.g., Holiday Recipes Batch"
            required
          />
        </div>

        {/* Save/Load Config Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
          >
            <Save className="w-4 h-4" />
            Save Config
          </button>
          <button
            type="button"
            onClick={() => setShowLoadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <FolderOpen className="w-4 h-4" />
            Load Config ({savedConfigs.length})
          </button>
        </div>

        {/* API Keys */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Image Generation API <span className="text-red-500">*</span>
            </label>
            <select
              value={imageGenApiKeyId}
              onChange={(e) => setImageGenApiKeyId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm md:text-base"
              required
            >
              <option value="">Select API Key</option>
              {imageGenKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Keyword Search API <span className="text-red-500">*</span>
            </label>
            <select
              value={keywordSearchApiKeyId}
              onChange={(e) => setKeywordSearchApiKeyId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm md:text-base"
              required
            >
              <option value="">Select API Key</option>
              {keywordSearchKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Image Description API <span className="text-red-500">*</span>
            </label>
            <select
              value={imageDescApiKeyId}
              onChange={(e) => setImageDescApiKeyId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm md:text-base"
              required
            >
              <option value="">Select API Key</option>
              {imageDescKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Model Names */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Image Generation Model
              <span className="text-gray-500 text-xs ml-1">(Optional)</span>
            </label>
            <input
              type="text"
              value={imageGenModel}
              onChange={(e) => setImageGenModel(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm md:text-base"
              placeholder="e.g., fal-ai/flux-pro/v1.1"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {imageGenApiKeyId && (() => {
                const selectedKey = apiKeys.find((k) => k.id === imageGenApiKeyId);
                const keyType = selectedKey?.type as keyof typeof MODEL_PRESETS;
                const models = keyType ? MODEL_PRESETS[keyType] || [] : [];
                return models.slice(0, 5).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setImageGenModel(model)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {model.replace('fal-ai/', '').replace('seedream-', 'SD-')}
                  </button>
                ));
              })()}
              {!imageGenApiKeyId && (
                <p className="text-xs text-gray-500">Select an API key to see model suggestions</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Leave empty to use API key default</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Keyword Search Model
              <span className="text-gray-500 text-xs ml-1">(Optional)</span>
            </label>
            <input
              type="text"
              value={keywordSearchModel}
              onChange={(e) => setKeywordSearchModel(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm md:text-base"
              placeholder="e.g., gpt-4o"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {keywordSearchApiKeyId && (() => {
                const selectedKey = apiKeys.find((k) => k.id === keywordSearchApiKeyId);
                const keyType = selectedKey?.type as keyof typeof MODEL_PRESETS;
                const models = keyType ? MODEL_PRESETS[keyType] || [] : [];
                return models.slice(0, 5).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setKeywordSearchModel(model)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {model}
                  </button>
                ));
              })()}
              {!keywordSearchApiKeyId && (
                <p className="text-xs text-gray-500">Select an API key to see model suggestions</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Leave empty to use API key default</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Image Description Model
              <span className="text-gray-500 text-xs ml-1">(Optional)</span>
            </label>
            <input
              type="text"
              value={imageDescModel}
              onChange={(e) => setImageDescModel(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm md:text-base"
              placeholder="e.g., gpt-4o"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {imageDescApiKeyId && (() => {
                const selectedKey = apiKeys.find((k) => k.id === imageDescApiKeyId);
                const keyType = selectedKey?.type as keyof typeof MODEL_PRESETS;
                const models = keyType ? MODEL_PRESETS[keyType] || [] : [];
                return models.slice(0, 5).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setImageDescModel(model)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {model}
                  </button>
                ));
              })()}
              {!imageDescApiKeyId && (
                <p className="text-xs text-gray-500">Select an API key to see model suggestions</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Leave empty to use API key default</p>
          </div>
        </div>

        {/* Image Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Image Width (px)</label>
            <input
              type="number"
              value={imageWidth}
              onChange={(e) => setImageWidth(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm md:text-base"
              min="100"
              max="5000"
            />
            <p className="text-xs text-gray-500 mt-1">≈ {(imageWidth / 100).toFixed(2)} inches @ 100 DPI</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Image Height (px)</label>
            <input
              type="number"
              value={imageHeight}
              onChange={(e) => setImageHeight(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm md:text-base"
              min="100"
              max="5000"
            />
            <p className="text-xs text-gray-500 mt-1">≈ {(imageHeight / 100).toFixed(2)} inches @ 100 DPI</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">Size ratio: {(imageWidth / 100).toFixed(1)} x {(imageHeight / 100).toFixed(1)} inches</p>

        {/* Size Suggestions */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Quick Size Presets</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setImageWidth(1000);
                setImageHeight(1500);
              }}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              9 x 16 in (1000x1500px)
            </button>
            <button
              type="button"
              onClick={() => {
                setImageWidth(1080);
                setImageHeight(1080);
              }}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              1080 x 1080 px
            </button>
            <button
              type="button"
              onClick={() => {
                setImageWidth(300);
                setImageHeight(420);
              }}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              300 x 420 px
            </button>
            <button
              type="button"
              onClick={() => {
                setImageWidth(1050);
                setImageHeight(600);
              }}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              1050 x 600 px
            </button>
            <button
              type="button"
              onClick={() => {
                setImageWidth(300);
                setImageHeight(450);
              }}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              300 x 450 px
            </button>
            <button
              type="button"
              onClick={() => {
                setImageWidth(3757);
                setImageHeight(2775);
              }}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              3757 x 2775 px
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
            <label className="block text-sm font-medium text-gray-900">
              Data Rows <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base w-full md:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-gray-900">Keywords</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-gray-900">Image URL</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-gray-900">Quantity</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-gray-900">Title</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-gray-900">Description</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-gray-900">Alt Text</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-gray-900">Publish Date</th>
                  <th className="px-2 md:px-4 py-3 text-center text-xs md:text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 md:px-4 py-3">
                      <textarea
                        value={row.keywords}
                        onChange={(e) =>
                          updateRow(row.id, 'keywords', e.target.value)
                        }
                        rows={3}
                        className="w-full px-2 md:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 text-gray-900 text-xs md:text-sm"
                        placeholder="recipe, cooking, food"
                      />
                    </td>
                    <td className="px-2 md:px-4 py-3">
                      <textarea
                        value={row.imageUrl}
                        onChange={(e) =>
                          updateRow(row.id, 'imageUrl', e.target.value)
                        }
                        rows={3}
                        className="w-full px-2 md:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 text-gray-900 text-xs md:text-sm"
                        placeholder="https://example.com/image.jpg"
                      />
                    </td>
                    <td className="px-2 md:px-4 py-3">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(row.id, 'quantity', parseInt(e.target.value, 10))
                        }
                        className="w-full px-2 md:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 text-gray-900 text-xs md:text-sm"
                        min="1"
                        max="100"
                      />
                    </td>
                    <td className="px-2 md:px-4 py-3">
                      <textarea
                        value={row.title}
                        onChange={(e) =>
                          updateRow(row.id, 'title', e.target.value)
                        }
                        rows={3}
                        className="w-full px-2 md:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 text-gray-900 text-xs md:text-sm"
                        placeholder="Pin title"
                      />
                    </td>
                    <td className="px-2 md:px-4 py-3">
                      <textarea
                        value={row.description}
                        onChange={(e) =>
                          updateRow(row.id, 'description', e.target.value)
                        }
                        rows={3}
                        className="w-full px-2 md:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 text-gray-900 text-xs md:text-sm"
                        placeholder="Pin description"
                      />
                    </td>
                    <td className="px-2 md:px-4 py-3">
                      <textarea
                        value={row.altText}
                        onChange={(e) =>
                          updateRow(row.id, 'altText', e.target.value)
                        }
                        rows={3}
                        className="w-full px-2 md:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 text-gray-900 text-xs md:text-sm"
                        placeholder="Alt text"
                      />
                    </td>
                    <td className="px-2 md:px-4 py-3">
                      <input
                        type="date"
                        value={row.publishDate}
                        onChange={(e) =>
                          updateRow(row.id, 'publishDate', e.target.value)
                        }
                        className="w-full px-2 md:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 text-gray-900 text-xs md:text-sm"
                      />
                    </td>
                    <td className="px-2 md:px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base w-full md:w-auto"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating...' : 'Start Bulk Generation'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/dashboard/bulk-history')}
            className="px-6 py-3 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 text-sm md:text-base w-full md:w-auto"
          >
            View History
          </button>
        </div>
      </form>

      {/* Save Config Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Save Configuration</h3>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Enter config name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-gray-900"
              onKeyPress={(e) => e.key === 'Enter' && saveConfig()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Config Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Load Configuration</h3>
            {savedConfigs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No saved configurations</p>
            ) : (
              <div className="space-y-3">
                {savedConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{config.name}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(config.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {config.imageWidth}x{config.imageHeight}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadConfig(config)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteConfig(config.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowLoadModal(false)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
