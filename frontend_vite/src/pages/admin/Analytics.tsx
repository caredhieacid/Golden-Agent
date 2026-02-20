import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Eye, Users, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface TrafficData {
  date: string;
  visits: number;
  uniqueVisitors: number;
  topPaths: { path: string; count: number }[];
}

interface UserStatsData {
  date: string;
  signups: number;
  vipSignups: number;
}

interface TrafficResponse {
  traffic: TrafficData[];
}

interface UserStatsResponse {
  signups: UserStatsData[];
}

export default function AdminAnalytics() {
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [userStatsData, setUserStatsData] = useState<UserStatsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('7');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const [trafficRes, userStatsRes] = await Promise.all([
          fetch(`/api/admin/stats/traffic?days=${days}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/admin/stats/users?days=${days}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (trafficRes.ok) {
          const data: TrafficResponse = await trafficRes.json();
          setTrafficData(data.traffic);
        }

        if (userStatsRes.ok) {
          const data: UserStatsResponse = await userStatsRes.json();
          setUserStatsData(data.signups);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [days]);

  const totalVisits = trafficData.reduce((sum, d) => sum + d.visits, 0);
  const totalUniqueVisitors = trafficData.reduce(
    (sum, d) => sum + d.uniqueVisitors,
    0
  );
  const totalSignups = userStatsData.reduce((sum, d) => sum + d.signups, 0);

  const topPaths = trafficData
    .flatMap((d) => d.topPaths)
    .reduce((acc, { path, count }) => {
      acc[path] = (acc[path] || 0) + count;
      return acc;
    }, {} as Record<string, number>);

  const sortedTopPaths = Object.entries(topPaths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">流量分析</h1>
          <p className="text-muted-foreground">查看网站访问数据</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="时间范围" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">最近7天</SelectItem>
            <SelectItem value="14">最近14天</SelectItem>
            <SelectItem value="30">最近30天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总访问量</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVisits.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  过去 {days} 天
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">独立访客</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUniqueVisitors.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  过去 {days} 天
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">新注册</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSignups}</div>
                <p className="text-xs text-muted-foreground">
                  过去 {days} 天
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>访问趋势</CardTitle>
                <CardDescription>每日访问量和独立访客数</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trafficData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => value.slice(5)}
                      />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="visits"
                        stroke="#8884d8"
                        name="访问量"
                      />
                      <Line
                        type="monotone"
                        dataKey="uniqueVisitors"
                        stroke="#82ca9d"
                        name="独立访客"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>注册趋势</CardTitle>
                <CardDescription>每日新用户注册数</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userStatsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => value.slice(5)}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="signups" fill="#8884d8" name="注册数" />
                      <Bar dataKey="vipSignups" fill="#82ca9d" name="VIP注册" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>热门页面</CardTitle>
              <CardDescription>访问量最高的页面</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedTopPaths.map(([path, count], index) => (
                  <div
                    key={path}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {index + 1}
                      </span>
                      <code className="text-sm">{path}</code>
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
