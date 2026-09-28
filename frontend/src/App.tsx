import React, { useState, useEffect } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { SummarizePage } from './pages/SummarizePage';
import { BatchCsvPage } from './pages/BatchCsvPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { MLOpsPage } from './pages/MLOpsPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import {
  HealthResponse,
  ModelInfoResponse,
  AnalyticsResponse,
  MLflowStatusResponse,
  MonitoringResponse,
  DatasetInfoResponse,
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Real backend states
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [metrics, setMetrics] = useState<AnalyticsResponse | null>(null);
  const [mlflow, setMLflow] = useState<MLflowStatusResponse | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringResponse | null>(null);
  const [dataset, setDataset] = useState<DatasetInfoResponse | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);

  const fetchBackendData = async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }

    try {
      const m = await api.getModelInfo();
      setModelInfo(m);
    } catch {
      // ignore
    }

    try {
      const d = await api.getDatasetInfo();
      setDataset(d);
    } catch {
      // ignore
    }

    try {
      const ml = await api.getMLflowStatus();
      setMLflow(ml);
    } catch {
      // ignore
    }

    try {
      const mon = await api.getMonitoring();
      setMonitoring(mon);
    } catch {
      // ignore
    }
  };

  const fetchAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      const met = await api.getMetrics();
      setMetrics(met);
    } catch {
      // ignore
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
    fetchAnalytics();

    // Periodic heartbeat every 10 seconds
    const interval = setInterval(() => {
      fetchBackendData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Ambient Glowing Orbs */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-glow" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-glow" style={{ animationDelay: '2s' }} />

      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendHealthy={health?.status === 'healthy'}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardPage
            health={health}
            modelInfo={modelInfo}
            metrics={metrics}
            mlflow={mlflow}
            monitoring={monitoring}
            dataset={dataset}
            onNavigateSummarize={() => setActiveTab('summarize')}
            onNavigateMLOps={() => setActiveTab('mlops')}
          />
        )}

        {activeTab === 'summarize' && <SummarizePage />}

        {activeTab === 'batch-csv' && <BatchCsvPage />}

        {activeTab === 'analytics' && (
          <AnalyticsPage analytics={metrics} isLoading={isAnalyticsLoading} />
        )}

        {activeTab === 'mlops' && (
          <MLOpsPage
            dataset={dataset}
            mlflow={mlflow}
            onRefresh={() => {
              fetchBackendData();
              fetchAnalytics();
            }}
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringPage
            monitoring={monitoring}
            isLoading={false}
            onRefresh={() => fetchBackendData()}
          />
        )}

        {activeTab === 'apidocs' && <ApiDocsPage />}

        {activeTab === 'settings' && (
          <SettingsPage
            health={health}
            modelInfo={modelInfo}
            mlflow={mlflow}
            dataset={dataset}
            monitoring={monitoring}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 backdrop-blur-xl bg-black/40 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Text Summarization Pipeline</span>
            <span>•</span>
            <span>Intelligent Text Summarization & Continuous MLOps Platform</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span>Model: FLAN-T5 Small</span>
            <span>Tracking: MLflow</span>
            <span>Versioning: DVC</span>
            <span>Monitoring: Evidently AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
