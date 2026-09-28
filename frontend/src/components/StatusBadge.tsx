import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'healthy' | 'running' | 'warning' | 'error' | 'neutral';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'neutral',
  pulse = false,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'healthy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'running':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'error':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
    }
  };

  const getDotColor = () => {
    switch (variant) {
      case 'healthy':
        return 'bg-emerald-400';
      case 'running':
        return 'bg-cyan-400';
      case 'warning':
        return 'bg-amber-400';
      case 'error':
        return 'bg-rose-400';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-all ${getColors()}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getDotColor()}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${getDotColor()}`} />
      </span>
      {status}
    </span>
  );
};
