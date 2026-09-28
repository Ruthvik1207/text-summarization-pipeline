import React from 'react';
import { Settings as SettingsIcon, Server, Database, Activity, GitBranch, Cpu, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { HealthResponse, ModelInfoResponse, MLflowStatusResponse, DatasetInfoResponse, MonitoringResponse } from '../types';

interface SettingsPageProps {
  health: HealthResponse | null;
  modelInfo: ModelInfoResponse | null;
  mlflow: MLflowStatusResponse | null;
  dataset: DatasetInfoResponse | null;
  monitoring: MonitoringResponse | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  health,
  modelInfo,
  mlflow,
  dataset,
  monitoring,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-cyan-400" />
          <span>Platform Settings & System Information</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Active model parameters, MLOps connection configurations, and runtime environment specifications.
        </p>
      </div>

      <div className="space-y-4">
        {/* Model Configuration */}
        <GlassCard title="NLP Transformer Model Specification">
          <div className="divide-y divide-white/5 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Active Model
              </span>
              <span className="text-slate-200 font-mono font-medium">
                {modelInfo?.model_name || 'google/flan-t5-small'}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Model Version</span>
              <span className="text-slate-200 font-mono">v{modelInfo?.model_version || '1.0.0'}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Parameters Count</span>
              <span className="text-slate-200 font-mono">{modelInfo?.parameters_count || '77.0M'}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Compute Device</span>
              <span className="text-slate-200 font-mono uppercase">{modelInfo?.device || 'CPU'}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Max Context Sequence</span>
              <span className="text-slate-200 font-mono">{modelInfo?.max_context_length || 2048} tokens</span>
            </div>
          </div>
        </GlassCard>

        {/* API and Environment */}
        <GlassCard title="API Backend & Runtime Environment">
          <div className="divide-y divide-white/5 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                FastAPI Base URL
              </span>
              <span className="text-cyan-400 font-mono">
                {import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">API Health Status</span>
              <StatusBadge
                status={health?.status === 'healthy' ? 'Healthy & Ready' : 'Connecting'}
                variant={health?.status === 'healthy' ? 'healthy' : 'warning'}
              />
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Environment</span>
              <span className="text-slate-200 font-mono">production-ready (local / docker)</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Database Persistence</span>
              <span className="text-slate-200 font-mono">SQLite (Thread-safe)</span>
            </div>
          </div>
        </GlassCard>

        {/* MLOps Integration Status */}
        <GlassCard title="MLOps Integrations">
          <div className="divide-y divide-white/5 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-violet-400" />
                MLflow Tracking URI
              </span>
              <span className="text-slate-200 font-mono">
                {mlflow?.tracking_uri || 'http://localhost:5000'}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">MLflow Connection</span>
              <StatusBadge
                status={mlflow?.is_connected ? 'Connected' : 'Standalone Mode'}
                variant={mlflow?.is_connected ? 'healthy' : 'neutral'}
              />
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                DVC Dataset Version
              </span>
              <span className="text-slate-200 font-mono">{dataset?.version || 'v1.0-sample'}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Evidently AI Monitoring
              </span>
              <StatusBadge
                status={monitoring?.drift_detected ? 'Drift Alert' : 'Active & Stable'}
                variant={monitoring?.drift_detected ? 'warning' : 'healthy'}
              />
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Continuous Learning Gate
              </span>
              <span className="text-emerald-400 font-mono">ROUGE-L &ge; 0.35</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
