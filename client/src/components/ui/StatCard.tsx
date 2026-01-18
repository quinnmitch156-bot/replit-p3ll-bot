import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  loading?: boolean;
}

export function StatCard({ label, value, icon: Icon, trend, className, loading }: StatCardProps) {
  return (
    <div className={cn("glass-card rounded-xl p-6 relative overflow-hidden group", className)}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-24 h-24 text-primary transform rotate-12 translate-x-4 -translate-y-4" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono">
            {label}
          </span>
        </div>
        
        {loading ? (
          <div className="h-10 w-24 bg-white/5 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-white tracking-tight">
              {value}
            </span>
            {trend && (
              <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {trend}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Decorative gradient line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent opacity-50" />
    </div>
  );
}
