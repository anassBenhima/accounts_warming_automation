'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Play, ChevronRight } from 'lucide-react';
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

// Step names for the wizard
const STEP_NAMES = [
  'Image Generation API',
  'Keyword Search API',
  'Quantity',
  'Upload & Keywords',
  'Image Description',
  'Image Generation',
  'Keyword Search',
  'Description API',
  'Templates',
];

export default function NewGenerationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
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
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleSubmit = async () => {
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
        // Redirect to history page after short delay to show toast
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

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          New Generation Process
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Create automated Pinterest pins with AI-generated images and content
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-start md:justify-between mb-6 md:mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center min-w-max">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                  s <= step
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              <span
                className={`mt-2 text-xs md:text-sm font-medium text-center ${
                  s <= step ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {STEP_NAMES[s - 1]}
              </span>
            </div>
            {s < 9 && (
              <ChevronRight
                className={`w-4 h-4 md:w-5 md:h-5 mx-1 md:mx-2 flex-shrink-0 ${
                  s < step ? 'text-blue-600' : 'text-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 lg:p-8">
        {/* Step 1: Image Generation API Key */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Step 1: Select Image Generation API Key
            </h2>
            <select
              value={formData.imageGenApiKeyId}
              onChange={(e) =>
                setFormData({ ...formData, imageGenApiKeyId: e.target.value, imageGenModel: '' })
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
            >
              <option value="">Select Image Generation API Key</option>
              {imageGenKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.type})
                </option>
              ))}
            </select>

            {formData.imageGenApiKeyId && (() => {
              const selectedKey = imageGenKeys.find(k => k.id === formData.imageGenApiKeyId);
              const keyType = selectedKey?.type;
              const presets = keyType === 'seedream' ? MODEL_PRESETS.seedream :
                            keyType === 'fal' ? MODEL_PRESETS.fal : [];

              return presets.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Model Preset
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageGenModel: model })}
                        className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
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
              ) : null;
            })()}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Custom Model Name
              </label>
              <input
                type="text"
                value={formData.imageGenModel}
                onChange={(e) =>
                  setFormData({ ...formData, imageGenModel: e.target.value })
                }
                placeholder="Model name (e.g., seedream-4-0-250828 or fal-ai/flux/dev)"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {formData.imageGenApiKeyId && (
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <input
                  type="checkbox"
                  id="includeTextInImage"
                  checked={formData.includeTextInImage}
                  onChange={(e) =>
                    setFormData({ ...formData, includeTextInImage: e.target.checked })
                  }
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="includeTextInImage" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Include text in generated images
                  <span className="block text-xs text-gray-500 mt-1">
                    Add this instruction to the image generation prompt
                  </span>
                </label>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!formData.imageGenApiKeyId || !formData.imageGenModel}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
            >
              Next Step
            </button>
          </div>
        )}

        {/* Step 2: Keyword Search API Key */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Step 2: Select Keyword Search API Key
            </h2>
            <select
              value={formData.keywordSearchApiKeyId}
              onChange={(e) =>
                setFormData({ ...formData, keywordSearchApiKeyId: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
            >
              <option value="">Select OpenAI or Deepseek API Key</option>
              {keywordKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.type})
                </option>
              ))}
            </select>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm md:text-base"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.keywordSearchApiKeyId}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Quantity */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Step 3: Set Quantity of Posts
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Pinterest posts to generate
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) })
                }
                min="1"
                max="100"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 text-lg font-semibold"
              />
              <p className="text-sm text-gray-500 mt-2">
                This is the number of unique pins to create for different Pinterest accounts
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Dimensions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageWidth: 1000, imageHeight: 1500 })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formData.imageWidth === 1000 && formData.imageHeight === 1500
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                  }`}
                >
                  9 x 16 in
                  <br />
                  <span className="text-xs opacity-75">1000×1500</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageWidth: 1080, imageHeight: 1080 })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formData.imageWidth === 1080 && formData.imageHeight === 1080
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                  }`}
                >
                  Square
                  <br />
                  <span className="text-xs opacity-75">1080×1080</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageWidth: 300, imageHeight: 420 })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formData.imageWidth === 300 && formData.imageHeight === 420
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                  }`}
                >
                  Compact
                  <br />
                  <span className="text-xs opacity-75">300×420</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageWidth: 1050, imageHeight: 600 })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formData.imageWidth === 1050 && formData.imageHeight === 600
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                  }`}
                >
                  Landscape
                  <br />
                  <span className="text-xs opacity-75">1050×600</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageWidth: 300, imageHeight: 450 })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formData.imageWidth === 300 && formData.imageHeight === 450
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                  }`}
                >
                  Mini Portrait
                  <br />
                  <span className="text-xs opacity-75">300×450</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageWidth: 3757, imageHeight: 2775 })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formData.imageWidth === 3757 && formData.imageHeight === 2775
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                  }`}
                >
                  High Res
                  <br />
                  <span className="text-xs opacity-75">3757×2775</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={formData.imageWidth}
                    onChange={(e) =>
                      setFormData({ ...formData, imageWidth: parseInt(e.target.value) })
                    }
                    min="100"
                    max="5000"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">≈ {(formData.imageWidth / 100).toFixed(2)} in</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={formData.imageHeight}
                    onChange={(e) =>
                      setFormData({ ...formData, imageHeight: parseInt(e.target.value) })
                    }
                    min="100"
                    max="5000"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">≈ {(formData.imageHeight / 100).toFixed(2)} in</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm md:text-base"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={formData.quantity < 1}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Upload Image & Keywords */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Step 4: Upload Image & Add Keywords
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Reference Image
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Keywords (optional)
              </label>
              <textarea
                value={formData.additionalKeywords}
                onChange={(e) =>
                  setFormData({ ...formData, additionalKeywords: e.target.value })
                }
                placeholder="Enter additional keywords, separated by commas"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm md:text-base"
              >
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                disabled={!formData.uploadedImagePath}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Image Description Prompt */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Step 5: Select Image Description Prompt
            </h2>
            <select
              value={formData.imageToPromptId}
              onChange={(e) =>
                setFormData({ ...formData, imageToPromptId: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
            >
              <option value="">Select Prompt</option>
              {imageToPrompts.filter((p) => p.isActive).map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </option>
              ))}
            </select>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(4)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm md:text-base"
              >
                Back
              </button>
              <button
                onClick={() => setStep(6)}
                disabled={!formData.imageToPromptId}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Image Generation Prompt */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Step 6: Select Image Generation Prompt
            </h2>
            <select
              value={formData.imageGenerationPromptId}
              onChange={(e) =>
                setFormData({ ...formData, imageGenerationPromptId: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
            >
              <option value="">Select Prompt</option>
              {imageGenPrompts.filter((p) => p.isActive).map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </option>
              ))}
            </select>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(5)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm md:text-base"
              >
                Back
              </button>
              <button
                onClick={() => setStep(7)}
                disabled={!formData.imageGenerationPromptId}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Keyword Search Prompt */}
        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Step 7: Select Keyword Search Prompt
            </h2>
            <select
              value={formData.keywordSearchPromptId}
              onChange={(e) =>
                setFormData({ ...formData, keywordSearchPromptId: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
            >
              <option value="">Select Prompt</option>
              {keywordPrompts.filter((p) => p.isActive).map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </option>
              ))}
            </select>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(6)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm md:text-base"
              >
                Back
              </button>
              <button
                onClick={() => setStep(8)}
                disabled={!formData.keywordSearchPromptId}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 8: Image Description API Key */}
        {step === 8 && (
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Step 8: Set Image Description API
            </h2>
            <select
              value={formData.imageDescApiKeyId}
              onChange={(e) =>
                setFormData({ ...formData, imageDescApiKeyId: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
            >
              <option value="">Select API Key</option>
              {keywordKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.type})
                </option>
              ))}
            </select>

            {/* Model Presets */}
            {formData.imageDescApiKeyId && (() => {
              const selectedKey = keywordKeys.find(k => k.id === formData.imageDescApiKeyId);
              const keyType = selectedKey?.type;
              const presets = keyType === 'openai' ? MODEL_PRESETS.openai :
                            keyType === 'deepseek' ? MODEL_PRESETS.deepseek : [];

              return presets.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Model Preset
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageDescModel: model })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
              ) : null;
            })()}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Custom Model Name
              </label>
              <input
                type="text"
                value={formData.imageDescModel}
                onChange={(e) =>
                  setFormData({ ...formData, imageDescModel: e.target.value })
                }
                placeholder="Model name (e.g., gpt-4-vision-preview)"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(7)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm md:text-base"
              >
                Back
              </button>
              <button
                onClick={() => setStep(9)}
                disabled={!formData.imageDescApiKeyId || !formData.imageDescModel}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 9: Select Templates */}
        {step === 9 && (
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Step 9: Select Templates
            </h2>
            <p className="text-gray-600 mb-4">
              Select at least one template to apply to the generated images, or choose no template for clean images only
            </p>

            {/* No Template Option */}
            <div className="mb-4">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
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
                    Skip template application and only apply image optimization (cleaning, resizing)
                  </p>
                </div>
              </label>
            </div>

            {!noTemplate && activeTemplates.length === 0 ? (
              <div className="text-center py-8 text-sm md:text-base text-gray-500">
                No active templates found. Please create templates first or select "No Template".
              </div>
            ) : !noTemplate ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 max-h-96 overflow-y-auto">
                {activeTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => toggleTemplate(template.id)}
                    className={`cursor-pointer border-2 rounded-lg p-3 md:p-4 transition-all ${
                      selectedTemplates.includes(template.id)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {template.filePath && (
                      <div className="relative h-20 md:h-24 bg-gray-100 rounded mb-2">
                        <Image
                          src={template.filePath}
                          alt={template.name}
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                    )}
                    <h3 className="font-semibold text-xs md:text-sm truncate">{template.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{template.type}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => setStep(8)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm md:text-base"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || (!noTemplate && selectedTemplates.length === 0)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <Play className="w-4 h-4 md:w-5 md:h-5" />
                {loading ? 'Starting...' : 'Start Generation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
