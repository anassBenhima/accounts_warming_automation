'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Upload, Eye } from 'lucide-react';
import Image from 'next/image';
import ConfirmModal from '@/components/ConfirmModal';

interface Template {
  id: string;
  name: string;
  type: string;
  filePath: string | null;
  positionX: number | null;
  positionY: number | null;
  width: number | null;
  height: number | null;
  opacity: number | null;
  textContent: string | null;
  fontSize: number | null;
  fontColor: string | null;
  fontFamily: string | null;
  backgroundColor: string | null;
  previewPath: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'OVERLAY_IMAGE',
    filePath: '',
    positionX: 50,
    positionY: 50,
    width: 100,
    height: 100,
    opacity: 0.1,
    textContent: '',
    fontSize: 8,
    fontColor: '#000000',
    fontFamily: 'Arial',
    backgroundColor: '#000000',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      setFormData({ ...formData, filePath: data.url });
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({
          name: '',
          type: 'OVERLAY_IMAGE',
          filePath: '',
          positionX: 50,
          positionY: 50,
          width: 100,
          height: 100,
          opacity: 0.1,
          textContent: '',
          fontSize: 8,
          fontColor: '#000000',
          fontFamily: 'Arial',
          backgroundColor: '#000000',
        });
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      const response = await fetch(`/api/templates/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'OVERLAY_IMAGE':
        return 'Overlay Image';
      case 'WATERMARK':
        return 'Watermark';
      case 'LOGO':
        return 'Logo';
      case 'TEXT':
        return 'Text';
      case 'TEXT_WITH_BACKGROUND':
        return 'Text with Background';
      case 'HTML_TEMPLATE':
        return 'HTML Template';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'OVERLAY_IMAGE':
        return 'bg-blue-100 text-blue-800';
      case 'WATERMARK':
        return 'bg-purple-100 text-purple-800';
      case 'LOGO':
        return 'bg-green-100 text-green-800';
      case 'TEXT':
        return 'bg-yellow-100 text-yellow-800';
      case 'TEXT_WITH_BACKGROUND':
        return 'bg-orange-100 text-orange-800';
      case 'HTML_TEMPLATE':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Manage image templates with watermarks, logos, and overlays
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg text-sm md:text-base w-full md:w-auto"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Add Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 text-center">
          <p className="text-sm md:text-base text-gray-500">
            No templates found. Add your first template to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Preview */}
              <div className="bg-gray-100 h-40 md:h-48 flex items-center justify-center relative">
                {template.type === 'HTML_TEMPLATE' && template.previewPath && (
                  <Image
                    src={template.previewPath}
                    alt={template.name}
                    fill
                    className="object-contain p-3 md:p-4"
                  />
                )}
                {template.type === 'HTML_TEMPLATE' && !template.previewPath && (
                  <div className="text-center px-4">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-xs text-gray-500">HTML Template</p>
                  </div>
                )}
                {template.type !== 'HTML_TEMPLATE' && template.type !== 'TEXT' && template.type !== 'TEXT_WITH_BACKGROUND' && template.filePath && (
                  <Image
                    src={template.filePath}
                    alt={template.name}
                    fill
                    className="object-contain p-3 md:p-4"
                  />
                )}
                {template.type === 'TEXT' && (
                  <div
                    style={{
                      fontSize: `${template.fontSize || 8}%`,
                      color: template.fontColor || '#000000',
                      fontFamily: template.fontFamily || 'Arial',
                    }}
                    className="text-center px-3 md:px-4 text-xs md:text-sm"
                  >
                    {template.textContent || 'Sample Text'}
                  </div>
                )}
                {template.type === 'TEXT_WITH_BACKGROUND' && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div
                      style={{
                        backgroundColor: template.backgroundColor || '#000000',
                        color: template.fontColor || '#FFFFFF',
                        fontSize: `${template.fontSize || 8}%`,
                        fontFamily: template.fontFamily || 'Arial',
                      }}
                      className="w-full text-center px-3 md:px-4 py-2 text-xs md:text-sm"
                    >
                      {template.textContent || 'Sample Text with Background'}
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 flex-1 truncate">
                    {template.name}
                  </h3>
                  <button
                    onClick={() => toggleActive(template.id, template.isActive)}
                    className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      template.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {template.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <span
                  className={`inline-block px-2 md:px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(
                    template.type
                  )} mb-2 md:mb-3`}
                >
                  {getTypeLabel(template.type)}
                </span>

                <div className="text-xs text-gray-500 space-y-1 mb-3 md:mb-4">
                  {template.positionX !== null && (
                    <p>Position: {template.positionX}%, {template.positionY}%</p>
                  )}
                  {template.width !== null && (
                    <p>Size: {template.width}% × {template.height}%</p>
                  )}
                  {template.opacity !== null && (
                    <p>Opacity: {(template.opacity * 100).toFixed(0)}%</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, id: template.id })}
                    className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
              Add New Template
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
                  placeholder="My Template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                >
                  <option value="OVERLAY_IMAGE">Overlay Image</option>
                  <option value="WATERMARK">Watermark</option>
                  <option value="LOGO">Logo</option>
                  <option value="TEXT">Text</option>
                  <option value="TEXT_WITH_BACKGROUND">Text with Background</option>
                  <option value="HTML_TEMPLATE">HTML Template</option>
                </select>
              </div>

              {formData.type !== 'TEXT' && formData.type !== 'TEXT_WITH_BACKGROUND' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.type === 'HTML_TEMPLATE' ? 'Upload HTML Template' : 'Upload Image'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={formData.type === 'HTML_TEMPLATE' ? '.html' : 'image/*'}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-all flex items-center justify-center gap-2 text-gray-600"
                  >
                    <Upload className="w-5 h-5" />
                    {uploading ? 'Uploading...' : formData.filePath ?
                      (formData.type === 'HTML_TEMPLATE' ? 'Change HTML File' : 'Change Image') :
                      (formData.type === 'HTML_TEMPLATE' ? 'Upload HTML File' : 'Upload Image')}
                  </button>
                  {formData.filePath && formData.type !== 'HTML_TEMPLATE' && (
                    <div className="mt-2 relative h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={formData.filePath}
                        alt="Preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  {formData.filePath && formData.type === 'HTML_TEMPLATE' && (
                    <div className="mt-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">
                        HTML template uploaded: {formData.filePath.split('/').pop()}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Use placeholders like {'{image_1}'}, {'{image_2}'} in your HTML for dynamic images
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(formData.type === 'TEXT' || formData.type === 'TEXT_WITH_BACKGROUND') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Content
                    </label>
                    <input
                      type="text"
                      value={formData.textContent}
                      onChange={(e) =>
                        setFormData({ ...formData, textContent: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
                      placeholder="Your text here"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Size (% of image height)
                      </label>
                      <input
                        type="number"
                        value={formData.fontSize}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fontSize: parseFloat(e.target.value),
                          })
                        }
                        min="1"
                        max="50"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Color
                      </label>
                      <input
                        type="color"
                        value={formData.fontColor}
                        onChange={(e) =>
                          setFormData({ ...formData, fontColor: e.target.value })
                        }
                        className="w-full h-10 rounded-lg border border-gray-300"
                      />
                    </div>
                  </div>

                  {formData.type === 'TEXT_WITH_BACKGROUND' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Background Color
                      </label>
                      <input
                        type="color"
                        value={formData.backgroundColor}
                        onChange={(e) =>
                          setFormData({ ...formData, backgroundColor: e.target.value })
                        }
                        className="w-full h-10 rounded-lg border border-gray-300"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Position Y: 0-33% = Top, 34-66% = Center, 67-100% = Bottom
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position X (%)
                  </label>
                  <input
                    type="number"
                    value={formData.positionX}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        positionX: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position Y (%)
                  </label>
                  <input
                    type="number"
                    value={formData.positionY}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        positionY: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (%)
                  </label>
                  <input
                    type="number"
                    value={formData.width}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        width: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (%)
                  </label>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        height: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opacity: {(formData.opacity * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  value={formData.opacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  max="1"
                  step="0.01"
                  className="w-full"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm md:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-sm md:text-base"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
}
