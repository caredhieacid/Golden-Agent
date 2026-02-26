import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, User, Save, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const profileSchema = z.object({
  nickname: z.string().max(50, '昵称最多50个字符').optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z
    .string()
    .min(8, '密码至少8个字符')
    .regex(/[a-z]/, '密码需要包含小写字母')
    .regex(/[A-Z]/, '密码需要包含大写字母')
    .regex(/\d/, '密码需要包含数字'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: errorsProfile },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nickname: user?.nickname || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: errorsPassword },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const handleProfileSubmit = async (data: ProfileFormData) => {
    setLoadingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '更新失败');
      }

      toast.success('资料更新成功');
      // Refresh user data
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    setLoadingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.errors?.join(', ') || '修改失败');
      }

      toast.success('密码修改成功，请重新登录');
      logout();
      navigate('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '修改失败');
    } finally {
      setLoadingPassword(false);
      resetPassword();
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate('/');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-xl">{user.nickname || user.username}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {user.role === 'ADMIN' ? '管理员' : user.role === 'VIP' ? 'VIP会员' : '普通用户'}
                </span>
                {user.emailVerified && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                    已验证
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            个人资料
          </CardTitle>
          <CardDescription>更新您的个人信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitProfile(handleProfileSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">昵称</Label>
              <Input
                id="nickname"
                placeholder="请输入昵称"
                {...registerProfile('nickname')}
                disabled={loadingProfile}
              />
              {errorsProfile.nickname && (
                <p className="text-sm text-destructive">{errorsProfile.nickname.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>用户名</Label>
              <Input value={user.username} disabled />
              <p className="text-xs text-muted-foreground">用户名不可修改</p>
            </div>

            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input value={user.email} disabled />
              <p className="text-xs text-muted-foreground">邮箱不可修改</p>
            </div>

            <Button type="submit" disabled={loadingProfile}>
              {loadingProfile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              保存修改
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            修改密码
          </CardTitle>
          <CardDescription>定期修改密码可以提高账号安全性</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitPassword(handlePasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">当前密码</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="请输入当前密码"
                {...registerPassword('currentPassword')}
                disabled={loadingPassword}
              />
              {errorsPassword.currentPassword && (
                <p className="text-sm text-destructive">{errorsPassword.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="请输入新密码（至少8位，含大小写字母和数字）"
                {...registerPassword('newPassword')}
                disabled={loadingPassword}
              />
              {errorsPassword.newPassword && (
                <p className="text-sm text-destructive">{errorsPassword.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                {...registerPassword('confirmPassword')}
                disabled={loadingPassword}
              />
              {errorsPassword.confirmPassword && (
                <p className="text-sm text-destructive">{errorsPassword.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loadingPassword}>
              {loadingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              修改密码
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent className="pt-6">
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            退出登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
