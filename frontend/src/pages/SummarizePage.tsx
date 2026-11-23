import React, { useState, useMemo } from 'react';
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
  Bookmark,
  Zap,
  Smile,
  MessageSquare,
  Activity,
  Compass,
  CheckCircle2
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
  const [numBeams, setNumBeams] = useState<number>(1); // Default 1 for ultra-fast greedy inference

  // States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummarizeResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);

  // Client-side real-time message profiling
  const liveProfile = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      return {
        wordCount: 0,
        charCount: 0,
        detectedType: 'empty',
        typeLabel: 'Awaiting Input',
        emojis: [] as string[],
        allEmojiCount: 0,
        hasEmojis: false,
        tone: 'Neutral',
        isEmojiOnly: false,
        speedEstimate: 'Instant'
      };
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const charCount = trimmed.length;

    // Detect Unicode emojis
    const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;
    const detectedEmojis = Array.from(new Set(trimmed.match(emojiRegex) || []));
    const allEmojiMatches = trimmed.match(emojiRegex) || [];
    const hasEmojis = detectedEmojis.length > 0;

    // Check if emoji-only
    const textWithoutEmojisOrPunct = trimmed.replace(emojiRegex, '').replace(/[\s\W_]+/g, '');
    const isEmojiOnly = hasEmojis && textWithoutEmojisOrPunct.length === 0;

    let detectedType: 'emoji_only' | 'short_chat' | 'medium_message' | 'large_document' | 'massive_text' = 'medium_message';
    let typeLabel = 'Standard Paragraph';
    let speedEstimate = '⚡ Fast (~0.5s)';

    if (isEmojiOnly) {
      detectedType = 'emoji_only';
      typeLabel = 'Pure Emoji Reaction';
      speedEstimate = '⚡ Instant (< 2ms)';
    } else if (wordCount <= 15 || charCount <= 80) {
      detectedType = 'short_chat';
      typeLabel = 'Short Chat / Note';
      speedEstimate = '⚡ Ultra Fast (< 5ms)';
    } else if (wordCount <= 120) {
      detectedType = 'medium_message';
      typeLabel = 'Standard Message';
      speedEstimate = '⚡ Sub-Second (~0.5s)';
    } else if (wordCount <= 2500) {
      detectedType = 'large_document';
      typeLabel = 'Long Document';
      speedEstimate = '🚀 Optimized (~1.5s)';
    } else {
      detectedType = 'massive_text';
      typeLabel = 'Massive Multi-page Text';
      speedEstimate = '📑 Hierarchical (~2s)';
    }

    // Tone estimation
    const lower = trimmed.toLowerCase();
    const isQuestion = trimmed.includes('?') || /^(what|why|how|when|where|can we|could we|is it|should we)/i.test(trimmed);
    let tone = 'Informative / Neutral';

    if (detectedEmojis.some(e => ['🎉', '🚀', '🥳', '🔥', '💯', '🏆', '👏'].includes(e)) || /\b(congrats|awesome|great news|excited|milestone|won|shipped)\b/i.test(lower)) {
      tone = 'Celebratory & Enthusiastic';
    } else if (detectedEmojis.some(e => ['🚨', '⚠️', '🔥', '🛑'].includes(e)) || /\b(crashed|urgent|down|emergency|fatal|broken|critical|bug|outage)\b/i.test(lower)) {
      tone = 'Urgent Alert / Critical';
    } else if (isQuestion) {
      tone = 'Inquisitive / Question';
    } else if (detectedEmojis.some(e => ['👍', '❤️', '🙌', '🙏'].includes(e)) || /\b(thanks|thank you|appreciate|good job|perfect)\b/i.test(lower)) {
      tone = 'Appreciative / Positive';
    }

    return {
      wordCount,
      charCount,
      detectedType,
      typeLabel,
      emojis: detectedEmojis,
      allEmojiCount: allEmojiMatches.length,
      hasEmojis,
      tone,
      isEmojiOnly,
      speedEstimate
    };
  }, [text]);

  const samplePresets = [
    {
      title: '🎉 Pure Emojis',
      text: '🎉🚀💯',
      docTitle: 'Milestone Celebration'
    },
    {
      title: '👍 Quick Reaction',
      text: '👍',
      docTitle: 'Acknowledgement'
    },
    {
      title: '💬 Short Chat',
      text: 'See you at 3pm tomorrow! 🚀',
      docTitle: 'Meeting Sync'
    },
    {
      title: '❓ Inquiry',
      text: 'Can we reschedule our design review meeting to 4 PM tomorrow? 📅',
      docTitle: 'Schedule Inquiry'
    },
    {
      title: '🚨 Critical Alert',
      text: 'Server crashed 🚨 Need urgent fix for customer payment service immediately!',
      docTitle: 'Incident Report'
    },
    {
      title: '🚀 Milestone Update',
      text: 'Hey team! Great news 🔥 We just hit 10k active users today! 🚀 Keep pushing forward 💪',
      docTitle: 'Growth Milestone'
    },
    {
      title: '📄 Long Article',
      text: `The global transition toward renewable energy has accelerated substantially over the past five years. Driven by declining capital costs in solar photovoltaic installations and offshore wind turbines, investments in clean power capacity have outpaced fossil fuels across major economies. Governments throughout Europe, North America, and the Asia-Pacific region have enacted comprehensive decarbonization policies, establishing clean energy standards, emissions trading markets, and direct subsidies for high-capacity battery storage. Despite this momentum, critical bottlenecks remain in grid infrastructure expansion, inter-regional transmission lines, and the security of supply chains for critical minerals such as lithium, cobalt, and rare earths. Energy analysts project that meeting international net-zero targets by 2050 will require tripling annual renewable capacity additions by 2030 and modernizing legacy distribution networks.`,
      docTitle: 'Global Renewable Transition'
    }
  ];

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter or paste a message, text, or emojis to summarize.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setFeedbackSent(false);

    // Compute token limits based on length mode
    let maxLen = 150;
    let minLen: number | undefined = undefined;
    if (lengthMode === 'brief') {
      maxLen = 60;
      minLen = 10;
    } else if (lengthMode === 'detailed') {
      maxLen = 250;
      minLen = 30;
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
      setError(err.message || 'Summarization service encountered an error.');
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
      content = `TITLE: ${result.title || 'Summary'}\nMODEL: ${result.model_name} (v${result.model_version})\nDETECTED TYPE: ${result.detection?.type_label || 'Standard'}\nPROCESSING MODE: ${result.processing_mode || 'Auto'}\nLATENCY: ${result.processing_time_ms} ms\n\nSUMMARY:\n${result.summary}`;
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Zap className="w-5 h-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Universal Message & Text Summarizer
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
            Ultra-fast adaptive intelligence that detects and summarizes <strong className="text-cyan-300 font-medium">all message types</strong>: small chats, questions, alerts, pure emojis, medium paragraphs, and massive documents.
          </p>
        </div>

        {/* Engine Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Fast Engine Active</span>
        </div>
      </div>

      {/* Quick Type Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Try Presets:</span>
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {samplePresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setText(preset.text);
                setTitle(preset.docTitle);
                setError(null);
                setResult(null);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/15 hover:text-cyan-200 text-slate-300 border border-white/10 hover:border-cyan-500/30 transition-all shrink-0 font-medium"
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Glass Text Editor Card */}
      <GlassCard className="p-6 relative overflow-hidden">
        {/* Optional Document Title Input */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Bookmark className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs font-medium text-slate-300">Title / Subject (Optional)</label>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint Update, Team Chat, Incident 104..."
            className="w-full px-4 py-2 rounded-xl text-sm liquid-glass-input"
          />
        </div>

        {/* Large Text Area */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste anything here: small chat messages, pure emojis (e.g. 🎉🚀💯), alerts, questions, emails, or entire long documents..."
            rows={7}
            className="w-full p-4 rounded-xl text-sm liquid-glass-input resize-y font-sans leading-relaxed focus:ring-1 focus:ring-cyan-500/50"
          />

          {/* Live Message Intelligence Bar */}
          {text.trim() && (
            <div className="mt-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-fadeIn">
              <div className="flex flex-wrap items-center gap-2">
                {/* Detected Type Pill */}
                <span className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 ${
                  liveProfile.detectedType === 'emoji_only'
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                    : liveProfile.detectedType === 'short_chat'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : liveProfile.detectedType === 'medium_message'
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {liveProfile.detectedType === 'emoji_only' ? (
                    <Smile className="w-3.5 h-3.5" />
                  ) : liveProfile.detectedType === 'short_chat' ? (
                    <MessageSquare className="w-3.5 h-3.5" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span>{liveProfile.typeLabel}</span>
                </span>

                {/* Tone Pill */}
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-300 border border-white/10 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>{liveProfile.tone}</span>
                </span>

                {/* Emojis Detected Pill */}
                {liveProfile.hasEmojis && (
                  <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20 flex items-center gap-1.5">
                    <span>{liveProfile.emojis.join(' ')}</span>
                    <span className="text-[10px] text-pink-400">({liveProfile.allEmojiCount} emoji{liveProfile.allEmojiCount > 1 ? 's' : ''})</span>
                  </span>
                )}

                {/* Speed Estimate */}
                <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-mono">
                  {liveProfile.speedEstimate}
                </span>
              </div>

              {/* Counters & Clear */}
              <div className="flex items-center gap-3 text-slate-400 text-xs ml-auto">
                <span>{liveProfile.wordCount} words</span>
                <span>•</span>
                <span>{liveProfile.charCount} chars</span>
                <button
                  onClick={() => {
                    setText('');
                    setTitle('');
                    setResult(null);
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors ml-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Control Bar: Length, Options, and Generate */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Target Length Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-medium">Summary Length:</span>
            <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/10">
              {(['brief', 'standard', 'detailed'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLengthMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                    lengthMode === mode
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
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
                <span>Processing Message...</span>
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
                <span>Inference Mode:</span>
                <span className="text-cyan-300 font-mono">
                  {numBeams === 1 ? '⚡ Greedy Search (Fastest)' : `🔍 Beam Search (${numBeams} beams)`}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNumBeams(1)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                    numBeams === 1
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-white/[0.02] text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  ⚡ Fast Greedy (1 Beam)
                </button>
                <button
                  type="button"
                  onClick={() => setNumBeams(2)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                    numBeams === 2
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-white/[0.02] text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  🔍 Beam Search (2 Beams)
                </button>
              </div>
            </div>

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
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status="Generated Successfully" variant="healthy" />

                {/* Detected Category Badge */}
                {result.detection && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    result.detection.detected_type === 'emoji_only'
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                      : result.detection.detected_type === 'short_chat'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : result.detection.detected_type === 'medium_message'
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {result.detection.type_label}
                  </span>
                )}

                {/* Mode Pill */}
                {result.processing_mode && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>{result.processing_mode.replace(/_/g, ' ')}</span>
                  </span>
                )}

                <span className="text-xs text-slate-400 font-mono">
                  {result.model_name.replace('google/', '')}
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

          {/* Emoji Breakdown Card if emojis detected */}
          {result.detection?.has_emojis && result.detection.emoji_meanings.length > 0 && (
            <div className="mt-4 p-3.5 rounded-xl bg-pink-950/20 border border-pink-500/20 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-pink-300 uppercase tracking-wider">
                <Smile className="w-3.5 h-3.5 text-pink-400" />
                <span>Emoji Intelligence Breakdown</span>
                <span className="text-[10px] text-pink-400/80 font-normal">({result.detection.emoji_count} emoji detected)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {result.detection.emoji_meanings.map((meaning, i) => (
                  <div key={i} className="px-2.5 py-1.5 rounded-lg bg-black/30 border border-pink-500/10 text-xs text-slate-200 flex items-center gap-2">
                    <span className="text-base">{meaning.split(' ')[0]}</span>
                    <span className="text-slate-300 font-medium">{meaning.substring(meaning.indexOf(' ') + 1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated Summary Text */}
          <div className="py-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generated Summary</span>
              </h4>
              {result.detection?.tone && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <span>Detected Tone:</span>
                  <span className="text-slate-200 font-medium">{result.detection.tone}</span>
                </span>
              )}
            </div>
            <p className="text-slate-100 text-base md:text-lg leading-relaxed font-sans font-light bg-black/25 p-5 rounded-2xl border border-white/5 shadow-inner">
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
              <span className={`text-sm font-bold font-mono flex items-center gap-1 ${
                result.processing_time_ms <= 50 ? 'text-emerald-300' : 'text-amber-300'
              }`}>
                {result.processing_time_ms <= 10 ? '< 10 ms ⚡' : `${result.processing_time_ms} ms`}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-slate-400 block">Engine Mode</span>
              <span className="text-xs font-medium text-slate-200 truncate block">
                {result.processing_mode || 'Transformer'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-slate-400 block">Version</span>
              <span className="text-sm font-bold text-slate-200 font-mono">v{result.model_version}</span>
            </div>
          </div>

          {/* User Feedback Widget */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <span>Was this summary useful?</span>
              {feedbackSent ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Thank you for your feedback!</span>
                </span>
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
              <span>Summarize Another Message</span>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
