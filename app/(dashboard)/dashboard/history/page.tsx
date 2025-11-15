'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Download, Eye, FileArchive, FileSpreadsheet, Edit } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface GeneratedImage {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  finalPath: string;
  status: string;
  templateId: string | null;
}

interface Template {
  id: string;
  name: string;
  type: string;
}

interface Generation {
  id: string;
  quantity: number;
  status: string;
  createdAt: string;
  imageDescription: string | null;
  generatedImages: GeneratedImage[];
}

export default function HistoryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [changingTemplate, setChangingTemplate] = useState<{ [key: string]: boolean }>({});
  const [selectedTemplates, setSelectedTemplates] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchGenerations();
    fetchTemplates();

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      fetchGenerations();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, []);

  const fetchGenerations = async () => {
    try {
      const response = await fetch('/api/generations');
      const data = await response.json();
      setGenerations(data);
    } catch (error) {
      console.error('Error fetching generations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleChangeTemplate = async (imageId: string, templateId: string) => {
    setChangingTemplate({ ...changingTemplate, [imageId]: true });
    try {
      const response = await fetch(`/api/generated-images/${imageId}/change-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId }),
      });

      if (!response.ok) {
        throw new Error('Failed to change template');
      }

      const result = await response.json();

      // Update the image in the selected generation
      if (selectedGeneration) {
        const updatedImages = selectedGeneration.generatedImages.map((img) =>
          img.id === imageId
            ? { ...img, templateId: result.image.templateId, finalPath: result.image.finalPath }
            : img
        );
        setSelectedGeneration({ ...selectedGeneration, generatedImages: updatedImages });

        // Also update in the generations list
        setGenerations(generations.map((gen) =>
          gen.id === selectedGeneration.id
            ? { ...gen, generatedImages: updatedImages }
            : gen
        ));
      }

      toast.success('Template changed successfully!');
    } catch (error) {
      console.error('Error changing template:', error);
      toast.error('Failed to change template. Please try again.');
    } finally {
      setChangingTemplate({ ...changingTemplate, [imageId]: false });
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadZip = (generationId: string) => {
    window.open(`/api/generations/${generationId}/download`, '_blank');
  };

  const handleExportCsv = (generationId: string) => {
    window.open(`/api/generations/${generationId}/export-csv`, '_blank');
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Generation History</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">View and manage your generated Pinterest pins</p>
        </div>
        <button
          onClick={fetchGenerations}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-gray-900 text-sm md:text-base w-full md:w-auto"
        >
          <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
          Refresh
        </button>
      </div>

      {generations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 text-center">
          <p className="text-sm md:text-base text-gray-500">
            No generations yet. Start your first generation process!
          </p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {generations.map((generation) => (
            <div
              key={generation.id}
              className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">
                      Generation {new Date(generation.createdAt).toLocaleDateString()}
                    </h3>
                    <span
                      className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        generation.status
                      )}`}
                    >
                      {generation.status}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600">
                    Quantity: {generation.quantity} pins
                  </p>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(generation.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleDownloadZip(generation.id)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all text-xs md:text-sm"
                    title="Download all pins as ZIP"
                  >
                    <FileArchive className="w-3 h-3 md:w-4 md:h-4" />
                    ZIP
                  </button>
                  <button
                    onClick={() => handleExportCsv(generation.id)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all text-xs md:text-sm"
                    title="Export as Pinterest CSV"
                  >
                    <FileSpreadsheet className="w-3 h-3 md:w-4 md:h-4" />
                    CSV
                  </button>
                  <button
                    onClick={() => setSelectedGeneration(generation)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-xs md:text-sm"
                  >
                    <Eye className="w-3 h-3 md:w-4 md:h-4" />
                    View
                  </button>
                </div>
              </div>

              {generation.generatedImages.length > 0 && (
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-700 mb-2">
                    Generated Images ({generation.generatedImages.length})
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {generation.generatedImages.slice(0, 6).map((image) => (
                      <div
                        key={image.id}
                        className="relative aspect-square bg-gray-100 rounded overflow-hidden"
                      >
                        {image.finalPath && (
                          <Image
                            src={image.finalPath}
                            alt={image.title}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {generation.generatedImages.length > 6 && (
                    <p className="text-xs text-gray-500 mt-2">
                      +{generation.generatedImages.length - 6} more images
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedGeneration && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedGeneration(null)}
        >
          <div
            className="bg-white rounded-xl p-4 md:p-6 lg:p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                Generation Details
              </h2>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button
                  onClick={() => handleDownloadZip(selectedGeneration.id)}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-xs md:text-sm"
                >
                  <FileArchive className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Download</span> ZIP
                </button>
                <button
                  onClick={() => handleExportCsv(selectedGeneration.id)}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-xs md:text-sm"
                >
                  <FileSpreadsheet className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Export</span> CSV
                </button>
                <button
                  onClick={() => setSelectedGeneration(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl md:text-2xl font-bold p-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {selectedGeneration.imageDescription && (
              <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">
                  Image Description
                </h3>
                <p className="text-xs md:text-sm text-gray-700">
                  {selectedGeneration.imageDescription}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {selectedGeneration.generatedImages.map((image) => (
                <div
                  key={image.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                >
                  {image.finalPath && (
                    <div className="relative aspect-[2/3] bg-gray-100">
                      <Image
                        src={image.finalPath}
                        alt={image.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-3 md:p-4">
                    <h4 className="text-sm md:text-base font-semibold text-gray-900 mb-2">
                      {image.title}
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600 mb-3">
                      {image.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {image.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>

                    {/* Template Selector */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Change Template
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={selectedTemplates[image.id] || image.templateId || ''}
                          onChange={(e) =>
                            setSelectedTemplates({
                              ...selectedTemplates,
                              [image.id]: e.target.value,
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          disabled={changingTemplate[image.id]}
                        >
                          <option value="">Select a template</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.type})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const templateId = selectedTemplates[image.id] || image.templateId;
                            if (templateId) {
                              handleChangeTemplate(image.id, templateId);
                            }
                          }}
                          disabled={
                            changingTemplate[image.id] ||
                            !selectedTemplates[image.id] ||
                            selectedTemplates[image.id] === image.templateId
                          }
                          className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed text-xs md:text-sm flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          {changingTemplate[image.id] ? (
                            <>
                              <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span className="hidden sm:inline">Saving...</span>
                            </>
                          ) : (
                            <>
                              <Edit className="w-3 h-3 md:w-4 md:h-4" />
                              Apply
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <a
                      href={image.finalPath}
                      download
                      className="mt-2 flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-xs md:text-sm"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
