import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  accent?: 'cyan' | 'purple' | 'emerald' | 'amber';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = 'cyan',
}) => {
  const getGlow = () => {
    switch (accent) {
      case 'purple':
        return 'group-hover:border-purple-500/40 group-hover:shadow-[0_0_20px_-3px_rgba(168,85,247,0.3)]';
      case 'emerald':
        return 'group-hover:border-emerald-500/40 group-hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)]';
      case 'amber':
        return 'group-hover:border-amber-500/40 group-hover:shadow-[0_0_20px_-3px_rgba(245,158,11,0.3)]';
      default:
        return 'group-hover:border-cyan-500/40 group-hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.3)]';
    }
  };

  const getIconBg = () => {
    switch (accent) {
      case 'purple':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'amber':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
  };

  return (
    <div
      className={`liquid-glass p-5 relative group transition-all duration-300 ${getGlow()}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border backdrop-blur-md ${getIconBg()}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-white font-mono">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
            <span>{subtitle}</span>
            {trend && <span className="text-emerald-400 font-medium">{trend}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
