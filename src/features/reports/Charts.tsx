import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL, formatBRLCompact } from '../../lib/money';

export const REPORT_COLORS = [
  '#059669',
  '#0284c7',
  '#d97706',
  '#7c3aed',
  '#e11d48',
  '#0f766e',
  '#ea580c',
  '#4f46e5',
  '#65a30d',
  '#c026d3',
  '#0891b2',
  '#64748b',
];

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

export interface MonthlyPoint {
  label: string;
  total: number;
  paid: number;
}

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
};

const axisTick = { fontSize: 11, fill: '#64748b' };
const smallTick = { fontSize: 10, fill: '#94a3b8' };

export function CategoryChart({ data }: { data: CategorySlice[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={54}
          outerRadius={82}
          paddingAngle={2}
          stroke="#ffffff"
          strokeWidth={2}
        >
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatBRL(Number(value))}
          contentStyle={tooltipStyle}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: '#475569' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ComparisonChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          interval={0}
        />
        <YAxis
          tickFormatter={(value) => formatBRLCompact(Number(value))}
          tickLine={false}
          axisLine={false}
          tick={smallTick}
          width={66}
        />
        <Tooltip
          formatter={(value) => formatBRL(Number(value))}
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
        />
        <Bar dataKey="total" name="Total do mês" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusChart({
  paidCents,
  pendingCents,
}: {
  paidCents: number;
  pendingCents: number;
}) {
  const data = [
    { label: 'Pagas', value: paidCents, fill: '#059669' },
    { label: 'Pendentes', value: pendingCents, fill: '#d97706' },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
        <YAxis
          tickFormatter={(value) => formatBRLCompact(Number(value))}
          tickLine={false}
          axisLine={false}
          tick={smallTick}
          width={66}
        />
        <Tooltip
          formatter={(value) => formatBRL(Number(value))}
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={70}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EvolutionChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={smallTick}
          minTickGap={18}
        />
        <YAxis
          tickFormatter={(value) => formatBRLCompact(Number(value))}
          tickLine={false}
          axisLine={false}
          tick={smallTick}
          width={66}
        />
        <Tooltip
          formatter={(value) => formatBRL(Number(value))}
          contentStyle={tooltipStyle}
        />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: '#475569', paddingBottom: 8 }}
        />
        <Line
          type="monotone"
          dataKey="total"
          name="Total"
          stroke="#059669"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="paid"
          name="Pago"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
