'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Play, Zap } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

// Model presets for different API types
const MODEL_PRESETS = {
  seedream: [
    'seedream-4-0-250828',
    'seedream-3-5-250815',
    'seedream-3-0-250801',
  ],
  fal: [
    'fal-ai/flux/dev',
    'fal-ai/flux/schnell',
    'fal-ai/flux-pro/v1.1',
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

const DIMENSION_PRESETS = [
  { name: '9 x 16 in', width: 1000, height: 1500 },
  { name: 'Square', width: 1080, height: 1080 },
  { name: 'Compact', width: 300, height: 420 },
  { name: 'Landscape', width: 1050, height: 600 },
  { name: 'Mini Portrait', width: 300, height: 450 },
  { name: 'High Res', width: 3757, height: 2775 },
];

export default function QuickGenerationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [imageToPrompts, setImageToPrompts] = useState<any[]>([]);
  const [imageGenPrompts, setImageGenPrompts] = useState<any[]>([]);
  const [keywordPrompts, setKeywordPrompts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [noTemplate, setNoTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    imageGenApiKeyId: '',
    imageGenModel: '',
    keywordSearchApiKeyId: '',
    imageDescApiKeyId: '',
    imageDescModel: '',
    quantity: 10,
    imageWidth: 1000,
    imageHeight: 1500,
    uploadedImagePath: '',
    additionalKeywords: '',
    imageToPromptId: '',
    imageGenerationPromptId: '',
    keywordSearchPromptId: '',
    includeTextInImage: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [apiKeysRes, imgToPromptRes, imgGenPromptRes, keywordPromptRes, templatesRes] =
        await Promise.all([
          fetch('/api/api-keys'),
          fetch('/api/image-to-prompt'),
          fetch('/api/image-generation-prompt'),
          fetch('/api/keyword-search-prompt'),
          fetch('/api/templates'),
        ]);

      setApiKeys(await apiKeysRes.json());
      setImageToPrompts(await imgToPromptRes.json());
      setImageGenPrompts(await imgGenPromptRes.json());
      setKeywordPrompts(await keywordPromptRes.json());
      setTemplates(await templatesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      setFormData({ ...formData, uploadedImagePath: data.url });
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.imageGenApiKeyId) {
      toast.error('Please select an Image Generation API Key');
      return;
    }
    if (!formData.imageGenModel) {
      toast.error('Please select or enter an Image Generation Model');
      return;
    }
    if (!formData.keywordSearchApiKeyId) {
      toast.error('Please select a Keyword Search API Key');
      return;
    }
    if (!formData.imageDescApiKeyId) {
      toast.error('Please select an Image Description API Key');
      return;
    }
    if (!formData.imageDescModel) {
      toast.error('Please select or enter an Image Description Model');
      return;
    }
    if (!formData.uploadedImagePath) {
      toast.error('Please upload a reference image');
      return;
    }
    if (!formData.imageToPromptId) {
      toast.error('Please select an Image Description Prompt');
      return;
    }
    if (!formData.imageGenerationPromptId) {
      toast.error('Please select an Image Generation Prompt');
      return;
    }
    if (!formData.keywordSearchPromptId) {
      toast.error('Please select a Keyword Search Prompt');
      return;
    }
    if (!noTemplate && selectedTemplates.length === 0) {
      toast.error('Please select at least one template or choose "No Template"');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          templateIds: noTemplate ? [] : selectedTemplates,
        }),
      });

      if (response.ok) {
        toast.success('Generation process started! Redirecting to history...');
        setTimeout(() => {
          router.push('/dashboard/history');
        }, 1000);
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting generation:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const imageGenKeys = apiKeys.filter((k) => (k.type === 'seedream' || k.type === 'fal') && k.isActive);
  const keywordKeys = apiKeys.filter((k) => (k.type === 'openai' || k.type === 'deepseek') && k.isActive);
  const activeTemplates = templates.filter((t) => t.isActive);

  const selectedImageGenKey = imageGenKeys.find(k => k.id === formData.imageGenApiKeyId);
  const imageGenKeyType = selectedImageGenKey?.type;
  const imageGenPresets = imageGenKeyType === 'seedream' ? MODEL_PRESETS.seedream :
                          imageGenKeyType === 'fal' ? MODEL_PRESETS.fal : [];

  const selectedImageDescKey = keywordKeys.find(k => k.id === formData.imageDescApiKeyId);
  const imageDescKeyType = selectedImageDescKey?.type;
  const imageDescPresets = imageDescKeyType === 'openai' ? MODEL_PRESETS.openai :
                           imageDescKeyType === 'deepseek' ? MODEL_PRESETS.deepseek : [];

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8 text-yellow-500" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Quick Generation
          </h1>
        </div>
        <p className="text-sm md:text-base text-gray-600">
          All-in-one form for fast Pinterest pin generation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* API Configuration Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
            API Configuration
          </h2>

          <div className="space-y-4">
            {/* Image Generation API */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Generation API Key *
              </label>
              <select
                value={formData.imageGenApiKeyId}
                onChange={(e) =>
                  setFormData({ ...formData, imageGenApiKeyId: e.target.value, imageGenModel: '' })
                }
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select API Key (Seedream or Fal)</option>
                {imageGenKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({key.type})
                  </option>
                ))}
              </select>

              {imageGenPresets.length > 0 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {imageGenPresets.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageGenModel: model })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          formData.imageGenModel === model
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <input
                  type="text"
                  value={formData.imageGenModel}
                  onChange={(e) => setFormData({ ...formData, imageGenModel: e.target.value })}
                  placeholder="Or enter custom model name"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  required
                />
              </div>

              <div className="mt-3 flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <input
                  type="checkbox"
                  id="includeTextInImage"
                  checked={formData.includeTextInImage}
                  onChange={(e) => setFormData({ ...formData, includeTextInImage: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="includeTextInImage" className="text-sm text-gray-700 cursor-pointer">
                  Include text in generated images
                </label>
              </div>
            </div>

            {/* Keyword Search API */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keyword Search API Key *
              </label>
              <select
                value={formData.keywordSearchApiKeyId}
                onChange={(e) =>
                  setFormData({ ...formData, keywordSearchApiKeyId: e.target.value })
                }
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select API Key (OpenAI or Deepseek)</option>
                {keywordKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({key.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Image Description API */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Description API Key *
              </label>
              <select
                value={formData.imageDescApiKeyId}
                onChange={(e) =>
                  setFormData({ ...formData, imageDescApiKeyId: e.target.value, imageDescModel: '' })
                }
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select API Key (OpenAI or Deepseek)</option>
                {keywordKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({key.type})
                  </option>
                ))}
              </select>

              {imageDescPresets.length > 0 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {imageDescPresets.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageDescModel: model })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          formData.imageDescModel === model
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <input
                  type="text"
                  value={formData.imageDescModel}
                  onChange={(e) => setFormData({ ...formData, imageDescModel: e.target.value })}
                  placeholder="Or enter custom model name"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Generation Settings Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
            Generation Settings
          </h2>

          <div className="space-y-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Posts *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                min="1"
                max="100"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-lg font-semibold"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Number of unique pins to create
              </p>
            </div>

            {/* Image Dimensions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Dimensions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {DIMENSION_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, imageWidth: preset.width, imageHeight: preset.height })}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.imageWidth === preset.width && formData.imageHeight === preset.height
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                    }`}
                  >
                    {preset.name}
                    <br />
                    <span className="text-xs opacity-75">{preset.width}×{preset.height}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={formData.imageWidth}
                    onChange={(e) => setFormData({ ...formData, imageWidth: parseInt(e.target.value) })}
                    min="100"
                    max="5000"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">≈ {(formData.imageWidth / 100).toFixed(2)} in</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={formData.imageHeight}
                    onChange={(e) => setFormData({ ...formData, imageHeight: parseInt(e.target.value) })}
                    min="100"
                    max="5000"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">≈ {(formData.imageHeight / 100).toFixed(2)} in</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload & Keywords Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">3</span>
            Upload & Keywords
          </h2>

          <div className="space-y-4">
            {/* Upload Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Image *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-all flex items-center justify-center gap-2 text-gray-600"
              >
                <Upload className="w-6 h-6" />
                {formData.uploadedImagePath ? 'Change Image' : 'Upload Image'}
              </button>
              {formData.uploadedImagePath && (
                <div className="mt-4 relative h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={formData.uploadedImagePath}
                    alt="Preview"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </div>

            {/* Additional Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Keywords (optional)
              </label>
              <textarea
                value={formData.additionalKeywords}
                onChange={(e) => setFormData({ ...formData, additionalKeywords: e.target.value })}
                placeholder="Enter additional keywords, separated by commas"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Prompts Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">4</span>
            Prompts
          </h2>

          <div className="space-y-4">
            {/* Image Description Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Description Prompt *
              </label>
              <select
                value={formData.imageToPromptId}
                onChange={(e) => setFormData({ ...formData, imageToPromptId: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select Prompt</option>
                {imageToPrompts.filter((p) => p.isActive).map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Generation Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Generation Prompt *
              </label>
              <select
                value={formData.imageGenerationPromptId}
                onChange={(e) => setFormData({ ...formData, imageGenerationPromptId: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select Prompt</option>
                {imageGenPrompts.filter((p) => p.isActive).map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Keyword Search Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keyword Search Prompt *
              </label>
              <select
                value={formData.keywordSearchPromptId}
                onChange={(e) => setFormData({ ...formData, keywordSearchPromptId: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select Prompt</option>
                {keywordPrompts.filter((p) => p.isActive).map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Templates Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">5</span>
            Templates
          </h2>

          <div className="space-y-4">
            {/* No Template Option */}
            <div>
              <label
                className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                style={{
                  borderColor: noTemplate ? '#2563eb' : '#e5e7eb',
                  backgroundColor: noTemplate ? '#eff6ff' : 'white'
                }}
              >
                <input
                  type="checkbox"
                  checked={noTemplate}
                  onChange={(e) => {
                    setNoTemplate(e.target.checked);
                    if (e.target.checked) {
                      setSelectedTemplates([]);
                    }
                  }}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">No Template</h3>
                  <p className="text-sm text-gray-600">
                    Skip template application (clean images only)
                  </p>
                </div>
              </label>
            </div>

            {/* Template Grid */}
            {!noTemplate && activeTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active templates found. Please create templates first or select "No Template".
              </div>
            ) : !noTemplate ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {activeTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => toggleTemplate(template.id)}
                    className={`cursor-pointer border-2 rounded-lg p-3 transition-all ${
                      selectedTemplates.includes(template.id)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {template.filePath && (
                      <div className="relative h-20 bg-gray-100 rounded mb-2">
                        <Image
                          src={template.filePath}
                          alt={template.name}
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                    )}
                    <h3 className="font-semibold text-xs truncate">{template.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{template.type}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Submit Button */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-4 md:p-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 text-lg"
          >
            <Play className="w-6 h-6" />
            {loading ? 'Starting Generation...' : 'Start Generation'}
          </button>
          <p className="text-sm text-gray-600 text-center mt-3">
            All settings are configured. Click to start the generation process.
          </p>
        </div>
      </form>
    </div>
  );
}
