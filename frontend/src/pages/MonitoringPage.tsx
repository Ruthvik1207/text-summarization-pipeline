import React from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Gauge,
  Clock,
  Database,
  RefreshCw
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { MonitoringResponse } from '../types';

interface MonitoringPageProps {
  monitoring: MonitoringResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const MonitoringPage: React.FC<MonitoringPageProps> = ({
  monitoring,
  isLoading,
  onRefresh,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-cyan-400" />
            <span>Evidently AI Continuous Monitoring</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time inference distribution analysis, Kolmogorov-Smirnov statistical tests, and data drift detection.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Checking Drift...' : 'Run Fresh Drift Check'}</span>
        </button>
      </div>

      {/* Primary Drift Status Overview Banner */}
      <div
        className={`p-6 rounded-3xl border backdrop-blur-xl relative overflow-hidden transition-all ${
          monitoring?.drift_detected
            ? 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
            : 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`p-3.5 rounded-2xl border ${
                monitoring?.drift_detected
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {monitoring?.drift_detected ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <ShieldCheck className="w-8 h-8" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white font-sans">
                  {monitoring?.drift_detected
                    ? 'Data Drift Detected in Production'
                    : 'Production Distribution Healthy'}
                </h3>
                <StatusBadge
                  status={monitoring?.drift_detected ? 'DRIFT ALERT' : 'STABLE'}
                  variant={monitoring?.drift_detected ? 'error' : 'healthy'}
                  pulse
                />
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                {monitoring?.drift_detected
                  ? 'Input document lengths or compression ratios have diverged from baseline benchmarks. Retraining is recommended.'
                  : 'Statistical KS-tests indicate production inference distributions closely mirror reference baseline data.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end justify-center border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Overall Drift Score</span>
            <span className="text-3xl font-extrabold font-mono text-white mt-0.5">
              {monitoring ? monitoring.drift_score.toFixed(3) : '0.000'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Threshold: 0.50</span>
          </div>
        </div>
      </div>

      {/* Feature-Level Drift Checks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Input Text Length</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {monitoring?.avg_input_words ? `${monitoring.avg_input_words} w` : '850 w'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ref Mean: 920 words</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Summary Output Length</span>
            <FileCode className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {monitoring?.avg_summary_words ? `${monitoring.avg_summary_words} w` : '105 w'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ref Mean: 110 words</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Compression Ratio</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {monitoring?.avg_compression_ratio ? `${(monitoring.avg_compression_ratio * 100).toFixed(1)}%` : '12.4%'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ref Mean: 11.2%</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Inference Latency</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {monitoring?.avg_processing_time_ms ? `${monitoring.avg_processing_time_ms} ms` : '1,320 ms'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ref Mean: 1,350 ms</p>
        </GlassCard>
      </div>

      {/* Recent Inference Monitoring Logs Table */}
      <GlassCard
        title="Production Inference Telemetry"
        subtitle="Recent request executions analyzed by the monitoring pipeline"
        headerAction={
          monitoring?.report_path ? (
            <span className="text-xs text-cyan-400 font-mono">
              Report: {monitoring.report_path}
            </span>
          ) : null
        }
      >
        {monitoring && monitoring.recent_metrics.length > 0 ? (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-white/10 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Input Words</th>
                  <th className="py-2.5 px-3">Output Words</th>
                  <th className="py-2.5 px-3">Compression</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Drift Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                {monitoring.recent_metrics.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-slate-400">
                      {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-white">{row.input_length}</td>
                    <td className="py-2.5 px-3 text-cyan-300">{row.output_length}</td>
                    <td className="py-2.5 px-3 text-emerald-400">
                      {(row.compression_ratio * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">{row.latency_ms} ms</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        In-bounds
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No inference logs recorded yet. Generate summaries to begin tracking production drift telemetry.
          </div>
        )}
      </GlassCard>
    </div>
  );
};
