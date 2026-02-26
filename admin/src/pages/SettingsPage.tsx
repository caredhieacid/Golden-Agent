import { useState, useEffect } from 'react';
import { Save, Key, Database, Bell, Shield } from 'lucide-react';
import { Input, Button, Select } from '../components/ui/Input';
import { authApi } from '../lib/api';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  nickname?: string;
  role: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forms
  const [nickname, setNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // System settings (mock - these would come from backend in real app)
  const [systemSettings, setSystemSettings] = useState({
    siteName: '天枢',
    siteDescription: '全球投资情报平台',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    defaultUserRole: 'USER',
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await authApi.getMe();
      setUser(userData);
      setNickname(userData.nickname || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await authApi.updateProfile(nickname);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystemSettings = () => {
    // In a real app, this would call an API
    setSuccess('System settings saved (demo only)');
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Database size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
          </div>

          {user && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Username</label>
                <input
                  type="text"
                  value={user.username}
                  disabled
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Role</label>
                <span className="inline-block px-3 py-1 rounded bg-red-500/20 text-red-400 text-sm">
                  {user.role}
                </span>
              </div>
              <Button onClick={handleUpdateProfile} loading={saving}>
                <Save size={16} className="mr-2" />
                Save Profile
              </Button>
            </div>
          )}
        </div>

        {/* Password Change */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Key size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">Change Password</h3>
          </div>

          <div className="space-y-4">
            <Input
              type="password"
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
            <Input
              type="password"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <Input
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
            <Button onClick={handleChangePassword} loading={saving}>
              <Key size={16} className="mr-2" />
              Change Password
            </Button>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
            <Shield size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">System Settings</h3>
          <span className="text-xs text-zinc-500 ml-auto">(Demo - not persisted)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Site Name"
              value={systemSettings.siteName}
              onChange={(e) => setSystemSettings({ ...systemSettings, siteName: e.target.value })}
            />
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Site Description</label>
              <textarea
                value={systemSettings.siteDescription}
                onChange={(e) => setSystemSettings({ ...systemSettings, siteDescription: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-primary resize-none"
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-white">Maintenance Mode</p>
                <p className="text-zinc-500 text-sm">Temporarily disable the site</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.maintenanceMode}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-white">Allow Registration</p>
                <p className="text-zinc-500 text-sm">Enable new user registration</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.allowRegistration}
                  onChange={(e) => setSystemSettings({ ...systemSettings, allowRegistration: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-white">Require Email Verification</p>
                <p className="text-zinc-500 text-sm">Users must verify email before access</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.requireEmailVerification}
                  onChange={(e) => setSystemSettings({ ...systemSettings, requireEmailVerification: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <Select
              label="Default User Role"
              value={systemSettings.defaultUserRole}
              onChange={(e) => setSystemSettings({ ...systemSettings, defaultUserRole: e.target.value })}
              options={[
                { value: 'USER', label: 'User' },
                { value: 'VIP', label: 'VIP' },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <Button onClick={handleSaveSystemSettings}>
            <Save size={16} className="mr-2" />
            Save System Settings
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card rounded-xl p-6 border border-red-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
            <Bell size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
        </div>

        <p className="text-zinc-400 mb-4">
          These actions are irreversible. Please be careful.
        </p>

        <div className="flex flex-wrap gap-4">
          <Button variant="danger" onClick={() => alert('This would clear all analytics data')}>
            Clear Analytics Data
          </Button>
          <Button variant="danger" onClick={() => alert('This would reset all settings')}>
            Reset All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
