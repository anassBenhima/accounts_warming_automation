'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, Download, Trash2, Eye } from 'lucide-react';
import Image from 'next/image';
import ApiResponseCard from '@/components/ApiResponseCard';
import RegenerateModal from '@/components/RegenerateModal';
import ImagePreviewModal from '@/components/ImagePreviewModal';

interface GeneratedPin {
  id: string;
  imageUrl: string;
  localImagePath?: string | null;
  title: string;
  description: string;
  keywords: string[];
  altText?: string;
  status: string;
  createdAt: string;
}

interface Row {
  id: string;
  keywords: string;
  imageUrl: string;
  title?: string | null;
  description?: string | null;
  altText?: string | null;
  quantity: number;
  status: string;
  completedPins: number;
  failedPins: number;
  error?: string;
  apiResponses?: any;
  generatedPins: GeneratedPin[];
  createdAt: string;
}

interface ApiKey {
  name: string;
  type: string;
}

interface BulkGeneration {
  id: string;
  name: string;
  status: string;
  totalRows: number;
  completedRows: number;
  failedRows: number;
  imageWidth: number;
  imageHeight: number;
  imageGenModel?: string | null;
  keywordSearchModel?: string | null;
  imageDescModel?: string | null;
  imageGenApiKeyId?: string;
  keywordSearchApiKeyId?: string;
  imageDescApiKeyId?: string;
  imageGenApiKey?: ApiKey;
  keywordSearchApiKey?: ApiKey;
  imageDescApiKey?: ApiKey;
  createdAt: string;
  updatedAt: string;
  rows: Row[];
}

