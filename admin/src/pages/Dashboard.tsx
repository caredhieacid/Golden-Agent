import { useState, useEffect } from 'react';
import { Users, Activity, DollarSign, Database, UserPlus, LogIn } from 'lucide-react';
import { adminApi, OverviewStats, TrafficStat, SignupStat } from '../lib/api';
import { StatsCard, BarChart, LineChart } from '../components/ui/Charts';

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [traffic, setTraffic] = useState<TrafficStat[]>([]);
  const [signups, setSignups] = useState<SignupStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [overviewData, trafficData, signupData] = await Promise.all([
          adminApi.getOverviewStats(),
          adminApi.getTrafficStats(7),
          adminApi.getUserStats(14),
        ]);
        setStats(overviewData);
        setTraffic(trafficData);
        setSignups(signupData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-xl p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare chart data
  const trafficChartData = traffic.slice(-7).map((t) => ({
    label: new Date(t.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    value: t.visits,
  }));

  const signupChartData = signups.slice(-14).map((s) => ({
    label: new Date(s.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    value: s.signups,
  }));


  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats.users.total}
          icon={<Users size={24} />}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatsCard
          title="Active Users"
          value={stats.users.active}
          icon={<Activity size={24} />}
          color="bg-green-500/20 text-green-400"
        />
        <StatsCard
          title="VIP Users"
          value={stats.users.vip}
          icon={<DollarSign size={24} />}
          color="bg-amber-500/20 text-amber-400"
        />
        <StatsCard
          title="Total Revenue"
          value={`¥${stats.payments.totalRevenue.toLocaleString()}`}
          icon={<Database size={24} />}
          color="bg-purple-500/20 text-purple-400"
        />
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Today's Signups</h3>
              <p className="text-2xl font-bold text-green-400">{stats.users.todaySignups}</p>
            </div>
          </div>
          <p className="text-zinc-400 text-sm">New users registered today</p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <LogIn size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Today's Logins</h3>
              <p className="text-2xl font-bold text-blue-400">{stats.users.todayLogins}</p>
            </div>
          </div>
          <p className="text-zinc-400 text-sm">Users who logged in today</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Chart */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Traffic (Last 7 Days)</h3>
          {trafficChartData.length > 0 ? (
            <LineChart data={trafficChartData} height={200} color="rgb(59, 130, 246)" />
          ) : (
            <div className="flex items-center justify-center h-[200px] text-zinc-500">
              No traffic data yet
            </div>
          )}
        </div>

        {/* Signups Chart */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Signups (Last 14 Days)</h3>
          {signupChartData.length > 0 ? (
            <BarChart data={signupChartData} height={200} />
          ) : (
            <div className="flex items-center justify-center h-[200px] text-zinc-500">
              No signup data yet
            </div>
          )}
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Status Overview</h3>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.payments.total}</p>
              <p className="text-zinc-400 text-sm">Total Payments</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-zinc-300">Completed: {stats.payments.completed}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded bg-amber-500" />
            <span className="text-zinc-300">Pending: {stats.payments.total - stats.payments.completed}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-purple-400">{stats.users.admins}</p>
            <p className="text-zinc-400 text-sm">Administrators</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{stats.users.active}</p>
            <p className="text-zinc-400 text-sm">Active Users</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{stats.payments.completed}</p>
            <p className="text-zinc-400 text-sm">Completed Payments</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">¥{stats.payments.totalRevenue.toLocaleString()}</p>
            <p className="text-zinc-400 text-sm">Total Revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
