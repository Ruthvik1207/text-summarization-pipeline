export interface SummarizeRequest {
  text: string;
  title?: string;
  max_length?: number;
  min_length?: number;
  temperature?: number;
  num_beams?: number;
}

export interface SummarizeResponse {
  summary: string;
  model_name: string;
  model_version: string;
  input_characters: number;
  input_words: number;
  summary_words: number;
  compression_ratio: number;
  processing_time_ms: number;
  timestamp: string;
  request_id?: string;
  title?: string;
}

export interface FeedbackRequest {
  summary_id?: string;
  is_useful: boolean;
  reference_summary?: string;
  rating?: number;
  comment?: string;
}

export interface FeedbackResponse {
  status: string;
  feedback_id: string;
  message: string;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model_name: string;
  device: string;
  mlflow_connected: boolean;
  timestamp: string;
}

export interface ModelInfoResponse {
  model_name: string;
  model_version: string;
  architecture: string;
  parameters_count: string;
  device: string;
  max_context_length: number;
  supported_languages: string[];
  is_loaded: boolean;
  status: string;
}

export interface DatasetInfoResponse {
  version: string;
  num_records: number;
  size_bytes: number;
  last_updated: string;
  dvc_tracked: boolean;
  splits: {
    raw: number;
    train: number;
    val: number;
  };
  features: string[];
  sample_records: Record<string, string>[];
}

export interface MLflowStatusResponse {
  tracking_uri: string;
  is_connected: boolean;
  experiment_name: string;
  latest_run_id?: string | null;
  latest_metrics: Record<string, number>;
  registered_model_name: string;
  registered_model_version?: string | null;
  runs_count: number;
}

export interface MonitoringResponse {
  total_predictions: number;
  avg_compression_ratio: number;
  avg_processing_time_ms: number;
  avg_input_words: number;
  avg_summary_words: number;
  drift_detected: boolean;
  drift_score: number;
  report_generated: boolean;
  report_path?: string | null;
  recent_metrics: Array<{
    input_length: number;
    output_length: number;
    compression_ratio: number;
    latency_ms: number;
    timestamp: string;
  }>;
}

export interface AnalyticsResponse {
  total_summaries: number;
  avg_processing_time: number;
  avg_compression_ratio: number;
  avg_input_length: number;
  avg_summary_length: number;
  volume_by_date: Array<{ date: string; count: number }>;
  length_distribution: Array<{ range: string; count: number }>;
  compression_distribution: Array<{ bucket: string; count: number }>;
}

export interface TrainRequest {
  model_name?: string;
  epochs?: number;
  batch_size?: number;
  learning_rate?: number;
  dataset_version?: string;
  min_rouge_threshold?: number;
}

export interface TrainResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface TrainingStatusResponse {
  job_id: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  dataset_version: string;
  model_name: string;
  candidate_model_name?: string | null;
  rouge1?: number | null;
  rouge2?: number | null;
  rougeL?: number | null;
  validation_loss?: number | null;
  registered: boolean;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface BatchSummarizeItem {
  id?: string;
  text: string;
  title?: string;
  reference_summary?: string;
}

export interface BatchSummarizeRequest {
  items: BatchSummarizeItem[];
  max_length?: number;
  min_length?: number;
  temperature?: number;
  num_beams?: number;
}

export interface BatchItemResult {
  id?: string;
  title?: string;
  original_text: string;
  input_words: number;
  input_characters: number;
  summary: string;
  summary_words: number;
  compression_ratio: number;
  processing_time_ms: number;
  rouge1?: number | null;
  rouge2?: number | null;
  rougeL?: number | null;
  status: 'success' | 'failed' | 'skipped';
  error?: string | null;
}

export interface BatchSummarizeResponse {
  total_processed: number;
  successful: number;
  failed: number;
  avg_processing_time_ms: number;
  results: BatchItemResult[];
}

