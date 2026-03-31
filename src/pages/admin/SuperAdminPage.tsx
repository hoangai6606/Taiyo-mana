import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import type { Workspace, Profile, UserRole } from '../../lib/database.types';
import { Users, Building2, Eye, Plus, Trash2, Edit2, X, Check, MessageCircle } from 'lucide-react';
import ChatDrawer from '../../components/ChatDrawer';

type Tab = 'workspaces' | 'users' | 'impersonate';

interface SuperAdminPageProps {
  onNavigate?: (page: 'dashboard' | 'inspection' | 'debit' | 'admin') => void;
}

export default function SuperAdminPage({ onNavigate }: SuperAdminPageProps) {
  const { switchWorkspace } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('workspaces');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  // Modal state
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  // Form states
  const [workspaceName, setWorkspaceName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'staff' | 'manager'>('staff');
  const [userWorkspaceId, setUserWorkspaceId] = useState('');

  // Chat drawer state
  const [chatDrawer, setChatDrawer] = useState<{ workspaceId: string; workspaceName: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'workspaces' || activeTab === 'impersonate') {
        const ws = await api.workspaces.list();
        setWorkspaces(ws);
      }
      if (activeTab === 'users') {
        const u = await api.admin.users.list();
        setUsers(u);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      await api.workspaces.create({
        name: workspaceName,
        managerEmail,
        managerPassword,
      });
      setShowCreateWorkspace(false);
      setWorkspaceName('');
      setManagerEmail('');
      setManagerPassword('');
      loadData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm('Delete this workspace?')) return;
    try {
      await api.workspaces.delete(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.admin.users.create({
        email: userEmail,
        password: userPassword,
        role: userRole,
        workspaceId: userWorkspaceId || undefined,
      });
      setShowCreateUser(false);
      setUserEmail('');
      setUserPassword('');
      setUserRole('staff');
      setUserWorkspaceId('');
      loadData();
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  const handleUpdateUser = async (id: string, data: Partial<Profile>) => {
    try {
      await api.admin.users.update(id, data);
      setEditingUser(null);
      loadData();
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.admin.users.delete(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const tabs = [
    { key: 'workspaces', label: 'Workspaces', icon: Building2 },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'impersonate', label: 'Impersonate', icon: Eye },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
        <p className="text-slate-500 text-sm mt-1">Manage workspaces and users</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Workspaces Tab */}
          {activeTab === 'workspaces' && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => { setCreateError(null); setShowCreateWorkspace(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Workspace
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Manager Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Chat</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workspaces.map(ws => (
                      <tr key={ws.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{ws.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{ws.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{ws.managerEmail}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{new Date(ws.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setChatDrawer({ workspaceId: ws.id, workspaceName: ws.name })}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                            title="Chat với workspace"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteWorkspace(ws.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {workspaces.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No workspaces found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Staff
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Workspace</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Active</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{u.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.email}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 capitalize">{u.role.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {u.workspace_id ? workspaces.find(ws => ws.id === u.workspace_id)?.name || u.workspace_id.slice(0, 8) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {editingUser?.id === u.id ? (
                            <select
                              value={editingUser.active ? 'true' : 'false'}
                              onChange={e => setEditingUser({ ...editingUser, active: e.target.value === 'true' })}
                              className="text-sm border border-slate-300 rounded px-2 py-1"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 text-xs rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {u.active ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {editingUser?.id === u.id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateUser(u.id, { active: editingUser.active })}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setEditingUser(u)}
                                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Impersonate Tab */}
          {activeTab === 'impersonate' && (
            <div>
              <p className="text-sm text-slate-500 mb-4">Select a workspace to view it as its manager</p>

              {impersonateError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
                  <span>{impersonateError}</span>
                  <button onClick={() => setImpersonateError(null)} className="text-red-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workspaces.map(ws => (
                  <div key={ws.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">{ws.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{ws.managerEmail}</p>
                      </div>
                      <button
                        onClick={async () => {
                          setImpersonateError(null);
                          setImpersonatingId(ws.id);
                          try {
                            await switchWorkspace(ws.id);
                            if (onNavigate) {
                              onNavigate('dashboard');
                            }
                          } catch (err) {
                            const msg = err instanceof Error ? err.message : 'Failed to impersonate workspace';
                            setImpersonateError(msg);
                          } finally {
                            setImpersonatingId(null);
                          }
                        }}
                        disabled={impersonatingId !== null}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Eye className="w-4 h-4" />
                        {impersonatingId === ws.id ? 'Entering...' : 'Enter'}
                      </button>
                    </div>
                  </div>
                ))}
                {workspaces.length === 0 && (
                  <p className="text-slate-500 col-span-full text-center py-8">No workspaces found</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateWorkspace(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Workspace</h2>
            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {createError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={e => setWorkspaceName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Enter workspace name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Manager Email</label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={e => setManagerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="manager@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Manager Password</label>
                <input
                  type="password"
                  value={managerPassword}
                  onChange={e => setManagerPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Enter password"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateWorkspace(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateUser(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Staff</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="staff@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={e => setUserPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={userRole}
                  onChange={e => setUserRole(e.target.value as 'staff' | 'manager')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Workspace (Optional)</label>
                <select
                  value={userWorkspaceId}
                  onChange={e => setUserWorkspaceId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">No workspace</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateUser(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Drawer */}
      {chatDrawer && (
        <ChatDrawer
          workspaceId={chatDrawer.workspaceId}
          workspaceName={chatDrawer.workspaceName}
          onClose={() => setChatDrawer(null)}
        />
      )}
    </div>
  );
}
