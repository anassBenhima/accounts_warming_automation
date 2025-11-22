'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Code, Eye, Plus, Save, Trash2, Image as ImageIcon, Type } from 'lucide-react';
import UserFilter from '@/components/UserFilter';

interface HtmlTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  templateType: 'html' | 'canva';
  htmlContent: string;
  canvaDesignId?: string;
  dynamicAreas: {
    type: 'image' | 'text';
    id: string;
    label: string;
    placeholder?: string;
    defaultValue?: string;
  }[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function HtmlTemplatesPage() {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<HtmlTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<HtmlTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<HtmlTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<HtmlTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    templateType: 'html' as 'html' | 'canva',
    htmlContent: '',
    canvaDesignId: '',
    dynamicAreas: [] as HtmlTemplate['dynamicAreas'],
  });

  const isAdmin = session?.user?.role === 'ADMIN';

  const handleFilterChange = (userId: string | null) => {
    if (!userId) {
      setFilteredTemplates(templates);
    } else {
      setFilteredTemplates(templates.filter((template) => template.userId === userId));
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/html-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
        setFilteredTemplates(data);
      } else {
        toast.error('Failed to fetch HTML templates');
      }
    } catch (error) {
      console.error('Error fetching HTML templates:', error);
      toast.error('Failed to fetch HTML templates');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDynamicArea = (type: 'image' | 'text') => {
    const newArea = {
      type,
      id: `dynamic-${Date.now()}`,
      label: type === 'image' ? 'Image Placeholder' : 'Text Placeholder',
      placeholder: type === 'text' ? 'Enter text here' : undefined,
      defaultValue: type === 'text' ? '' : undefined,
    };
    setFormData({
      ...formData,
      dynamicAreas: [...formData.dynamicAreas, newArea],
    });
  };

  const handleRemoveDynamicArea = (id: string) => {
    setFormData({
      ...formData,
      dynamicAreas: formData.dynamicAreas.filter((area) => area.id !== id),
    });
  };

  const handleUpdateDynamicArea = (id: string, updates: Partial<HtmlTemplate['dynamicAreas'][0]>) => {
    setFormData({
      ...formData,
      dynamicAreas: formData.dynamicAreas.map((area) =>
        area.id === id ? { ...area, ...updates } : area
      ),
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!formData.htmlContent.trim() && formData.templateType === 'html') {
      toast.error('HTML content is required for HTML templates');
      return;
    }

    if (!formData.canvaDesignId?.trim() && formData.templateType === 'canva') {
      toast.error('Canva Design ID is required for Canva templates');
      return;
    }

    try {
      const method = editingTemplate ? 'PUT' : 'POST';
      const url = editingTemplate
        ? `/api/html-templates/${editingTemplate.id}`
        : '/api/html-templates';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      toast.success(editingTemplate ? 'Template updated!' : 'Template created!');
      setShowEditor(false);
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        templateType: 'html' as 'html' | 'canva',
        htmlContent: '',
        canvaDesignId: '',
        dynamicAreas: [],
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleEdit = (template: HtmlTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      templateType: template.templateType,
      htmlContent: template.htmlContent,
      canvaDesignId: template.canvaDesignId || '',
      dynamicAreas: template.dynamicAreas,
    });
    setShowEditor(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/html-templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Template deleted');
        fetchTemplates();
      } else {
        toast.error('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handlePreview = (template: HtmlTemplate) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HTML Templates</h1>
          <p className="text-gray-600 mt-2">Create custom HTML templates with dynamic content areas</p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setFormData({
              name: '',
              description: '',
              templateType: 'html' as 'html' | 'canva',
              htmlContent: '',
              canvaDesignId: '',
              dynamicAreas: [],
            });
            setShowEditor(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      <UserFilter onFilterChange={handleFilterChange} />

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">
            {templates.length === 0
              ? "No HTML templates yet"
              : "No HTML templates found for the selected filter"}
          </p>
          {templates.length === 0 && (
            <button
              onClick={() => setShowEditor(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  )}
                </div>
              </div>

              {template.user && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {template.user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      {template.user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {template.user.email}
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Dynamic Areas: {template.dynamicAreas.length}
                </p>
                <div className="flex gap-2 mt-2">
                  {template.dynamicAreas.filter(a => a.type === 'image').length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {template.dynamicAreas.filter(a => a.type === 'image').length} Images
                    </span>
                  )}
                  {template.dynamicAreas.filter(a => a.type === 'text').length > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      {template.dynamicAreas.filter(a => a.type === 'text').length} Texts
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(template)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Code className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(template.id, template.name)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEditor(false)}
        >
          <div
            className="bg-white rounded-xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="My Custom Template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="A brief description of this template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Template Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, templateType: 'html' })}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.templateType === 'html'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">Copy/Paste HTML</div>
                    <div className="text-sm text-gray-600">Write or paste HTML code directly</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, templateType: 'canva' })}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.templateType === 'canva'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">Canva Editor</div>
                    <div className="text-sm text-gray-600">Use drag-and-drop Canva editor</div>
                  </button>
                </div>
              </div>

              {formData.templateType === 'html' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    HTML Content
                  </label>
                  <textarea
                    value={formData.htmlContent}
                    onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    rows={12}
                    placeholder="<div>Your HTML content here...</div>"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Use placeholders like {`{{dynamic-id}}`} in your HTML where dynamic content should appear
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Canva Design
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Canva Integration</h3>
                    <p className="text-gray-600 mb-4">
                      Open Canva editor to create your design with drag-and-drop features
                    </p>
                    <input
                      type="text"
                      value={formData.canvaDesignId}
                      onChange={(e) => setFormData({ ...formData, canvaDesignId: e.target.value })}
                      placeholder="Enter Canva Design ID"
                      className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg mb-4"
                    />
                    <button
                      type="button"
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                      onClick={() => {
                        window.open('https://www.canva.com/create/', '_blank');
                        toast('After creating your design in Canva, paste the Design ID above');
                      }}
                    >
                      <Code className="w-5 h-5" />
                      Open Canva Editor
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-900">
                    Dynamic Areas
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddDynamicArea('image')}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Add Image
                    </button>
                    <button
                      onClick={() => handleAddDynamicArea('text')}
                      className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm"
                    >
                      <Type className="w-4 h-4" />
                      Add Text
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.dynamicAreas.map((area) => (
                    <div key={area.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          area.type === 'image'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {area.type}
                        </span>
                        <button
                          onClick={() => handleRemoveDynamicArea(area.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            ID (use in HTML as {`{{${area.id}}}`})
                          </label>
                          <input
                            type="text"
                            value={area.id}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-sm font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Label
                          </label>
                          <input
                            type="text"
                            value={area.label}
                            onChange={(e) => handleUpdateDynamicArea(area.id, { label: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        {area.type === 'text' && (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Placeholder
                              </label>
                              <input
                                type="text"
                                value={area.placeholder || ''}
                                onChange={(e) => handleUpdateDynamicArea(area.id, { placeholder: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Default Value
                              </label>
                              <input
                                type="text"
                                value={area.defaultValue || ''}
                                onChange={(e) => handleUpdateDynamicArea(area.id, { defaultValue: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {formData.dynamicAreas.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No dynamic areas yet. Add images or text placeholders above.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-5 h-5" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Preview: {previewTemplate.name}</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">HTML Content</h3>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  {previewTemplate.htmlContent}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Dynamic Areas</h3>
                <div className="space-y-2">
                  {previewTemplate.dynamicAreas.map((area) => (
                    <div key={area.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          area.type === 'image'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {area.type}
                        </span>
                        <span className="font-medium text-sm">{area.label}</span>
                        <code className="text-xs bg-white px-2 py-1 rounded border">{`{{${area.id}}}`}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rendered Preview</h3>
                <div
                  className="border rounded-lg p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: previewTemplate.htmlContent }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
