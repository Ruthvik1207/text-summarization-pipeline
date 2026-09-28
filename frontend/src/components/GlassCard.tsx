import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  headerAction,
  interactive = false,
}) => {
  return (
    <div
      className={`liquid-glass p-6 relative overflow-hidden transition-all duration-300 ${
        interactive ? 'liquid-glass-interactive' : ''
      } ${className}`}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
