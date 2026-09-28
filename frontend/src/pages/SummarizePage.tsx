import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Download,
  RotateCcw,
  Sliders,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Bookmark
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { SummarizeResponse } from '../types';

export const SummarizePage: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [lengthMode, setLengthMode] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [numBeams, setNumBeams] = useState<number>(2);

  // States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummarizeResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Feedback states
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const sampleArticles = [
    {
      title: 'Global Renewable Energy Transition',
      text: `The global transition toward renewable energy has accelerated substantially over the past five years. Driven by declining capital costs in solar photovoltaic installations and offshore wind turbines, investments in clean power capacity have outpaced fossil fuels across major economies. Governments throughout Europe, North America, and the Asia-Pacific region have enacted comprehensive decarbonization policies, establishing clean energy standards, emissions trading markets, and direct subsidies for high-capacity battery storage. Despite this momentum, critical bottlenecks remain in grid infrastructure expansion, inter-regional transmission lines, and the security of supply chains for critical minerals such as lithium, cobalt, and rare earths. Energy analysts project that meeting international net-zero targets by 2050 will require tripling annual renewable capacity additions by 2030 and modernizing legacy distribution networks.`
    },
    {
      title: 'Transformers in Artificial Intelligence',
      text: `Natural language processing and generative artificial intelligence have undergone profound advancements following the widespread adoption of the Transformer neural network architecture. Utilizing self-attention mechanisms that dynamically compute token relationships across large sequence lengths, transformer models such as T5, FLAN-T5, and BERT overcome the sequential processing bottlenecks of traditional recurrent neural networks. These models excel at contextual comprehension, abstractive summarization, multilingual machine translation, and complex reasoning. Ongoing engineering initiatives focus on reducing computational memory requirements during inference, designing efficient quantization algorithms, mitigating factual hallucinations, and implementing rigorous MLOps observability pipelines to detect semantic and distributional drift in production deployments.`
    }
  ];

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter or paste an article to summarize.');
      return;
    }
    if (charCount < 25) {
      setError('Text is too short for abstractive summarization (minimum 25 characters required).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setFeedbackSent(false);

    // Compute token limits based on length mode
    let maxLen = 150;
    let minLen = 40;
    if (lengthMode === 'brief') {
      maxLen = 80;
      minLen = 25;
    } else if (lengthMode === 'detailed') {
      maxLen = 250;
      minLen = 90;
    }

    try {
      const response = await api.summarizeText({
        text,
        title: title.trim() || undefined,
        max_length: maxLen,
        min_length: minLen,
        temperature,
        num_beams: numBeams
      });
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Summarization service is temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.summary) return;
    navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'txt' | 'json') => {
    if (!result) return;
    let content = '';
    let filename = `summary_${Date.now()}`;
    let mimeType = 'text/plain';

    if (format === 'txt') {
      content = `TITLE: ${result.title || 'Text Summarization Pipeline Output'}\nMODEL: ${result.model_name} (v${result.model_version})\nCOMPRESSION RATIO: ${(result.compression_ratio * 100).toFixed(1)}%\nPROCESSING TIME: ${result.processing_time_ms} ms\n\nSUMMARY:\n${result.summary}`;
      filename += '.txt';
    } else {
      content = JSON.stringify(result, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFeedback = async (isUseful: boolean) => {
    if (!result) return;
    try {
      await api.submitFeedback({
        summary_id: result.request_id,
        is_useful: isUseful,
        rating: isUseful ? 5 : 2
      });
      setFeedbackSent(true);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-cyan-400" />
            <span>Generate Document Summary</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real abstractive NLP summarization powered by Google FLAN-T5 encoder-decoder architecture.
          </p>
        </div>

        {/* Quick Sample Loaders */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Samples:</span>
          {sampleArticles.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setText(sample.text);
                setTitle(sample.title);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 transition-all"
            >
              {sample.title.split(' ')[0]}...
            </button>
          ))}
        </div>
      </div>

      {/* Main Glass Text Editor Card */}
      <GlassCard className="p-6">
        {/* Optional Document Title Input */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Bookmark className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs font-medium text-slate-300">Document Title (Optional)</label>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advancements in Modern NLP"
            className="w-full px-4 py-2 rounded-xl text-sm liquid-glass-input"
          />
        </div>

        {/* Large Text Area */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your article, document, or research paper here..."
            rows={10}
            className="w-full p-4 rounded-xl text-sm liquid-glass-input resize-y font-sans leading-relaxed focus:ring-1 focus:ring-cyan-500/50"
          />

          {/* Bottom Counters and Clear Button */}
          <div className="flex items-center justify-between mt-2 px-1 text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{charCount} characters</span>
            </div>
            {text && (
              <button
                onClick={() => {
                  setText('');
                  setTitle('');
                  setResult(null);
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Control Bar: Length, Options, and Generate */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Target Length Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-medium">Length:</span>
            <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/10">
              {(['brief', 'standard', 'detailed'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLengthMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                    lengthMode === mode
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                showAdvanced
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-white/[0.03] text-slate-400 border-white/10 hover:text-slate-200'
              }`}
              title="Advanced Generation Parameters"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !text.trim()}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-glow-cyan ${
              isLoading || !text.trim()
                ? 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-semibold transform hover:-translate-y-0.5'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Generating Summary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Summary</span>
              </>
            )}
          </button>
        </div>

        {/* Collapsible Advanced Parameters */}
        {showAdvanced && (
          <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Temperature (Sampling Diversity): {temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Beam Search Size: {numBeams}</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={numBeams}
                onChange={(e) => setNumBeams(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        )}
      </GlassCard>

      {/* Error Alert Box */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-sm flex items-start gap-3 backdrop-blur-md">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-rose-300">Summarization Error</p>
            <p className="text-xs text-rose-200/80 mt-1">{error}</p>
          </div>
          <button
            onClick={handleGenerate}
            className="text-xs px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Output Results Section */}
      {result && (
        <GlassCard className="p-6 border-cyan-500/30 shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)] animate-fadeIn">
          {/* Header with Title and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status="Generated Successfully" variant="healthy" />
                <span className="text-xs text-slate-400 font-mono">
                  {result.model_name}
                </span>
              </div>
              {result.title && (
                <h3 className="text-lg font-bold text-white mt-1.5">{result.title}</h3>
              )}
            </div>

            {/* Actions: Copy, Download */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={() => handleDownload('txt')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>
              <button
                onClick={() => handleDownload('json')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Generated Summary Text */}
          <div className="py-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 font-mono">
              Summary
            </h4>
            <p className="text-slate-100 text-base md:text-lg leading-relaxed font-sans font-light bg-black/20 p-5 rounded-2xl border border-white/5">
              {result.summary}
            </p>
          </div>

          {/* Real Statistics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-white/10">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-slate-400 block">Original Words</span>
              <span className="text-sm font-bold text-white font-mono">{result.input_words}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-slate-400 block">Summary Words</span>
              <span className="text-sm font-bold text-cyan-300 font-mono">{result.summary_words}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-slate-400 block">Compression Ratio</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {(result.compression_ratio * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-slate-400 block">Processing Time</span>
              <span className="text-sm font-bold text-amber-300 font-mono">{result.processing_time_ms} ms</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-slate-400 block">Model</span>
              <span className="text-xs font-medium text-slate-200 truncate block">
                {result.model_name.replace('google/', '')}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-slate-400 block">Version</span>
              <span className="text-sm font-bold text-slate-200 font-mono">v{result.model_version}</span>
            </div>
          </div>

          {/* Optional User Feedback Widget (Prompt #24) */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <span>Was this summary useful?</span>
              {feedbackSent ? (
                <span className="text-emerald-400 font-medium">Thank you for your feedback!</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleFeedback(true)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 border border-white/10 transition-colors"
                    title="Useful"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 border border-white/10 transition-colors"
                    title="Not Useful"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setResult(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>Summarize Another Document</span>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
