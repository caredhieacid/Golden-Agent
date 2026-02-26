import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit2, Trash2, Eye } from 'lucide-react';
import { adminApi, User } from '../lib/api';
import { Input, Select, Button } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({ role: '', status: '', nickname: '' });
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getUsers({
        page,
        limit,
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle search with debounce
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openDetailModal = async (user: User) => {
    try {
      const fullUser = await adminApi.getUser(user.id);
      setSelectedUser(fullUser as any);
      setShowDetailModal(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role,
      status: user.status,
      nickname: user.nickname || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await adminApi.updateUser(selectedUser.id, editForm);
      setShowEditModal(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await adminApi.deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'bg-red-500/20 text-red-400',
      VIP: 'bg-amber-500/20 text-amber-400',
      USER: 'bg-zinc-500/20 text-zinc-400',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[role] || styles.USER}`}>
        {role}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-500/20 text-green-400',
      INACTIVE: 'bg-zinc-500/20 text-zinc-400',
      BANNED: 'bg-red-500/20 text-red-400',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[status] || styles.INACTIVE}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Search by email, username..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'USER', label: 'User' },
              { value: 'VIP', label: 'VIP' },
              { value: 'ADMIN', label: 'Admin' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'BANNED', label: 'Banned' },
            ]}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">User</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">Email</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">Role</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">Status</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">Last Login</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-sm">Created</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-400">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.username}</p>
                          {user.nickname && (
                            <p className="text-zinc-500 text-sm">{user.nickname}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{user.email}</td>
                    <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                    <td className="px-4 py-3">{getStatusBadge(user.status)}</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailModal(user)}
                          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
          <p className="text-zinc-400 text-sm">
            Showing {users.length} of {total} users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-zinc-400 text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                {selectedUser.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedUser.username}</h3>
                <p className="text-zinc-400">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Role</p>
                <p className="text-white font-medium">{selectedUser.role}</p>
              </div>
              <div className="glass-card rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Status</p>
                <p className="text-white font-medium">{selectedUser.status}</p>
              </div>
              <div className="glass-card rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Email Verified</p>
                <p className="text-white font-medium">
                  {selectedUser.emailVerified ? (
                    <span className="text-green-400">Yes</span>
                  ) : (
                    <span className="text-red-400">No</span>
                  )}
                </p>
              </div>
              <div className="glass-card rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Created</p>
                <p className="text-white font-medium">
                  {new Date(selectedUser.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {(selectedUser as any)._count && (
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Activity Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-400">
                      {(selectedUser as any)._count.sessions || 0}
                    </p>
                    <p className="text-zinc-400 text-sm">Sessions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">
                      {(selectedUser as any)._count.payments || 0}
                    </p>
                    <p className="text-zinc-400 text-sm">Payments</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">
                      {(selectedUser as any)._count.analytics || 0}
                    </p>
                    <p className="text-zinc-400 text-sm">Page Views</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
      >
        <div className="space-y-4">
          <Input
            label="Nickname"
            value={editForm.nickname}
            onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
            placeholder="Enter nickname"
          />
          <Select
            label="Role"
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            options={[
              { value: 'USER', label: 'User' },
              { value: 'VIP', label: 'VIP' },
              { value: 'ADMIN', label: 'Admin' },
            ]}
          />
          <Select
            label="Status"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'BANNED', label: 'Banned' },
            ]}
          />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-zinc-300">
            Are you sure you want to delete <span className="text-white font-medium">{selectedUser?.username}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={saving}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
