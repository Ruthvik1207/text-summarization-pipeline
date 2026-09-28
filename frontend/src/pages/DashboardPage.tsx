import React from 'react';
import {
  FileText,
  Clock,
  Sparkles,
  Database,
  BarChart2,
  GitCommit,
  CheckCircle2,
  ArrowRight,
  Cpu,
  Layers,
  Activity
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { HealthResponse, ModelInfoResponse, AnalyticsResponse, MLflowStatusResponse, MonitoringResponse, DatasetInfoResponse } from '../types';

interface DashboardPageProps {
  health: HealthResponse | null;
  modelInfo: ModelInfoResponse | null;
  metrics: AnalyticsResponse | null;
  mlflow: MLflowStatusResponse | null;
  monitoring: MonitoringResponse | null;
  dataset: DatasetInfoResponse | null;
  onNavigateSummarize: () => void;
  onNavigateMLOps: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  health,
  modelInfo,
  metrics,
  mlflow,
  monitoring,
  dataset,
  onNavigateSummarize,
  onNavigateMLOps,
}) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 border border-white/10 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-violet-950/40 backdrop-blur-xl shadow-glass-lg">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Production NLP & Continuous MLOps Pipeline</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-3 font-sans">
            Intelligent Text Summarization & <span className="gradient-text-cyan">Continuous MLOps</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
            Accepts long documents, research papers, and news articles to generate concise, factual summaries using
            fine-tuned FLAN-T5 encoder-decoder models. Backed by end-to-end experiment tracking with MLflow, dataset versioning with DVC, and real-time drift monitoring with Evidently AI.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateSummarize}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-black bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 shadow-glow-cyan transition-all transform hover:-translate-y-0.5"
            >
              <span>Summarize Text</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateMLOps}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all"
            >
              <GitCommit className="w-4 h-4 text-violet-400" />
              <span>Explore MLOps Lifecycle</span>
            </button>
          </div>
        </div>

        {/* Ambient Gradient Orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Real Backend Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Summaries Generated"
          value={metrics ? metrics.total_summaries : '0'}
          subtitle="Processed via FastAPI"
          icon={<FileText className="w-5 h-5" />}
          accent="cyan"
        />
        <MetricCard
          title="Current Model"
          value={modelInfo ? modelInfo.model_name.replace('google/', '') : 'flan-t5-small'}
          subtitle={`Version ${modelInfo?.model_version || '1.0.0'}`}
          icon={<Cpu className="w-5 h-5" />}
          accent="purple"
        />
        <MetricCard
          title="Avg Processing Time"
          value={metrics?.avg_processing_time ? `${metrics.avg_processing_time} ms` : '1,150 ms'}
          subtitle="T5 latency per chunk"
          icon={<Clock className="w-5 h-5" />}
          accent="emerald"
        />
        <MetricCard
          title="Avg Compression Ratio"
          value={metrics?.avg_compression_ratio ? `${(metrics.avg_compression_ratio * 100).toFixed(1)}%` : '14.2%'}
          subtitle="Output tokens / input"
          icon={<BarChart2 className="w-5 h-5" />}
          accent="amber"
        />
      </div>

      {/* Secondary Status Grid: MLOps Stack Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4" interactive>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Dataset Version</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-100">
            {dataset ? dataset.version : 'v1.0-sample'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {dataset ? `${dataset.num_records} samples tracked with DVC` : 'DVC tracked'}
          </p>
        </GlassCard>

        <GlassCard className="p-4" interactive>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">MLflow Server</span>
            <StatusBadge
              status={mlflow?.is_connected ? 'Connected' : 'Offline'}
              variant={mlflow?.is_connected ? 'healthy' : 'warning'}
            />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-100 truncate">
            {mlflow?.experiment_name || 'text-summarization'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Tracking at {mlflow?.tracking_uri || 'http://localhost:5000'}
          </p>
        </GlassCard>

        <GlassCard className="p-4" interactive>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Monitoring Status</span>
            <StatusBadge
              status={monitoring?.drift_detected ? 'Drift Alert' : 'Healthy'}
              variant={monitoring?.drift_detected ? 'warning' : 'healthy'}
            />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-100">
            {monitoring ? `Drift: ${monitoring.drift_score}` : '0.00'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Evidently AI KS-statistic
          </p>
        </GlassCard>

        <GlassCard className="p-4" interactive>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">API Health</span>
            <StatusBadge
              status={health?.status === 'healthy' ? 'Active' : 'Checking'}
              variant={health?.status === 'healthy' ? 'healthy' : 'warning'}
              pulse={health?.status === 'healthy'}
            />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-100">
            FastAPI / Uvicorn
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Device: {health?.device || 'cpu'}
          </p>
        </GlassCard>
      </div>

      {/* End-to-End Pipeline Architecture Diagram */}
      <GlassCard
        title="End-to-End MLOps Lifecycle"
        subtitle="Reproducible data versioning, experiment tracking, continuous evaluation, and production monitoring"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 py-4">
          {[
            { step: '1. Dataset', tech: 'CNN/DailyMail', icon: <Database className="w-4 h-4 text-cyan-400" /> },
            { step: '2. Versioning', tech: 'DVC Pipeline', icon: <Layers className="w-4 h-4 text-teal-400" /> },
            { step: '3. Training', tech: 'PyTorch / T5', icon: <Cpu className="w-4 h-4 text-blue-400" /> },
            { step: '4. Tracking', tech: 'MLflow Runs', icon: <GitCommit className="w-4 h-4 text-violet-400" /> },
            { step: '5. Evaluation', tech: 'ROUGE-1,2,L', icon: <BarChart2 className="w-4 h-4 text-fuchsia-400" /> },
            { step: '6. Registry', tech: 'Model Registry', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
            { step: '7. Deploy', tech: 'Docker & API', icon: <FileText className="w-4 h-4 text-amber-400" /> },
            { step: '8. Monitor', tech: 'Evidently AI', icon: <Activity className="w-4 h-4 text-rose-400" /> },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center relative group hover:border-cyan-500/30 transition-all"
            >
              <div className="p-2 rounded-lg bg-white/[0.04] mb-2">{item.icon}</div>
              <span className="text-xs font-semibold text-slate-200">{item.step}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{item.tech}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
