'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  type: string;
}

interface Row {
  id: string;
  keywords: string;
  imageUrl: string;
  quantity: number;
}

export default function BulkGenerationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [imageGenApiKeyId, setImageGenApiKeyId] = useState('');
  const [keywordSearchApiKeyId, setKeywordSearchApiKeyId] = useState('');
  const [imageDescApiKeyId, setImageDescApiKeyId] = useState('');
  const [imageWidth, setImageWidth] = useState(1000);
  const [imageHeight, setImageHeight] = useState(1500);
  const [rows, setRows] = useState<Row[]>([
    { id: '1', keywords: '', imageUrl: '', quantity: 1 },
  ]);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);

        // Auto-select first key of each type
        const falKey = data.find((k: ApiKey) => k.type === 'fal');
        const openaiKey = data.find((k: ApiKey) => k.type === 'openai');

        if (falKey) setImageGenApiKeyId(falKey.id);
        if (openaiKey) {
          setKeywordSearchApiKeyId(openaiKey.id);
          setImageDescApiKeyId(openaiKey.id);
        }
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const addRow = () => {
    setRows([
      ...rows,
      { id: Date.now().toString(), keywords: '', imageUrl: '', quantity: 1 },
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
          imageWidth,
          imageHeight,
          rows: validRows.map((row) => ({
            keywords: row.keywords,
            imageUrl: row.imageUrl,
            quantity: parseInt(row.quantity.toString(), 10),
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

  const falKeys = apiKeys.filter((k) => k.type === 'fal');
  const openaiKeys = apiKeys.filter((k) => k.type === 'openai');

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
              {falKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name}
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
              {openaiKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name}
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
              {openaiKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name}
                </option>
              ))}
            </select>
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
              max="2000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Image Height (px)</label>
            <input
              type="number"
              value={imageHeight}
              onChange={(e) => setImageHeight(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm md:text-base"
              min="100"
              max="3000"
            />
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
                  <th className="px-2 md:px-4 py-3 text-center text-xs md:text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 md:px-4 py-3">
                      <input
                        type="text"
                        value={row.keywords}
                        onChange={(e) =>
                          updateRow(row.id, 'keywords', e.target.value)
                        }
                        className="w-full px-2 md:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 text-gray-900 text-xs md:text-sm"
                        placeholder="recipe, cooking, food"
                      />
                    </td>
                    <td className="px-2 md:px-4 py-3">
                      <input
                        type="url"
                        value={row.imageUrl}
                        onChange={(e) =>
                          updateRow(row.id, 'imageUrl', e.target.value)
                        }
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
    </div>
  );
}
