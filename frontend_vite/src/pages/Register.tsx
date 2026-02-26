import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, UserPlus, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  username: z
    .string()
    .min(3, '用户名至少3个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z
    .string()
    .min(8, '密码至少8个字符')
    .regex(/[a-z]/, '密码需要包含小写字母')
    .regex(/[A-Z]/, '密码需要包含大写字母')
    .regex(/\d/, '密码需要包含数字'),
  confirmPassword: z.string(),
  emailCode: z.string().length(6, '请输入6位验证码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { register: registerUser, sendEmailCode } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const email = watch('email');

  // Send email verification code
  const handleSendCode = async () => {
    if (!email) {
      toast.error('请先输入邮箱地址');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    setSendingCode(true);
    try {
      const result = await sendEmailCode(email, 'register');
      if (!result.success) {
        throw new Error(result.error || '发送失败');
      }
      toast.success('验证码已发送，请查收邮件');

      // Start 60s countdown
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败');
    } finally {
      setSendingCode(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const result = await registerUser(data.email, data.username, data.password, data.emailCode);

      if (!result.success) {
        throw new Error(result.error || '注册失败');
      }

      toast.success('注册成功！请登录');
      navigate('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">注册</CardTitle>
          <CardDescription>创建您的天枢账号</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入邮箱地址"
                  {...register('email')}
                  disabled={loading || sendingCode}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={loading || sendingCode || countdown > 0}
                  className="shrink-0"
                >
                  {sendingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : countdown > 0 ? (
                    `${countdown}s`
                  ) : (
                    <>
                      <Mail className="mr-1 h-4 w-4" />
                      发送验证码
                    </>
                  )}
                </Button>
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailCode">邮箱验证码</Label>
              <Input
                id="emailCode"
                type="text"
                placeholder="请输入6位邮箱验证码"
                maxLength={6}
                {...register('emailCode')}
                disabled={loading}
              />
              {errors.emailCode && (
                <p className="text-sm text-destructive">{errors.emailCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名（3-20个字符）"
                {...register('username')}
                disabled={loading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码（至少8位，含大小写字母和数字）"
                {...register('password')}
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                {...register('confirmPassword')}
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              注册
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              已有账号？{' '}
              <Link to="/login" className="text-primary hover:underline">
                立即登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
