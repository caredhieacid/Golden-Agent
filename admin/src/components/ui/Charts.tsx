import { useMemo } from 'react';

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  showValues?: boolean;
}

export function BarChart({ data, height = 200, showValues = true }: BarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1 gap-1">
            {showValues && (
              <span className="text-xs text-zinc-400">{item.value.toLocaleString()}</span>
            )}
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${(item.value / maxValue) * (height - 40)}px`,
                backgroundColor: item.color || 'rgb(139, 92, 246)',
                minHeight: '4px',
              }}
            />
            <span className="text-xs text-zinc-500 truncate max-w-full">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  showDots?: boolean;
}

export function LineChart({ data, height = 200, color = 'rgb(139, 92, 246)', showDots = true }: LineChartProps) {
  const { points, maxValue, minValue } = useMemo(() => {
    if (data.length === 0) return { points: '', maxValue: 1, minValue: 0 };

    const values = data.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const padding = range * 0.1;

    const maxVal = max + padding;
    const minVal = Math.max(0, min - padding);

    const pts = data
      .map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.value - minVal) / (maxVal - minVal)) * 100;
        return `${x},${y}`;
      })
      .join(' ');

    return { points: pts, maxValue: maxVal, minValue: minVal };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ height }}>
        No data
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

        {/* Area fill */}
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={color}
          fillOpacity="0.1"
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {/* Dots */}
        {showDots && data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100;
          const range = maxValue - minValue || 1;
          const y = 100 - ((d.value - minValue) / range) * 100;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill={color}
              className="hover:r-4 transition-all"
            />
          );
        })}
      </svg>
    </div>
  );
}

interface PieChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
}

export function PieChart({ data, size = 120 }: PieChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const pathData = useMemo(() => {
    let currentAngle = -90;
    return data.map((item) => {
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
      const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
      const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
      const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

      const largeArc = angle > 180 ? 1 : 0;

      return {
        path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`,
        ...item,
        percentage: ((item.value / total) * 100).toFixed(1),
      };
    });
  }, [data, total]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ width: size, height: size }}>
        No data
      </div>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {pathData.map((item, index) => (
        <path
          key={index}
          d={item.path}
          fill={item.color}
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.5"
        />
      ))}
    </svg>
  );
}

interface StatsCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}

export function StatsCard({ title, value, icon, trend, color = 'bg-purple-500/20 text-purple-400' }: StatsCardProps) {
  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        {icon && <div className={`p-3 rounded-lg ${color}`}>{icon}</div>}
        {trend && (
          <span className={`text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-zinc-400 text-sm">{title}</div>
    </div>
  );
}
