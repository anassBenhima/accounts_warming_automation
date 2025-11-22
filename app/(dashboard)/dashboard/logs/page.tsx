'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import Pagination from '@/components/Pagination';

interface SystemLog {
  id: string;
  level: string;
  module: string;
  action: string;
  message: string;
  resourceType: string | null;
  resourceId: string | null;
  input: string | null;
  output: string | null;
  error: string | null;
  duration: number | null;
  createdAt: string;
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    level: '',
    module: '',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchLogs();
  }, [filter, currentPage]);

  useEffect(() => {
    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      fetchLogs();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [filter, currentPage]);

  const fetchLogs = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (filter.level) params.append('level', filter.level);
      if (filter.module) params.append('module', filter.module);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const response = await fetch(`/api/logs?${params.toString()}`);
      const data = await response.json();
      setLogs(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
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

  const toggleExpand = (id: string) => {
    setExpandedLog(expandedLog === id ? null : id);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (newFilter: { level: string; module: string }) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filter changes
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
          <p className="text-gray-600 mt-1">
            Monitor system events, errors, and API calls
          </p>
        </div>
        <button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={filter.level}
            onChange={(e) => handleFilterChange({ ...filter, level: e.target.value })}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
          >
            <option value="">All Levels</option>
            <option value="SUCCESS">Success</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
          </select>
          <select
            value={filter.module}
            onChange={(e) => handleFilterChange({ ...filter, module: e.target.value })}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
          >
            <option value="">All Modules</option>
            <option value="AUTH">Authentication</option>
            <option value="API_KEY">API Keys</option>
            <option value="TEMPLATE">Templates</option>
            <option value="PROMPT">Prompts</option>
            <option value="GENERATION">Generation</option>
            <option value="IMAGE_PROCESSING">Image Processing</option>
            <option value="API_CALL">API Calls</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No logs found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all"
            >
              <div
                onClick={() => toggleExpand(log.id)}
                className="p-4 cursor-pointer flex items-start justify-between"
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
                    {log.duration && (
                      <span className="text-xs text-gray-500">
                        {log.duration}ms
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {log.action}
                    </span>
                    {log.resourceType && (
                      <span className="text-sm text-gray-600">
                        ({log.resourceType})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{log.message}</p>
                </div>
                {expandedLog === log.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {expandedLog === log.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-200">
                  {log.input && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1 mt-3">
                        Input:
                      </h4>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto text-gray-900">
                        {log.input}
                      </pre>
                    </div>
                  )}
                  {log.output && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">
                        Output:
                      </h4>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto text-gray-900">
                        {log.output}
                      </pre>
                    </div>
                  )}
                  {log.error && (
                    <div>
                      <h4 className="text-xs font-semibold text-red-700 mb-1">
                        Error:
                      </h4>
                      <pre className="bg-red-50 p-3 rounded text-xs overflow-x-auto text-red-800">
                        {log.error}
                      </pre>
                    </div>
                  )}
                  {log.resourceId && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">
                        Resource ID:
                      </h4>
                      <code className="bg-gray-50 px-2 py-1 rounded text-xs">
                        {log.resourceId}
                      </code>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {logs.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          className="mt-6"
        />
      )}
    </div>
  );
}
