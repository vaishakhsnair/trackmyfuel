import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SimpleLineChartProps {
  data: { value: number }[];
  height?: number;
}

export const SimpleLineChart = ({ data, height = 60 }: SimpleLineChartProps) => {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, stroke: 'hsl(var(--chart-1))', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};