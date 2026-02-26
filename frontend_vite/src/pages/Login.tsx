import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Captcha, useCaptcha } from '@/components/auth/Captcha';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const loginSchema = z.object({
  login: z.string().min(1, '请输入邮箱或用户名'),
  password: z.string().min(1, '请输入密码'),
  captcha: z.string().min(1, '请输入验证码'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { captchaId, svg, refresh: refreshCaptcha } = useCaptcha();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const captchaValue = watch('captcha');

  const onSubmit = async (data: LoginFormData) => {
    if (!captchaId) {
      toast.error('请先获取验证码');
      return;
    }

    setLoading(true);
    try {
      const result = await login(data.login, data.password, captchaId, data.captcha);

      if (!result.success) {
        refreshCaptcha();
        setValue('captcha', '');
        throw new Error(result.error || '登录失败');
      }

      toast.success('登录成功');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">登录</CardTitle>
          <CardDescription>输入您的账号信息登录天枢</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">邮箱 / 用户名</Label>
              <Input
                id="login"
                type="text"
                placeholder="请输入邮箱或用户名"
                {...register('login')}
                disabled={loading}
              />
              {errors.login && (
                <p className="text-sm text-destructive">{errors.login.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                {...register('password')}
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>验证码</Label>
              <Captcha
                captchaId={captchaId}
                svg={svg}
                onRefresh={refreshCaptcha}
                value={captchaValue || ''}
                onChange={(value) => setValue('captcha', value)}
                disabled={loading}
              />
              {errors.captcha && (
                <p className="text-sm text-destructive">{errors.captcha.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="text-primary hover:underline">
                忘记密码？
              </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              登录
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              还没有账号？{' '}
              <Link to="/register" className="text-primary hover:underline">
                立即注册
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
