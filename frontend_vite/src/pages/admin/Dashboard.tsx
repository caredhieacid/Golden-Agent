import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, CreditCard, TrendingUp, Activity, UserCheck, Crown } from 'lucide-react';

interface OverviewStats {
  users: {
    total: number;
    active: number;
    vip: number;
    admins: number;
    todaySignups: number;
    todayLogins: number;
  };
  payments: {
    total: number;
    completed: number;
    totalRevenue: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/admin/stats/overview', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      title: '总用户数',
      value: stats?.users.total || 0,
      description: `今日新增: ${stats?.users.todaySignups || 0}`,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: '活跃用户',
      value: stats?.users.active || 0,
      description: `今日登录: ${stats?.users.todayLogins || 0}`,
      icon: UserCheck,
      color: 'text-green-500',
    },
    {
      title: 'VIP会员',
      value: stats?.users.vip || 0,
      description: `管理员: ${stats?.users.admins || 0}`,
      icon: Crown,
      color: 'text-yellow-500',
    },
    {
      title: '总收入',
      value: `¥${((stats?.payments.totalRevenue || 0) / 100).toFixed(2)}`,
      description: `已完成: ${stats?.payments.completed || 0} 笔`,
      icon: CreditCard,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">管理后台</h1>
        <p className="text-muted-foreground">欢迎回来，查看平台运营数据</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              用户管理
            </CardTitle>
            <CardDescription>查看和管理平台用户</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/admin/users"
              className="text-primary hover:underline"
            >
              查看用户列表 →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              流量分析
            </CardTitle>
            <CardDescription>查看网站访问数据</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/admin/analytics"
              className="text-primary hover:underline"
            >
              查看流量统计 →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              支付管理
            </CardTitle>
            <CardDescription>查看和管理支付订单</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/admin/payments"
              className="text-primary hover:underline"
            >
              查看支付列表 →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              快速操作
            </CardTitle>
            <CardDescription>常用管理功能</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • 修改用户角色和状态
            </p>
            <p className="text-sm text-muted-foreground">
              • 处理支付订单
            </p>
            <p className="text-sm text-muted-foreground">
              • 查看系统日志
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
