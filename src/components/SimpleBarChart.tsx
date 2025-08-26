import { BarChart, Bar, ResponsiveContainer } from 'recharts';

interface SimpleBarChartProps {
  data: { name: string; value: number }[];
  height?: number;
  horizontal?: boolean;
}

export const SimpleBarChart = ({ data, height = 80, horizontal = false }: SimpleBarChartProps) => {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? 'horizontal' : 'vertical'}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <Bar
            dataKey="value"
            fill="hsl(var(--chart-1))"
            radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};