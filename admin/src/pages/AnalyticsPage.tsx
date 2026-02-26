import { useState, useEffect } from 'react';
import { TrendingUp, Users, Eye, MousePointer } from 'lucide-react';
import { adminApi, TrafficStat, SignupStat } from '../lib/api';
import { LineChart, BarChart, StatsCard } from '../components/ui/Charts';
import { Select } from '../components/ui/Input';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [traffic, setTraffic] = useState<TrafficStat[]>([]);
  const [signups, setSignups] = useState<SignupStat[]>([]);
  const [activeUsers, setActiveUsers] = useState<Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    lastLoginAt: string;
  }>>([]);
  const [activeUserCount, setActiveUserCount] = useState(0);

  // Filters
  const [trafficDays, setTrafficDays] = useState(7);
  const [signupDays, setSignupDays] = useState(30);
  const [activeDays, setActiveDays] = useState(7);

  useEffect(() => {
    loadAllData();
  }, [trafficDays, signupDays, activeDays]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [trafficData, signupData, activeData] = await Promise.all([
        adminApi.getTrafficStats(trafficDays),
        adminApi.getUserStats(signupDays),
        adminApi.getActiveUsers(activeDays),
      ]);

      setTraffic(trafficData);
      setSignups(signupData);
      setActiveUsers(activeData.activeUsers);
      setActiveUserCount(activeData.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const totalVisits = traffic.reduce((sum, t) => sum + t.visits, 0);
  const avgVisits = traffic.length > 0 ? Math.round(totalVisits / traffic.length) : 0;
  const totalSignups = signups.reduce((sum, s) => sum + s.signups, 0);
  const totalVipSignups = signups.reduce((sum, s) => sum + s.vipSignups, 0);

  // Chart data
  const trafficChartData = traffic.map((t) => ({
    label: new Date(t.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    value: t.visits,
  }));

  const uniqueVisitorsData = traffic.map((t) => ({
    label: new Date(t.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    value: t.uniqueVisitors,
  }));

  const signupChartData = signups.map((s) => ({
    label: new Date(s.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    value: s.signups,
  }));

  // Top paths
  const allPaths = traffic.flatMap((t) => t.topPaths);
  const pathCounts: Record<string, number> = {};
  allPaths.forEach((p) => {
    pathCounts[p.path] = (pathCounts[p.path] || 0) + p.count;
  });
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading analytics...</div>
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

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Visits"
          value={totalVisits}
          icon={<Eye size={24} />}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatsCard
          title="Avg Daily Visits"
          value={avgVisits}
          icon={<TrendingUp size={24} />}
          color="bg-green-500/20 text-green-400"
        />
        <StatsCard
          title="New Signups"
          value={totalSignups}
          icon={<Users size={24} />}
          color="bg-purple-500/20 text-purple-400"
        />
        <StatsCard
          title="Active Users"
          value={activeUserCount}
          icon={<MousePointer size={24} />}
          color="bg-amber-500/20 text-amber-400"
        />
      </div>

      {/* Traffic Chart */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Traffic Overview</h3>
          <Select
            value={trafficDays.toString()}
            onChange={(e) => setTrafficDays(parseInt(e.target.value))}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '14', label: 'Last 14 days' },
              { value: '30', label: 'Last 30 days' },
            ]}
          />
        </div>
        {trafficChartData.length > 0 ? (
          <div className="space-y-4">
            <div>
              <p className="text-zinc-400 text-sm mb-2">Page Visits</p>
              <LineChart data={trafficChartData} height={180} color="rgb(59, 130, 246)" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm mb-2">Unique Visitors</p>
              <LineChart data={uniqueVisitorsData} height={120} color="rgb(34, 197, 94)" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-zinc-500">
            No traffic data yet. Install analytics middleware to start tracking.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signup Chart */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">User Signups</h3>
            <Select
              value={signupDays.toString()}
              onChange={(e) => setSignupDays(parseInt(e.target.value))}
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '14', label: 'Last 14 days' },
                { value: '30', label: 'Last 30 days' },
              ]}
            />
          </div>
          {signupChartData.length > 0 ? (
            <BarChart data={signupChartData} height={200} />
          ) : (
            <div className="flex items-center justify-center h-[200px] text-zinc-500">
              No signup data yet
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total: {totalSignups} signups</span>
              <span className="text-amber-400">VIP: {totalVipSignups}</span>
            </div>
          </div>
        </div>

        {/* Top Paths */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Pages</h3>
          {topPaths.length > 0 ? (
            <div className="space-y-2">
              {topPaths.map(([path, count], index) => (
                <div key={path} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-sm w-6">{index + 1}.</span>
                    <span className="text-white text-sm truncate max-w-[200px]">{path}</span>
                  </div>
                  <span className="text-zinc-400 text-sm">{count.toLocaleString()} views</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-zinc-500">
              No page data yet
            </div>
          )}
        </div>
      </div>

      {/* Active Users */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recently Active Users</h3>
          <Select
            value={activeDays.toString()}
            onChange={(e) => setActiveDays(parseInt(e.target.value))}
            options={[
              { value: '1', label: 'Last 24 hours' },
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
            ]}
          />
        </div>
        {activeUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800">
                <tr>
                  <th className="text-left px-4 py-2 text-zinc-400 text-sm">User</th>
                  <th className="text-left px-4 py-2 text-zinc-400 text-sm">Email</th>
                  <th className="text-left px-4 py-2 text-zinc-400 text-sm">Role</th>
                  <th className="text-left px-4 py-2 text-zinc-400 text-sm">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.slice(0, 10).map((user) => (
                  <tr key={user.id} className="border-t border-zinc-800">
                    <td className="px-4 py-2 text-white">{user.username}</td>
                    <td className="px-4 py-2 text-zinc-400">{user.email}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' :
                        user.role === 'VIP' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-400 text-sm">
                      {new Date(user.lastLoginAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-zinc-500">
            No active users in this period
          </div>
        )}
      </div>
    </div>
  );
}
