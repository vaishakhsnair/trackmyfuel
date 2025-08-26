import { cn } from "@/lib/utils";
import { TrendIndicator } from "./TrendIndicator";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    period: string;
  };
  className?: string;
  children?: React.ReactNode;
}

export const MetricCard = ({ 
  title, 
  value, 
  unit, 
  trend, 
  className, 
  children 
}: MetricCardProps) => {
  return (
    <div className={cn("metric-card p-6 space-y-4", className)}>
      <div className="flex justify-between items-start">
        <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
        {trend && (
          <TrendIndicator 
            value={trend.value} 
            period={trend.period}
          />
        )}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-baseline space-x-1">
          <span className="text-3xl font-bold text-card-foreground">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {unit && (
            <span className="text-muted-foreground text-sm font-medium">
              {unit}
            </span>
          )}
        </div>
      </div>

      {children && (
        <div className="pt-4">
          {children}
        </div>
      )}
    </div>
  );
};