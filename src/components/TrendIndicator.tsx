import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  value: number;
  period: string;
  className?: string;
}

export const TrendIndicator = ({ value, period, className }: TrendIndicatorProps) => {
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <div className={cn(
      "flex items-center space-x-1",
      isPositive ? "trend-positive" : "trend-negative",
      className
    )}>
      <Icon className="w-3 h-3" />
      <span className="text-xs">
        {isPositive ? '+' : ''}{value}%
      </span>
      <span className="text-xs opacity-75">
        {period}
      </span>
    </div>
  );
};