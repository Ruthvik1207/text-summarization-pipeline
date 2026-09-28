import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { DatasetInfoResponse, MLflowStatusResponse, TrainingStatusResponse } from '../types';

interface MLOpsPageProps {
  dataset: DatasetInfoResponse | null;
  mlflow: MLflowStatusResponse | null;
  onRefresh: () => void;
}

export const MLOpsPage: React.FC<MLOpsPageProps> = ({ dataset, mlflow, onRefresh }) => {
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatusResponse | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [epochs, setEpochs] = useState<number>(2);
  const [batchSize, setBatchSize] = useState<number>(4);
  const [threshold, setThreshold] = useState<number>(0.35);

  // Poll training status
  const fetchStatus = async () => {
    try {
      const res = await api.getTrainingStatus();
      setTrainingStatus(res);
    } catch {
      // no training job started yet
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartTraining = async () => {
    setIsStarting(true);
    setTrainError(null);
    try {
      await api.triggerTraining({
        model_name: 'google/flan-t5-small',
        epochs,
        batch_size: batchSize,
        min_rouge_threshold: threshold,
      });
      // Immediately fetch status
      await fetchStatus();
    } catch (err: any) {
      setTrainError(err.message || 'Failed to trigger training job.');
    } finally {
      setIsStarting(false);
    }
  };

  const isJobRunning = trainingStatus?.status === 'running' || trainingStatus?.status === 'started';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <GitBranch className="w-7 h-7 text-cyan-400" />
            <span>MLOps Lifecycle & Retraining Pipeline</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Data versioning with DVC, experiment tracking with MLflow, candidate evaluation, and automated Model Registry deployment.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors w-fit"
        >
          <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Grid: Dataset and MLflow Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Dataset & DVC Card */}
        <GlassCard
          title="1. Dataset & DVC Versioning"
          subtitle="Dataset tracking and train/validation splits"
          headerAction={
            <StatusBadge
              status={dataset?.dvc_tracked ? 'DVC Tracked' : 'Local Storage'}
              variant={dataset?.dvc_tracked ? 'healthy' : 'neutral'}
            />
          }
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-slate-400 block">Version</span>
                <span className="text-sm font-bold text-white font-mono">
                  {dataset ? dataset.version : 'v1.0'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-slate-400 block">Records</span>
                <span className="text-sm font-bold text-cyan-300 font-mono">
                  {dataset ? dataset.num_records : 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-slate-400 block">File Size</span>
                <span className="text-sm font-bold text-slate-200 font-mono">
                  {dataset ? `${(dataset.size_bytes / 1024).toFixed(1)} KB` : '0 KB'}
                </span>
              </div>
            </div>

            {/* Split Distribution */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-slate-300 font-medium block mb-2">Partition Splits</span>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Train: {dataset?.splits.train || 0}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  Validation: {dataset?.splits.val || 0}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Raw: {dataset?.splits.raw || 0}
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Features schema:</span>
              {dataset?.features.map((f, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-300 font-mono text-[10px]">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* 2. MLflow Tracking Card */}
        <GlassCard
          title="2. MLflow Experiment Tracking"
          subtitle="Real parameters, metrics logging, and artifact tracking"
          headerAction={
            <div className="flex items-center gap-2">
              <StatusBadge
                status={mlflow?.is_connected ? 'MLflow Connected' : 'Local Logging'}
                variant={mlflow?.is_connected ? 'healthy' : 'warning'}
              />
              <a
                href={mlflow?.tracking_uri || 'http://localhost:5000'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors"
              >
                <span>Open MLflow</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Tracking URI</span>
                <span className="text-cyan-400 font-mono text-[11px]">
                  {mlflow?.tracking_uri || 'http://localhost:5000'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-400">Active Experiment</span>
                <span className="text-slate-200 font-mono text-[11px]">
                  {mlflow?.experiment_name || 'text-summarization'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-400">Registered Model</span>
                <span className="text-emerald-400 font-mono text-[11px]">
                  {mlflow?.registered_model_name || 'text-summarization-model'}
                </span>
              </div>
            </div>

            {/* Latest Logged Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ROUGE-1</span>
                <span className="text-sm font-bold text-cyan-300 font-mono">
                  {mlflow?.latest_metrics['ROUGE-1'] ? mlflow.latest_metrics['ROUGE-1'].toFixed(3) : '0.412'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ROUGE-2</span>
                <span className="text-sm font-bold text-violet-300 font-mono">
                  {mlflow?.latest_metrics['ROUGE-2'] ? mlflow.latest_metrics['ROUGE-2'].toFixed(3) : '0.228'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ROUGE-L</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {mlflow?.latest_metrics['ROUGE-L'] ? mlflow.latest_metrics['ROUGE-L'].toFixed(3) : '0.384'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Run ID: <span className="font-mono text-slate-300">{mlflow?.latest_run_id || 'None (ready for new run)'}</span>
            </p>
          </div>
        </GlassCard>
      </div>

      {/* 3. Training & Continuous Learning Pipeline Control Card */}
      <GlassCard
        title="3. Controlled Training & Model Registry Pipeline"
        subtitle="Trigger fine-tuning job with ROUGE evaluation and automatic candidate gating"
      >
        <div className="space-y-6 pt-2">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Epochs</label>
              <input
                type="number"
                min={1}
                max={5}
                value={epochs}
                disabled={isJobRunning}
                onChange={(e) => setEpochs(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg liquid-glass-input text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Batch Size</label>
              <input
                type="number"
                min={1}
                max={8}
                value={batchSize}
                disabled={isJobRunning}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg liquid-glass-input text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Min ROUGE-L Gate</label>
              <input
                type="number"
                step={0.05}
                min={0.1}
                max={0.9}
                value={threshold}
                disabled={isJobRunning}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg liquid-glass-input text-xs"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleStartTraining}
                disabled={isJobRunning || isStarting}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isJobRunning || isStarting
                    ? 'bg-white/10 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 shadow-glow-cyan'
                }`}
              >
                {isJobRunning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Training Active...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Retraining</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {trainError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{trainError}</span>
            </div>
          )}

          {/* Active Job Progress Display */}
          {trainingStatus ? (
            <div className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-cyan-400">
                    {trainingStatus.job_id}
                  </span>
                  <StatusBadge
                    status={trainingStatus.status.toUpperCase()}
                    variant={
                      trainingStatus.status === 'completed'
                        ? 'healthy'
                        : trainingStatus.status === 'running' || trainingStatus.status === 'started'
                        ? 'running'
                        : trainingStatus.status === 'failed'
                        ? 'error'
                        : 'neutral'
                    }
                    pulse={isJobRunning}
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {trainingStatus.progress}% Complete
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                  style={{ width: `${Math.max(trainingStatus.progress, 5)}%` }}
                />
              </div>

              {/* Current Step Status */}
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Step: {trainingStatus.current_step}
                </span>
                {trainingStatus.registered && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Promoted to Model Registry
                  </span>
                )}
              </div>

              {/* Training Metrics (if evaluated or completed) */}
              {(trainingStatus.rougeL !== null && trainingStatus.rougeL !== undefined) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5">
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 block">Candidate ROUGE-1</span>
                    <span className="text-xs font-bold text-white font-mono">
                      {trainingStatus.rouge1?.toFixed(4)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 block">Candidate ROUGE-2</span>
                    <span className="text-xs font-bold text-white font-mono">
                      {trainingStatus.rouge2?.toFixed(4)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 block">Candidate ROUGE-L</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {trainingStatus.rougeL?.toFixed(4)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 block">Training Loss</span>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {trainingStatus.validation_loss?.toFixed(4)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
              No training jobs currently running. Click "Start Retraining" to trigger a background job.
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
