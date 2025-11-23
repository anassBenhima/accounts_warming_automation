'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Users, UserCheck, UserX, Shield, User as UserIcon, Edit2, X, Lock } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    generations: number;
    bulkGenerations: number;
    apiKeys: number;
  };
}

interface Module {
  value: string;
  label: string;
}

interface Action {
  value: string;
  label: string;
}

interface Permission {
  id?: string;
  module: string;
  actions: string[];
  enabled: boolean;
}

export default function UsersManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });

  // Permissions management state
  const [managingPermissionsUser, setManagingPermissionsUser] = useState<User | null>(null);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [availableActions, setAvailableActions] = useState<Action[]>([]);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard');
        toast.error('Admin access required');
        return;
      }
      fetchUsers();
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setUpdating(userId);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user status');
    } finally {
      setUpdating(null);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    setUpdating(userId);
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, isActive: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user role');
      }

      toast.success(`User role updated to ${newRole}`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast.error(error.message || 'Failed to update user role');
    } finally {
      setUpdating(null);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email,
      password: ''
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({ name: '', email: '', password: '' });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(editingUser.id);
    try {
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
      };

      // Only include password if it's been filled in
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      toast.success('User updated successfully');
      await fetchUsers();
      closeEditModal();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setUpdating(null);
    }
  };

  const openPermissionsModal = async (user: User) => {
    if (user.role === 'ADMIN') {
      toast.error('Cannot modify permissions for admin users');
      return;
    }

    setManagingPermissionsUser(user);
    setLoadingPermissions(true);

    try {
      // Fetch available modules and actions
      const modulesResponse = await fetch('/api/permissions/modules');
      if (!modulesResponse.ok) throw new Error('Failed to fetch modules');
      const modulesData = await modulesResponse.json();
      setAvailableModules(modulesData.modules);
      setAvailableActions(modulesData.actions);

      // Fetch user's current permissions
      const permissionsResponse = await fetch(`/api/permissions?userId=${user.id}`);
      if (!permissionsResponse.ok) throw new Error('Failed to fetch user permissions');
      const permissionsData = await permissionsResponse.json();

      // Initialize permissions for all modules
      const initialPermissions: Permission[] = modulesData.modules.map((module: Module) => {
        const existingPerm = permissionsData.permissions.find((p: Permission) => p.module === module.value);
        return existingPerm || {
          module: module.value,
          actions: [],
          enabled: false,
        };
      });

      setUserPermissions(initialPermissions);
    } catch (error: any) {
      console.error('Error loading permissions:', error);
      toast.error(error.message || 'Failed to load permissions');
      setManagingPermissionsUser(null);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const closePermissionsModal = () => {
    setManagingPermissionsUser(null);
    setUserPermissions([]);
  };

  const toggleModulePermission = (moduleValue: string) => {
    setUserPermissions(prev => {
      const perm = prev.find(p => p.module === moduleValue);
      if (!perm) return prev;

      return prev.map(p =>
        p.module === moduleValue
          ? { ...p, enabled: !p.enabled, actions: !p.enabled ? availableActions.map(a => a.value) : [] }
          : p
      );
    });
  };

  const toggleModuleAction = (moduleValue: string, actionValue: string) => {
    setUserPermissions(prev => {
      return prev.map(p => {
        if (p.module === moduleValue) {
          const hasAction = p.actions.includes(actionValue);
          const newActions = hasAction
            ? p.actions.filter(a => a !== actionValue)
            : [...p.actions, actionValue];

          return {
            ...p,
            actions: newActions,
            enabled: newActions.length > 0,
          };
        }
        return p;
      });
    });
  };

  const savePermissions = async () => {
    if (!managingPermissionsUser) return;

    setSavingPermissions(true);
    try {
      // Only send permissions that are enabled
      const enabledPermissions = userPermissions.filter(p => p.enabled && p.actions.length > 0);

      const response = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: managingPermissionsUser.id,
          permissions: enabledPermissions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update permissions');
      }

      toast.success('Permissions updated successfully');
      closePermissionsModal();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error(error.message || 'Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        </div>
        <p className="text-gray-600">Manage user accounts and permissions</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className={!user.isActive ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleUserRole(user.id, user.role)}
                    disabled={updating === user.id || user.id === session?.user?.id}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    } ${updating !== user.id && user.id !== session?.user?.id ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    {user.role === 'ADMIN' ? (
                      <Shield className="w-3 h-3" />
                    ) : (
                      <UserIcon className="w-3 h-3" />
                    )}
                    {user.role}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? (
                      <>
                        <UserCheck className="w-3 h-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <UserX className="w-3 h-3" />
                        Inactive
                      </>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="space-y-1">
                    <div>{user._count.generations} generations</div>
                    <div>{user._count.bulkGenerations} bulk jobs</div>
                    <div>{user._count.apiKeys} API keys</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {user.role !== 'ADMIN' && (
                      <button
                        onClick={() => openPermissionsModal(user)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Manage permissions"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleUserStatus(user.id, user.isActive)}
                      disabled={updating === user.id || user.id === session?.user?.id}
                      className={`${
                        user.isActive
                          ? 'text-red-600 hover:text-red-900'
                          : 'text-green-600 hover:text-green-900'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {updating === user.id ? (
                        'Updating...'
                      ) : user.isActive ? (
                        'Deactivate'
                      ) : (
                        'Activate'
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeEditModal}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password (leave empty to keep current)
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password or leave empty"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={updating === editingUser.id}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating === editingUser.id ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 bg-gray-200 text-gray-900 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Permissions Modal */}
      {managingPermissionsUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closePermissionsModal}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Manage Permissions</h2>
                <p className="text-sm text-gray-600">
                  {managingPermissionsUser.name} ({managingPermissionsUser.email})
                </p>
              </div>
              <button
                onClick={closePermissionsModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingPermissions ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading permissions...</div>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {availableModules.map((module) => {
                    const permission = userPermissions.find(p => p.module === module.value);
                    if (!permission) return null;

                    return (
                      <div key={module.value} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={permission.enabled}
                              onChange={() => toggleModulePermission(module.value)}
                              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span className="font-medium text-gray-900">{module.label}</span>
                          </label>
                        </div>

                        {permission.enabled && (
                          <div className="ml-8 flex flex-wrap gap-3">
                            {availableActions.map((action) => (
                              <label
                                key={action.value}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={permission.actions.includes(action.value)}
                                  onChange={() => toggleModuleAction(module.value, action.value)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{action.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={savePermissions}
                    disabled={savingPermissions}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {savingPermissions ? 'Saving...' : 'Save Permissions'}
                  </button>
                  <button
                    onClick={closePermissionsModal}
                    disabled={savingPermissions}
                    className="flex-1 bg-gray-200 text-gray-900 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
