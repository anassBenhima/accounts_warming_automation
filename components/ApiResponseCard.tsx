'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Code, Image as ImageIcon, FileText, Tag, RefreshCw } from 'lucide-react';

interface ApiResponseCardProps {
  title: string;
  apiResponses: any;
  uploadedImageUrl?: string;
  userInputs?: {
    title?: string;
    description?: string;
    altText?: string;
    keywords?: string;
  };
  onRegenerate?: () => Promise<void>;
}

export default function ApiResponseCard({ title, apiResponses, uploadedImageUrl, userInputs, onRegenerate }: ApiResponseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!onRegenerate) return;

    setIsRegenerating(true);
    try {
      await onRegenerate();
    } catch (error) {
      console.error('Regeneration error:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!apiResponses) {
    return null;
  }

  const renderSection = (sectionTitle: string, icon: React.ReactNode, data: any) => {
    if (!data) return null;

    return (
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h4 className="text-base font-semibold text-gray-900">{sectionTitle}</h4>
        </div>

        <div className="space-y-3">
          {/* Model and Timestamp */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.model && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-900 mb-1">Model</p>
                <p className="text-sm text-blue-700 font-mono">{data.model}</p>
              </div>
            )}
            {data.timestamp && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-900 mb-1">Timestamp</p>
                <p className="text-sm text-gray-700">{new Date(data.timestamp).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Endpoint */}
          {data.endpoint && (
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs font-medium text-purple-900 mb-1">API Endpoint</p>
              <p className="text-sm text-purple-700 font-mono break-all">{data.endpoint}</p>
            </div>
          )}

          {/* Request (Prompt) */}
          {data.request && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-900 mb-2">Request</p>
              <div className="space-y-2">
                {/* Show prompt if exists */}
                {data.request.prompt && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Prompt:</p>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border border-gray-200 max-h-40 overflow-y-auto">
                      {data.request.prompt}
                    </pre>
                  </div>
                )}
                {/* Show other request params */}
                {Object.entries(data.request).map(([key, value]) => {
                  if (key === 'prompt') return null;
                  return (
                    <div key={key}>
                      <p className="text-xs font-medium text-gray-700">
                        {key}: <span className="font-normal text-gray-600">{JSON.stringify(value)}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Response */}
          {data.response && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs font-medium text-green-900 mb-2">Response</p>
              <div className="bg-white p-2 rounded border border-green-200 max-h-60 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(data.response, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Error */}
          {data.error && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs font-medium text-red-900 mb-1">Error</p>
              <p className="text-sm text-red-700">{data.error}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden mt-4">
      <div className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <Code className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">{title}</span>
        </button>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
              title="Regenerate with same settings"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 bg-white space-y-4">
          {/* User Inputs Section (if provided) */}
          {userInputs && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-yellow-700" />
                <h4 className="text-base font-semibold text-yellow-900">User Provided Inputs</h4>
              </div>
              <div className="space-y-2 text-sm">
                {userInputs.title && (
                  <div>
                    <span className="font-medium text-yellow-900">Title:</span>
                    <span className="text-yellow-800 ml-2">{userInputs.title}</span>
                  </div>
                )}
                {userInputs.description && (
                  <div>
                    <span className="font-medium text-yellow-900">Description:</span>
                    <span className="text-yellow-800 ml-2">{userInputs.description}</span>
                  </div>
                )}
                {userInputs.altText && (
                  <div>
                    <span className="font-medium text-yellow-900">Alt Text:</span>
                    <span className="text-yellow-800 ml-2">{userInputs.altText}</span>
                  </div>
                )}
                {userInputs.keywords && (
                  <div>
                    <span className="font-medium text-yellow-900">Keywords:</span>
                    <span className="text-yellow-800 ml-2">{userInputs.keywords}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Uploaded Image (if provided) */}
          {uploadedImageUrl && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-gray-700" />
                <h4 className="text-base font-semibold text-gray-900">Input Image</h4>
              </div>
              <div className="text-sm">
                <p className="text-gray-600 mb-2">Source image used for generation:</p>
                <a
                  href={uploadedImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all text-xs"
                >
                  {uploadedImageUrl}
                </a>
              </div>
            </div>
          )}

          {/* Image Description API */}
          {renderSection(
            'Image Description API',
            <FileText className="w-4 h-4 text-blue-600" />,
            apiResponses.imageDescription
          )}

          {/* Content Variations API (new flow) */}
          {apiResponses.contentVariations && renderSection(
            'Content Variations Generation',
            <Tag className="w-4 h-4 text-purple-600" />,
            apiResponses.contentVariations
          )}

          {/* Keyword Generation API (legacy flow) */}
          {apiResponses.keywordGeneration && renderSection(
            'Keyword & Content Generation',
            <Tag className="w-4 h-4 text-green-600" />,
            apiResponses.keywordGeneration
          )}

          {/* Image Generation API */}
          {renderSection(
            'Image Generation API',
            <ImageIcon className="w-4 h-4 text-orange-600" />,
            apiResponses.imageGeneration
          )}

          {/* Alt Text Generation APIs */}
          {apiResponses.altTexts && apiResponses.altTexts.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h4 className="text-base font-semibold text-gray-900">
                  Alt Text Generation ({apiResponses.altTexts.length} calls)
                </h4>
              </div>
              <div className="space-y-3">
                {apiResponses.altTexts.map((altTextData: any, index: number) => (
                  <div key={index} className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-indigo-900 mb-2">Call #{index + 1}</p>
                    <div className="space-y-2 text-xs">
                      <p>
                        <span className="font-medium text-indigo-900">Model:</span>{' '}
                        <span className="text-indigo-700">{altTextData.model}</span>
                      </p>
                      {altTextData.request?.title && (
                        <p>
                          <span className="font-medium text-indigo-900">For Title:</span>{' '}
                          <span className="text-indigo-700">{altTextData.request.title}</span>
                        </p>
                      )}
                      {altTextData.timestamp && (
                        <p>
                          <span className="font-medium text-indigo-900">Time:</span>{' '}
                          <span className="text-indigo-700">
                            {new Date(altTextData.timestamp).toLocaleString()}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
