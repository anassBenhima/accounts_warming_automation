'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Eye, Trash2, Loader2, RefreshCw } from 'lucide-react';

interface BulkGeneration {
  id: string;
  name: string;
  status: string;
  totalRows: number;
  completedRows: number;
  failedRows: number;
  createdAt: string;
  updatedAt: string;
  rows: Array<{
    id: string;
    status: string;
    _count: {
      generatedPins: number;
    };
  }>;
}

export default function BulkHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bulkGenerations, setBulkGenerations] = useState<BulkGeneration[]>([]);

  useEffect(() => {
    fetchBulkGenerations();
  }, []);

  const fetchBulkGenerations = async () => {
    try {
      const response = await fetch('/api/bulk-generations');
      if (response.ok) {
        const data = await response.json();
        setBulkGenerations(data);
      } else {
        toast.error('Failed to fetch bulk generations');
      }
    } catch (error) {
      console.error('Error fetching bulk generations:', error);
      toast.error('Failed to fetch bulk generations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bulk generation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/bulk-generations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Bulk generation deleted');
        fetchBulkGenerations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting bulk generation:', error);
      toast.error('Failed to delete');
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

  const getTotalPins = (bulkGen: BulkGeneration) => {
    return bulkGen.rows.reduce((sum, row) => sum + row._count.generatedPins, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Bulk Generation History</h1>
          <p className="text-gray-600 mt-2">View and manage your bulk generations</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={fetchBulkGenerations}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => router.push('/dashboard/bulk-generation')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New Bulk Generation
          </button>
        </div>
      </div>

      {bulkGenerations.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">No bulk generations yet</p>
          <button
            onClick={() => router.push('/dashboard/bulk-generation')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Bulk Generation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bulkGenerations.map((bulkGen) => (
            <div
              key={bulkGen.id}
              className="border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{bulkGen.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        bulkGen.status
                      )}`}
                    >
                      {bulkGen.status}
                    </span>
                    {bulkGen.status === 'PROCESSING' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Created {format(new Date(bulkGen.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/bulk-history/${bulkGen.id}`)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  <button
                    onClick={() => handleDelete(bulkGen.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Rows</p>
                  <p className="text-2xl font-bold">{bulkGen.totalRows}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Completed Rows</p>
                  <p className="text-2xl font-bold text-green-700">
                    {bulkGen.completedRows}
                  </p>
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Failed Rows</p>
                  <p className="text-2xl font-bold text-red-700">
                    {bulkGen.failedRows}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Pins</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {getTotalPins(bulkGen)}
                  </p>
                </div>
              </div>

              {bulkGen.status === 'PROCESSING' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>
                      {bulkGen.completedRows} / {bulkGen.totalRows} rows
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(bulkGen.completedRows / bulkGen.totalRows) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
