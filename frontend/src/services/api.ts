import {
  SummarizeRequest,
  SummarizeResponse,
  FeedbackRequest,
  FeedbackResponse,
  HealthResponse,
  ModelInfoResponse,
  DatasetInfoResponse,
  MLflowStatusResponse,
  MonitoringResponse,
  AnalyticsResponse,
  TrainRequest,
  TrainResponse,
  TrainingStatusResponse,
  BatchSummarizeRequest,
  BatchSummarizeResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<HealthResponse>(res);
  },

  async summarizeText(payload: SummarizeRequest): Promise<SummarizeResponse> {
    const res = await fetch(`${API_BASE_URL}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<SummarizeResponse>(res);
  },

  async getModelInfo(): Promise<ModelInfoResponse> {
    const res = await fetch(`${API_BASE_URL}/model`);
    return handleResponse<ModelInfoResponse>(res);
  },

  async getMetrics(): Promise<AnalyticsResponse> {
    const res = await fetch(`${API_BASE_URL}/metrics`);
    return handleResponse<AnalyticsResponse>(res);
  },

  async getMonitoring(): Promise<MonitoringResponse> {
    const res = await fetch(`${API_BASE_URL}/monitoring`);
    return handleResponse<MonitoringResponse>(res);
  },

  async getMLflowStatus(): Promise<MLflowStatusResponse> {
    const res = await fetch(`${API_BASE_URL}/mlflow`);
    return handleResponse<MLflowStatusResponse>(res);
  },

  async getDatasetInfo(): Promise<DatasetInfoResponse> {
    const res = await fetch(`${API_BASE_URL}/dataset`);
    return handleResponse<DatasetInfoResponse>(res);
  },

  async submitFeedback(payload: FeedbackRequest): Promise<FeedbackResponse> {
    const res = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<FeedbackResponse>(res);
  },

  async triggerTraining(payload?: TrainRequest): Promise<TrainResponse> {
    const res = await fetch(`${API_BASE_URL}/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    return handleResponse<TrainResponse>(res);
  },

  async getTrainingStatus(jobId?: string): Promise<TrainingStatusResponse> {
    const query = jobId ? `?job_id=${encodeURIComponent(jobId)}` : '';
    const res = await fetch(`${API_BASE_URL}/training/status${query}`);
    return handleResponse<TrainingStatusResponse>(res);
  },

  async summarizeBatch(payload: BatchSummarizeRequest): Promise<BatchSummarizeResponse> {
    const res = await fetch(`${API_BASE_URL}/summarize/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<BatchSummarizeResponse>(res);
  },
};
