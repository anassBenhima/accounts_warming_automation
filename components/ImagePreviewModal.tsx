'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  description?: string;
  keywords?: string[];
  altText?: string;
}

export default function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  description,
  keywords = [],
  altText,
}: ImagePreviewModalProps) {
  const [scale, setScale] = useState(1);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = title || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
            {title || 'Image Preview'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
          <div
            style={{
              transform: `scale(${scale})`,
              transition: 'transform 0.2s ease-in-out',
            }}
            className="relative"
          >
            <Image
              src={imageUrl}
              alt={altText || title || 'Preview'}
              width={800}
              height={1200}
              className="max-w-full h-auto rounded-lg shadow-2xl"
              unoptimized
            />
          </div>
        </div>

        {/* Details */}
        {(description || keywords.length > 0 || altText) && (
          <div className="border-t border-gray-200 p-4 bg-white max-h-64 overflow-y-auto">
            <div className="space-y-3">
              {description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Description</h4>
                  <p className="text-sm text-gray-700">{description}</p>
                </div>
              )}

              {altText && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Alt Text</h4>
                  <p className="text-sm text-gray-700">{altText}</p>
                </div>
              )}

              {keywords.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
