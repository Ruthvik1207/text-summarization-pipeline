import React, { useState } from 'react';
import { Code2, ExternalLink, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';

interface EndpointDoc {
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  description: string;
  requestBody?: string;
  responseBody: string;
}

export const ApiDocsPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(1); // open /summarize by default
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const endpoints: EndpointDoc[] = [
    {
      method: 'GET',
      path: '/api/v1/health',
      summary: 'API Health & Model Status',
      description: 'Checks operational readiness of the FastAPI server, FLAN-T5 model cache, and MLflow connectivity.',
      responseBody: `{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "google/flan-t5-small",
  "device": "cpu",
  "mlflow_connected": true,
  "timestamp": "2026-09-28T10:00:00Z"
}`
    },
    {
      method: 'POST',
      path: '/api/v1/summarize',
      summary: 'Generate Abstractive Text Summary',
      description: 'Accepts raw text or document, performs input validation, executes T5/FLAN-T5 inference with chunking, and returns real summary statistics.',
      requestBody: `{
  "text": "The global shift toward renewable energy sources has accelerated dramatically over the past five years...",
  "title": "Clean Energy Transition",
  "max_length": 150,
  "min_length": 40,
  "temperature": 0.7,
  "num_beams": 2
}`,
      responseBody: `{
  "summary": "Global clean energy investments have reached record highs due to falling solar and wind costs...",
  "model_name": "google/flan-t5-small",
  "model_version": "1.0.0",
  "input_characters": 820,
  "input_words": 114,
  "summary_words": 28,
  "compression_ratio": 0.2456,
  "processing_time_ms": 1240,
  "timestamp": "2026-09-28T10:00:00Z",
  "request_id": "c7a8b9e0-1234-5678-9abc-def012345678",
  "title": "Clean Energy Transition"
}`
    },
    {
      method: 'GET',
      path: '/api/v1/model',
      summary: 'NLP Model Architecture & Specs',
      description: 'Returns metadata about current transformer model architecture, parameter count, device, and context window.',
      responseBody: `{
  "model_name": "google/flan-t5-small",
  "model_version": "1.0.0",
  "architecture": "Seq2SeqLM (T5 / FLAN-T5)",
  "parameters_count": "77.0M",
  "device": "cpu",
  "max_context_length": 2048,
  "supported_languages": ["English", "Multi-lingual capable"],
  "is_loaded": true,
  "status": "Ready"
}`
    },
    {
      method: 'GET',
      path: '/api/v1/metrics',
      summary: 'Aggregated Inference Analytics',
      description: 'Calculates historical summary counts, average processing time, compression ratios, and length distributions.',
      responseBody: `{
  "total_summaries": 42,
  "avg_processing_time": 1180.5,
  "avg_compression_ratio": 0.1842,
  "avg_input_length": 780.0,
  "avg_summary_length": 115.0,
  "volume_by_date": [
    { "date": "2026-09-28", "count": 42 }
  ],
  "length_distribution": [
    { "range": "500-1000", "count": 28 }
  ],
  "compression_distribution": [
    { "bucket": "10-20%", "count": 30 }
  ]
}`
    },
    {
      method: 'GET',
      path: '/api/v1/monitoring',
      summary: 'Evidently AI Drift Monitoring',
      description: 'Returns real distribution drift metrics, KS-statistic scores, and relative report filepaths.',
      responseBody: `{
  "total_predictions": 42,
  "avg_compression_ratio": 0.1842,
  "avg_processing_time_ms": 1180.5,
  "avg_input_words": 780.0,
  "avg_summary_words": 115.0,
  "drift_detected": false,
  "drift_score": 0.0,
  "report_generated": true,
  "report_path": "reports/monitoring_report_20260928_093130.html"
}`
    },
    {
      method: 'GET',
      path: '/api/v1/mlflow',
      summary: 'MLflow Tracking Server Status',
      description: 'Fetches active experiment details, latest logged run metrics, and registered model state.',
      responseBody: `{
  "tracking_uri": "http://localhost:5000",
  "is_connected": true,
  "experiment_name": "text-summarization",
  "latest_run_id": "4f8a9b1c2d3e4f5a6b7c8d9e",
  "latest_metrics": {
    "ROUGE-1": 0.412,
    "ROUGE-2": 0.228,
    "ROUGE-L": 0.384
  },
  "registered_model_name": "text-summarization-model",
  "registered_model_version": "1",
  "runs_count": 8
}`
    },
    {
      method: 'GET',
      path: '/api/v1/dataset',
      summary: 'Dataset Metadata & DVC Status',
      description: 'Returns dataset sample size, schema features, train/validation split breakdown, and DVC status.',
      responseBody: `{
  "version": "v1.0-sample",
  "num_records": 5,
  "size_bytes": 4820,
  "last_updated": "2026-09-28T10:00:00Z",
  "dvc_tracked": true,
  "splits": { "raw": 5, "train": 4, "val": 1 },
  "features": ["id", "title", "article", "summary"]
}`
    },
    {
      method: 'POST',
      path: '/api/v1/feedback',
      summary: 'Submit Quality Feedback',
      description: 'Logs user ratings and corrected reference summaries for continuous retraining.',
      requestBody: `{
  "summary_id": "c7a8b9e0-1234-5678-9abc-def012345678",
  "is_useful": true,
  "reference_summary": "Optional corrected summary from human editor",
  "rating": 5,
  "comment": "Accurate key points preserved"
}`,
      responseBody: `{
  "status": "success",
  "feedback_id": "feed-98765432-1234",
  "message": "Feedback recorded for continuous model improvement."
}`
    },
    {
      method: 'POST',
      path: '/api/v1/train',
      summary: 'Trigger Background Retraining Pipeline',
      description: 'Dispatches background fine-tuning pipeline with ROUGE evaluation and automatic candidate gating.',
      requestBody: `{
  "model_name": "google/flan-t5-small",
  "epochs": 2,
  "batch_size": 4,
  "learning_rate": 0.00005,
  "min_rouge_threshold": 0.35
}`,
      responseBody: `{
  "job_id": "training-20260928100000-abc123",
  "status": "started",
  "message": "Training job dispatched to background worker"
}`
    },
    {
      method: 'GET',
      path: '/api/v1/training/status',
      summary: 'Poll Retraining Job Status',
      description: 'Returns real-time progress percentage, step messages, and ROUGE evaluation scores.',
      responseBody: `{
  "job_id": "training-20260928100000-abc123",
  "status": "running",
  "progress": 70,
  "current_step": "Evaluating candidate model against validation split",
  "dataset_version": "v1.0",
  "model_name": "google/flan-t5-small",
  "candidate_model_name": "candidate_training-20260928100000-abc123",
  "rouge1": 0.415,
  "rouge2": 0.231,
  "rougeL": 0.388,
  "validation_loss": 0.842,
  "registered": true,
  "created_at": "2026-09-28T10:00:00Z"
}`
    }
  ];

  const handleCopy = (textToCopy: string, id: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedPath(id);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Code2 className="w-7 h-7 text-cyan-400" />
            <span>FastAPI REST API Documentation</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete API specification for document summarization, MLflow tracking, DVC dataset inspection, and retraining.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors shadow-glow-cyan"
          >
            <span>Open Swagger UI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="http://localhost:8000/redoc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
          >
            <span>ReDoc</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-3">
        {endpoints.map((ep, idx) => {
          const isOpen = openIdx === idx;
          return (
            <GlassCard key={idx} className="p-0 overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono ${
                      ep.method === 'POST'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-sm text-slate-200 font-semibold">{ep.path}</span>
                  <span className="text-xs text-slate-400 hidden sm:inline">• {ep.summary}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Collapsible Content */}
              {isOpen && (
                <div className="p-5 border-t border-white/10 bg-black/30 space-y-4 text-xs animate-fadeIn">
                  <p className="text-slate-300 leading-relaxed">{ep.description}</p>

                  {ep.requestBody && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                          Request Body (JSON)
                        </span>
                        <button
                          onClick={() => handleCopy(ep.requestBody!, `req-${idx}`)}
                          className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                        >
                          {copiedPath === `req-${idx}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copy</span>
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-slate-950 border border-white/10 text-cyan-300 overflow-x-auto font-mono text-[11px]">
                        {ep.requestBody}
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        Response Body (JSON 200 OK)
                      </span>
                      <button
                        onClick={() => handleCopy(ep.responseBody, `res-${idx}`)}
                        className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {copiedPath === `res-${idx}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-slate-950 border border-white/10 text-emerald-300 overflow-x-auto font-mono text-[11px]">
                      {ep.responseBody}
                    </pre>
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
