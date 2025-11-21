'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Eye, Trash2, Loader2, RefreshCw, Users } from 'lucide-react';
import UserFilter from '@/components/UserFilter';
import ShareGenerationModal from '@/components/ShareGenerationModal';

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
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function BulkHistoryPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bulkGenerations, setBulkGenerations] = useState<BulkGeneration[]>([]);
  const [filteredBulkGenerations, setFilteredBulkGenerations] = useState<BulkGeneration[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareBulkGeneration, setShareBulkGeneration] = useState<BulkGeneration | null>(null);

  const isAdmin = session?.user?.role === 'ADMIN';

  const handleFilterChange = (userId: string | null) => {
    if (!userId) {
      setFilteredBulkGenerations(bulkGenerations);
    } else {
      setFilteredBulkGenerations(bulkGenerations.filter((bulkGen) => bulkGen.user?.id === userId));
    }
  };

  useEffect(() => {
    fetchBulkGenerations();
  }, []);

  const fetchBulkGenerations = async () => {
    try {
      const response = await fetch('/api/bulk-generations');
      if (response.ok) {
        const data = await response.json();
        setBulkGenerations(data);
        setFilteredBulkGenerations(data);
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

  const handleDelete = async (id: string, name: string) => {
    // Custom confirmation using toast
    const confirmToast = toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="font-medium text-gray-900">Delete Bulk Generation?</p>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete "{name}"? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                toast.dismiss(t.id);
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
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
                    fetchBulkGenerations();
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
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bulk Generation History</h1>
          <p className="text-sm md:text-base text-gray-900 mt-2">View and manage your bulk generations</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <button
            onClick={fetchBulkGenerations}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900 text-sm md:text-base w-full md:w-auto"
          >
            <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
            Refresh
          </button>
          <button
            onClick={() => router.push('/dashboard/bulk-generation')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base w-full md:w-auto"
          >
            New Bulk Generation
          </button>
        </div>
      </div>

      <UserFilter onFilterChange={handleFilterChange} />

      {filteredBulkGenerations.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-sm md:text-base text-gray-900 mb-4">
            {bulkGenerations.length === 0
              ? "No bulk generations yet"
              : "No bulk generations found for the selected filter"}
          </p>
          {bulkGenerations.length === 0 && (
            <button
              onClick={() => router.push('/dashboard/bulk-generation')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base"
            >
              Create Your First Bulk Generation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBulkGenerations.map((bulkGen) => (
            <div
              key={bulkGen.id}
              className="border rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">{bulkGen.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium ${getStatusColor(
                        bulkGen.status
                      )}`}
                    >
                      {bulkGen.status}
                    </span>
                    {bulkGen.status === 'PROCESSING' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                  </div>
                  {bulkGen.user && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {bulkGen.user.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                          {bulkGen.user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {bulkGen.user.email}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs md:text-sm text-gray-500">
                    Created {format(new Date(bulkGen.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/bulk-history/${bulkGen.id}`)}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900 text-sm md:text-base w-full md:w-auto"
                  >
                    <Eye className="w-4 h-4 md:w-5 md:h-5" />
                    View Details
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setShareBulkGeneration(bulkGen);
                        setShowShareModal(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 text-sm md:text-base w-full md:w-auto"
                      title="Share with team"
                    >
                      <Users className="w-4 h-4 md:w-5 md:h-5" />
                      Share
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(bulkGen.id, bulkGen.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg w-full md:w-auto"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                  <p className="text-xs md:text-sm text-gray-900 mb-1">Total Rows</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{bulkGen.totalRows}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-3 md:p-4">
                  <p className="text-xs md:text-sm text-gray-900 mb-1">Completed Rows</p>
                  <p className="text-xl md:text-2xl font-bold text-green-700">
                    {bulkGen.completedRows}
                  </p>
                </div>

                <div className="bg-red-50 rounded-lg p-3 md:p-4">
                  <p className="text-xs md:text-sm text-gray-900 mb-1">Failed Rows</p>
                  <p className="text-xl md:text-2xl font-bold text-red-700">
                    {bulkGen.failedRows}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 md:p-4">
                  <p className="text-xs md:text-sm text-gray-900 mb-1">Total Pins</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-700">
                    {getTotalPins(bulkGen)}
                  </p>
                </div>
              </div>

              {bulkGen.status === 'PROCESSING' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs md:text-sm text-gray-900 mb-2">
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

      {/* Share Bulk Generation Modal */}
      {shareBulkGeneration && (
        <ShareGenerationModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setShareBulkGeneration(null);
          }}
          generationId={shareBulkGeneration.id}
          generationType="bulk"
          generationName={shareBulkGeneration.name}
        />
      )}
    </div>
  );
}
