import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  variant?: "cardinal" | "amber" | "success" | "default";
  onClick?: () => void;
  className?: string;
}

const MetricCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  variant = "default",
  onClick,
  className = "",
}: MetricCardProps) => {
  const borderColors = {
    cardinal: "border-l-primary",
    amber: "border-l-amber",
    success: "border-l-emerald-500",
    default: "border-l-border",
  };

  const changeColors = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    neutral: "text-muted-foreground",
  };

  return (
    <div
      className={`metric-card border-l-4 ${borderColors[variant]} hover:scale-[1.02] transition-transform duration-200 ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-display font-bold text-foreground">{value}</p>
          {change && (
            <p className={`text-sm mt-2 ${changeColors[changeType]}`}>{change}</p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