export default function BulkHistoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [bulkGeneration, setBulkGeneration] = useState<BulkGeneration | null>(null);
  const [selectedPin, setSelectedPin] = useState<GeneratedPin | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateRow, setRegenerateRow] = useState<Row | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewPin, setPreviewPin] = useState<GeneratedPin | null>(null);

  useEffect(() => {
    fetchBulkGeneration();
  }, [id]);

  // Auto-refresh every 5 seconds while processing
  useEffect(() => {
    if (bulkGeneration && bulkGeneration.status === 'PROCESSING') {
      const interval = setInterval(() => {
        fetchBulkGeneration();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [bulkGeneration?.status]);

  const fetchBulkGeneration = async () => {
    try {
      const response = await fetch(`/api/bulk-generations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setBulkGeneration(data);
      } else {
        toast.error('Failed to fetch bulk generation details');
        router.push('/dashboard/bulk-history');
      }
    } catch (error) {
      console.error('Error fetching bulk generation:', error);
      toast.error('Failed to fetch bulk generation details');
      router.push('/dashboard/bulk-history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!bulkGeneration) return;

    // Custom confirmation using toast
    const confirmToast = toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="font-medium text-gray-900">Delete Bulk Generation?</p>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete "{bulkGeneration.name}"? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                toast.dismiss(t.id);
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const response = await fetch(`/api/bulk-generations/${id}`, {
                    method: 'DELETE',
                  });

                  if (response.ok) {
                    toast.success('Bulk generation deleted');
                    router.push('/dashboard/bulk-history');
                  } else {
                    const data = await response.json();
                    toast.error(data.error || 'Failed to delete');
                  }
                } catch (error) {
                  console.error('Error deleting bulk generation:', error);
                  toast.error('Failed to delete');
                }
              }}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: 'top-center',
      }
    );
  };

  const exportToCSV = () => {
    if (!bulkGeneration) return;

    // CSV with column headers only (no title row)
    const csvData = [
      ['Title', 'Description', 'Keywords', 'Image URL', 'Alt Text', 'Pinterest Board', 'Published date'],
    ];

    // Escape CSV values (handle commas and quotes)
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Truncate text to specified length
    const truncate = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength);
    };

    bulkGeneration.rows.forEach((row) => {
      row.generatedPins.forEach((pin) => {
        // Use local image path if available, otherwise fall back to API URL
        const imageUrl = pin.localImagePath
          ? `${window.location.origin}${pin.localImagePath}`
          : pin.imageUrl;

        // Get publishDate and pinterestBoard from row data
        const publishDate = (row as any).publishDate || '';
        const pinterestBoard = (row as any).pinterestBoard || '';

        csvData.push([
          escapeCSV(truncate(pin.title, 100)), // Title max 100 chars
          escapeCSV(truncate(pin.description, 500)), // Description max 500 chars
          escapeCSV(pin.keywords.join(', ')),
          escapeCSV(imageUrl),
          escapeCSV((pin as any).altText || pin.title),
          escapeCSV(pinterestBoard),
          escapeCSV(publishDate),
        ]);
      });
    });

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bulkGeneration.name}-pins.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const handleRegenerateWithConfig = async (config: {
    imageGenApiKeyId: string;
    imageGenModel: string;
    keywordSearchApiKeyId: string;
    keywordSearchModel: string;
    imageDescApiKeyId: string;
    imageDescModel: string;
    quantity: number;
  }) => {
    if (!bulkGeneration || !regenerateRow) {
      toast.error('Cannot regenerate: missing required data');
      return;
    }

    try {
      // Create a new bulk generation with 1 row based on this row
      const response = await fetch('/api/bulk-generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Regenerated: ${bulkGeneration.name}`,
          imageGenApiKeyId: config.imageGenApiKeyId,
          keywordSearchApiKeyId: config.keywordSearchApiKeyId,
          imageDescApiKeyId: config.imageDescApiKeyId,
          imageGenModel: config.imageGenModel,
          keywordSearchModel: config.keywordSearchModel,
          imageDescModel: config.imageDescModel,
          imageWidth: bulkGeneration.imageWidth,
          imageHeight: bulkGeneration.imageHeight,
          rows: [
            {
              keywords: regenerateRow.keywords,
              imageUrl: regenerateRow.imageUrl,
              title: regenerateRow.title || null,
              description: regenerateRow.description || null,
              altText: regenerateRow.altText || null,
              quantity: config.quantity,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate');
      }

      const newBulkGeneration = await response.json();

      toast.success('Regeneration started! Redirecting...');

      // Redirect to the new bulk generation after a short delay
      setTimeout(() => {
        router.push(`/dashboard/bulk-history/${newBulkGeneration.id}`);
      }, 1000);
    } catch (error) {
      console.error('Error regenerating:', error);
      toast.error('Failed to regenerate. Please try again.');
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!bulkGeneration) {
    return null;
  }

  const totalPins = bulkGeneration.rows.reduce(
    (sum, row) => sum + row.generatedPins.length,
    0
  );

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <button
          onClick={() => router.push('/dashboard/bulk-history')}
          className="flex items-center gap-2 text-gray-900 hover:text-blue-600 mb-4 text-sm md:text-base"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          Back to History
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{bulkGeneration.name}</h1>
            <p className="text-sm md:text-base text-gray-600 mt-2">
              Created {format(new Date(bulkGeneration.createdAt), 'MMM d, yyyy h:mm a')}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span
                className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium ${getStatusColor(
                  bulkGeneration.status
                )}`}
              >
                {bulkGeneration.status}
              </span>
              {bulkGeneration.status === 'PROCESSING' && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900 text-sm md:text-base w-full md:w-auto"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5" />
              Export CSV
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm md:text-base w-full md:w-auto"
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-gray-50 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Total Rows</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{bulkGeneration.totalRows}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-xl md:text-2xl font-bold text-green-700">
            {bulkGeneration.completedRows}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Failed</p>
          <p className="text-xl md:text-2xl font-bold text-red-700">
            {bulkGeneration.failedRows}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Total Pins</p>
          <p className="text-xl md:text-2xl font-bold text-blue-700">{totalPins}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Dimensions</p>
          <p className="text-lg md:text-xl font-bold text-purple-700">
            {bulkGeneration.imageWidth} × {bulkGeneration.imageHeight}
          </p>
        </div>
      </div>

      {/* Models and APIs */}
      <div className="bg-white border rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Models & APIs Used</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Image Generation</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-900 font-medium">
                {bulkGeneration.imageGenApiKey?.name || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                API: {bulkGeneration.imageGenApiKey?.type || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Model: {bulkGeneration.imageGenModel || 'Default'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Keyword Search</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-900 font-medium">
                {bulkGeneration.keywordSearchApiKey?.name || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                API: {bulkGeneration.keywordSearchApiKey?.type || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Model: {bulkGeneration.keywordSearchModel || 'Default'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Image Description</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-900 font-medium">
                {bulkGeneration.imageDescApiKey?.name || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                API: {bulkGeneration.imageDescApiKey?.type || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Model: {bulkGeneration.imageDescModel || 'Default'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Rows</h2>

        {bulkGeneration.rows.map((row, index) => (
          <div key={row.id} className="border rounded-lg p-4 md:p-6 bg-white">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                  Row {index + 1}
                </h3>
                <div className="space-y-2 text-sm md:text-base">
                  <p className="text-gray-600">
                    <span className="font-medium text-gray-900">Keywords:</span> {row.keywords}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium text-gray-900">Source Image:</span>{' '}
                    <a
                      href={row.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {row.imageUrl}
                    </a>
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium text-gray-900">Quantity:</span> {row.quantity}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">Status:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  {row.error && (
                    <p className="text-red-600 text-xs md:text-sm">
                      <span className="font-medium">Error:</span> {row.error}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center min-w-[80px]">
                  <p className="text-xs text-gray-600 mb-1">Completed</p>
                  <p className="text-xl font-bold text-green-700">{row.completedPins}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center min-w-[80px]">
                  <p className="text-xs text-gray-600 mb-1">Failed</p>
                  <p className="text-xl font-bold text-red-700">{row.failedPins}</p>
                </div>
              </div>
            </div>

            {/* Generated Pins */}
            {row.generatedPins.length > 0 && (
              <div className="mt-4">
                <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-3">
                  Generated Pins ({row.generatedPins.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {row.generatedPins.map((pin) => (
                    <div
                      key={pin.id}
                      className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow"
                    >
                      <div
                        onClick={() => {
                          setPreviewPin(pin);
                          setShowImagePreview(true);
                        }}
                        className="relative w-full h-48 md:h-64 mb-3 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      >
                        <Image
                          src={pin.localImagePath || pin.imageUrl}
                          alt={pin.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <h5 className="font-semibold text-gray-900 mb-2 text-sm md:text-base line-clamp-2">
                        {pin.title}
                      </h5>
                      <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-3">
                        {pin.description}
                        {pin.keywords && pin.keywords.length > 0 && (
                          <span className="text-blue-600">
                            {' '}{pin.keywords.map(k => `#${k}`).join(' ')}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {pin.keywords.slice(0, 3).map((keyword, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                        {pin.keywords.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{pin.keywords.length - 3}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedPin(pin)}
                        className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900 text-xs md:text-sm justify-center"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Response Details */}
            {row.apiResponses && (
              <div className="mt-4">
                <ApiResponseCard
                  title={`Row ${index + 1} - API Response Details`}
                  apiResponses={row.apiResponses}
                  uploadedImageUrl={row.imageUrl}
                  userInputs={{
                    title: row.title || undefined,
                    description: row.description || undefined,
                    altText: row.altText || undefined,
                    keywords: row.keywords,
                    publishDate: row.publishDate || undefined,
                    pinterestBoard: row.pinterestBoard || undefined,
                  }}
                  onRegenerateClick={() => {
                    setRegenerateRow(row);
                    setShowRegenerateModal(true);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pin Detail Modal */}
      {selectedPin && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPin(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">Pin Details</h3>
                <button
                  onClick={() => setSelectedPin(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative w-full h-64 md:h-96 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={selectedPin.imageUrl}
                    alt={selectedPin.title}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Title</h4>
                    <p className="text-base md:text-lg text-gray-900">{selectedPin.title}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Description</h4>
                    <p className="text-sm md:text-base text-gray-900">
                      {selectedPin.description}
                      {selectedPin.keywords && selectedPin.keywords.length > 0 && (
                        <span className="text-blue-600">
                          {' '}{selectedPin.keywords.map(k => `#${k}`).join(' ')}
                        </span>
                      )}
                    </p>
                  </div>

                  {selectedPin.altText && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Alt Text</h4>
                      <p className="text-sm md:text-base text-gray-900">{selectedPin.altText}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPin.keywords.map((keyword, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Image URL</h4>
                    <a
                      href={selectedPin.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {selectedPin.imageUrl}
                    </a>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Created</h4>
                    <p className="text-sm text-gray-900">
                      {format(new Date(selectedPin.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Modal */}
      {regenerateRow && bulkGeneration && (
        <RegenerateModal
          isOpen={showRegenerateModal}
          onClose={() => {
            setShowRegenerateModal(false);
            setRegenerateRow(null);
          }}
          onRegenerate={handleRegenerateWithConfig}
          currentConfig={{
            imageGenApiKeyId: bulkGeneration.imageGenApiKeyId,
            imageGenModel: bulkGeneration.imageGenModel || undefined,
            keywordSearchApiKeyId: bulkGeneration.keywordSearchApiKeyId,
            keywordSearchModel: bulkGeneration.keywordSearchModel || undefined,
            imageDescApiKeyId: bulkGeneration.imageDescApiKeyId,
            imageDescModel: bulkGeneration.imageDescModel || undefined,
          }}
        />
      )}

      {/* Image Preview Modal */}
      {previewPin && (
        <ImagePreviewModal
          isOpen={showImagePreview}
          onClose={() => {
            setShowImagePreview(false);
            setPreviewPin(null);
          }}
          imageUrl={previewPin.localImagePath || previewPin.imageUrl}
          title={previewPin.title}
          description={previewPin.description}
          keywords={previewPin.keywords}
          altText={previewPin.altText}
        />
      )}
    </div>
  );
}
