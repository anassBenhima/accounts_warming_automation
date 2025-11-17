'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Download, Eye, FileArchive, FileSpreadsheet, Edit, FileText, ChevronDown, ChevronUp } from 'lucide-react';
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

interface SystemLog {
  id: string;
  level: string;
  module: string;
  action: string;
  message: string;
  error: string | null;
  createdAt: string;
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
  const searchParams = useSearchParams();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [changingTemplate, setChangingTemplate] = useState<{ [key: string]: boolean }>({});
  const [selectedTemplates, setSelectedTemplates] = useState<{ [key: string]: string }>({});
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchGenerations();
    fetchTemplates();

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      fetchGenerations();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Handle notification redirect - show logs for specific generation
  useEffect(() => {
    const showGenerationId = searchParams.get('show');
    if (showGenerationId && generations.length > 0 && !showLogs) {
      // Find the generation
      const generation = generations.find((g) => g.id === showGenerationId);
      if (generation) {
        // Automatically open logs for this generation
        fetchLogsForGeneration(showGenerationId);
        // Scroll to the generation
        setTimeout(() => {
          const element = document.getElementById(`generation-${showGenerationId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [searchParams, generations, showLogs]);

  const fetchGenerations = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch('/api/generations');
      const data = await response.json();
      setGenerations(data);
    } catch (error) {
      console.error('Error fetching generations:', error);
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  };

  const fetchLogsForGeneration = async (generationId: string) => {
    try {
      const response = await fetch(`/api/logs?resourceId=${generationId}`);
      const data = await response.json();
      setLogs(data);
      setShowLogs(generationId);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to fetch logs');
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

  const getProgressPercentage = (generation: Generation) => {
    if (generation.status === 'COMPLETED') return 100;
    if (generation.status === 'FAILED') return 0;
    if (generation.status === 'PENDING') return 0;

    // For PROCESSING status, calculate based on generated images
    const completedImages = generation.generatedImages.filter(img => img.status === 'completed').length;
    return Math.round((completedImages / generation.quantity) * 100);
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'PROCESSING':
        return 'bg-blue-500';
      case 'FAILED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
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
          onClick={() => fetchGenerations(true)}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-gray-900 text-sm md:text-base w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${refreshing ? 'animate-spin' : ''}`} />
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
              id={`generation-${generation.id}`}
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

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Progress</span>
                      <span className="text-xs font-medium text-gray-900">
                        {getProgressPercentage(generation)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(generation.status)}`}
                        style={{ width: `${getProgressPercentage(generation)}%` }}
                      ></div>
                    </div>
                  </div>
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
                  <button
                    onClick={() => fetchLogsForGeneration(generation.id)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all text-xs md:text-sm"
                    title="View Logs"
                  >
                    <FileText className="w-3 h-3 md:w-4 md:h-4" />
                    Logs
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
                      <label className="block text-xs md:text-sm font-medium text-gray-900 mb-2">
                        Change Template
                      </label>
                      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                        <select
                          value={selectedTemplates[image.id] || image.templateId || ''}
                          onChange={(e) =>
                            setSelectedTemplates({
                              ...selectedTemplates,
                              [image.id]: e.target.value,
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed text-xs md:text-sm flex items-center justify-center gap-2 whitespace-nowrap w-full md:w-auto"
                        >
                          {changingTemplate[image.id] ? (
                            <>
                              <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Changing...</span>
                            </>
                          ) : (
                            <>
                              <Edit className="w-3 h-3 md:w-4 md:h-4" />
                              Change
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

      {/* Logs Modal */}
      {showLogs && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLogs(null)}
        >
          <div
            className="bg-white rounded-xl p-4 md:p-6 lg:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                Generation Logs
              </h2>
              <button
                onClick={() => setShowLogs(null)}
                className="text-gray-500 hover:text-gray-700 text-xl md:text-2xl font-bold p-2"
              >
                ✕
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No logs found for this generation.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="p-4 cursor-pointer flex items-start justify-between hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(
                              log.level
                            )}`}
                          >
                            {log.level}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {log.module}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">
                            {log.action}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{log.message}</p>
                      </div>
                      {expandedLog === log.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {expandedLog === log.id && log.error && (
                      <div className="px-4 pb-4 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-red-700 mb-1 mt-3">
                          Error:
                        </h4>
                        <pre className="bg-red-50 p-3 rounded text-xs overflow-x-auto text-red-800">
                          {log.error}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
