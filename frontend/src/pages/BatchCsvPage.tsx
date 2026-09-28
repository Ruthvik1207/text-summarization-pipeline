import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  Sliders,
  Check
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { api } from '../services/api';
import { BatchItemResult } from '../types';

interface CsvRow {
  _index: number;
  [key: string]: any;
}

export const BatchCsvPage: React.FC = () => {
  const [fileName, setFileName] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [textColumn, setTextColumn] = useState<string>('');
  const [titleColumn, setTitleColumn] = useState<string>('');
  const [refColumn, setRefColumn] = useState<string>('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Generation Configuration
  const [maxLength, setMaxLength] = useState<number>(150);
  const [minLength, setMinLength] = useState<number>(40);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [numBeams, setNumBeams] = useState<number>(2);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Execution States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [results, setResults] = useState<Record<number, BatchItemResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedRow, setCopiedRow] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV string cleanly supporting quotes and newlines
  const parseCSV = (csvText: string) => {
    const lines: string[] = [];
    let currentLine = '';
    let insideQuote = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      if (char === '"') {
        insideQuote = !insideQuote;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !insideQuote) {
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
        if (char === '\r' && csvText[i + 1] === '\n') {
          i++;
        }
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    if (lines.length < 2) {
      throw new Error('CSV file must contain a header row and at least one data row.');
    }

    // Parse a line into fields
    const parseLine = (line: string): string[] => {
      const fields: string[] = [];
      let field = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          fields.push(field.trim());
          field = '';
        } else {
          field += c;
        }
      }
      fields.push(field.trim());
      return fields;
    };

    const rawHeaders = parseLine(lines[0]);
    const headers = rawHeaders.map((h, i) => h.replace(/^["']|["']$/g, '').trim() || `col_${i + 1}`);

    const parsedRows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length === 1 && !values[0]) continue;
      const rowObj: CsvRow = { _index: i - 1 };
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '').trim() : '';
      });
      parsedRows.push(rowObj);
    }

    return { headers, rows: parsedRows };
  };

  const handleFileUpload = (uploadedFile: File) => {
    if (!uploadedFile.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    setError(null);
    setFileName(uploadedFile.name);
    setResults({});

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers, rows: parsedRows } = parseCSV(text);

        setColumns(headers);
        setRows(parsedRows);

        // Auto-detect columns
        const textCandidate = headers.find(h =>
          /article|text|content|document|body|paragraph|input/i.test(h)
        ) || headers[0];
        setTextColumn(textCandidate);

        const titleCandidate = headers.find(h =>
          /title|headline|name|topic|header/i.test(h)
        ) || '';
        setTitleColumn(titleCandidate);

        const refCandidate = headers.find(h =>
          /summary|reference|target|ground_truth|abstract/i.test(h)
        ) || '';
        setRefColumn(refCandidate);
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const loadSampleDataset = () => {
    const sampleCsv = `id,title,article,summary
1,Renewable Energy Transition,"The global transition toward renewable energy has accelerated substantially over the past five years. Driven by declining capital costs in solar photovoltaic installations and offshore wind turbines, investments in clean power capacity have outpaced fossil fuels across major economies. Governments throughout Europe, North America, and the Asia-Pacific region have enacted comprehensive decarbonization policies, establishing clean energy standards, emissions trading markets, and direct subsidies for high-capacity battery storage. Analysts project that meeting international net-zero targets by 2050 will require tripling annual renewable capacity additions by 2030 and modernizing legacy distribution networks.","Renewable energy adoption has accelerated with clean investments outpacing fossil fuels. Decarbonization policies and grid modernization are required to reach 2050 net-zero targets."
2,Transformer Architecture,"Natural language processing and generative artificial intelligence have undergone profound advancements following the widespread adoption of the Transformer neural network architecture. Utilizing self-attention mechanisms that dynamically compute token relationships across large sequence lengths, transformer models such as T5, FLAN-T5, and BERT overcome the sequential processing bottlenecks of traditional recurrent neural networks. These models excel at contextual comprehension, abstractive summarization, and multilingual machine translation.","Transformer models have revolutionized NLP through self-attention mechanisms, surpassing traditional recurrent neural networks in contextual understanding and abstractive summarization."
3,Autonomous Navigation Systems,"Self-driving vehicle platforms rely on multi-sensor fusion combining light detection and ranging (LiDAR), high-resolution optical cameras, and millimeter-wave radar to construct comprehensive three-dimensional environmental perceptions. Embedded edge computing nodes execute deep convolutional and graph neural networks to perform real-time lane detection, obstacle classification, and predictive trajectory planning under microsecond latency constraints. Rigorous simulation frameworks augment road testing to validate safety under rare edge scenarios.","Autonomous vehicles utilize multi-sensor fusion and edge neural networks for real-time obstacle perception and trajectory planning, validated through road testing and simulations."
4,Biomedical mRNA Vaccines,"The successful development and global deployment of messenger RNA (mRNA) vaccine platforms represents a paradigm shift in preventative medicine and immunobiology. By encapsulating synthetic nucleotide-modified mRNA molecules inside lipid nanoparticles, the formulations deliver cellular instructions to synthesize target antigenic proteins without introducing live pathogens. This modular platform enables rapid formulation adjustments against novel viral mutations and is currently being adapted for personalized oncological therapeutics.","mRNA vaccine platforms use lipid nanoparticles to instruct cellular antigen synthesis, offering a modular framework for rapid viral adaptation and cancer therapeutics."
5,Quantum Computing Paradigms,"Quantum computational systems exploit fundamental quantum mechanics principles, namely superposition and entanglement, to evaluate complex mathematical solution spaces exponentially faster than classical silicon architectures. Utilizing superconducting circuits, trapped ions, or photonic qubits maintained at sub-Kelvin temperatures, quantum processors demonstrate transformative potential in quantum chemistry simulations, cryptography, and combinatorial optimization problems.","Quantum computing utilizes superposition and entanglement to solve complex optimization, chemistry, and cryptographic problems exponentially faster than classical computers."`;

    const sampleBlob = new Blob([sampleCsv], { type: 'text/csv' });
    const sampleFile = new File([sampleBlob], 'sample_summarization_dataset.csv', { type: 'text/csv' });
    handleFileUpload(sampleFile);
  };

  // Process a single row
  const summarizeSingleRow = async (row: CsvRow) => {
    const rawText = row[textColumn];
    if (!rawText || !rawText.trim()) return;

    const rowIdx = row._index;
    const title = titleColumn ? row[titleColumn] : undefined;
    const refSummary = refColumn ? row[refColumn] : undefined;

    setResults(prev => ({
      ...prev,
      [rowIdx]: {
        id: String(rowIdx),
        title,
        original_text: rawText,
        input_words: rawText.split(/\s+/).length,
        input_characters: rawText.length,
        summary: 'Summarizing text with FLAN-T5...',
        summary_words: 0,
        compression_ratio: 0,
        processing_time_ms: 0,
        status: 'skipped'
      }
    }));

    try {
      const batchRes = await api.summarizeBatch({
        items: [{
          id: String(rowIdx),
          text: rawText,
          title,
          reference_summary: refSummary
        }],
        max_length: maxLength,
        min_length: minLength,
        temperature,
        num_beams: numBeams
      });

      if (batchRes.results.length > 0) {
        setResults(prev => ({
          ...prev,
          [rowIdx]: batchRes.results[0]
        }));
      }
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [rowIdx]: {
          id: String(rowIdx),
          title,
          original_text: rawText,
          input_words: rawText.split(/\s+/).length,
          input_characters: rawText.length,
          summary: '',
          summary_words: 0,
          compression_ratio: 0,
          processing_time_ms: 0,
          status: 'failed',
          error: err.message || 'Summarization failed'
        }
      }));
    }
  };

  // Batch process rows
  const handleBatchSummarize = async (limit?: number) => {
    if (!textColumn) {
      setError('Please select a valid text column.');
      return;
    }

    const rowsToProcess = limit ? rows.slice(0, limit) : rows;
    if (rowsToProcess.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress({ current: 0, total: rowsToProcess.length });

    // Process in chunks of 5 for optimal feedback & reliability
    const chunkSize = 5;
    for (let i = 0; i < rowsToProcess.length; i += chunkSize) {
      const chunk = rowsToProcess.slice(i, i + chunkSize);
      const items = chunk.map(r => ({
        id: String(r._index),
        text: r[textColumn] || '',
        title: titleColumn ? r[titleColumn] : undefined,
        reference_summary: refColumn ? r[refColumn] : undefined
      }));

      try {
        const res = await api.summarizeBatch({
          items,
          max_length: maxLength,
          min_length: minLength,
          temperature,
          num_beams: numBeams
        });

        setResults(prev => {
          const next = { ...prev };
          res.results.forEach((r, idx) => {
            const rowIndex = chunk[idx]._index;
            next[rowIndex] = r;
          });
          return next;
        });
      } catch (err: any) {
        setError(`Batch error on rows ${i + 1}-${i + chunk.length}: ${err.message}`);
      }

      setProgress({
        current: Math.min(i + chunkSize, rowsToProcess.length),
        total: rowsToProcess.length
      });
    }

    setIsProcessing(false);
  };

  // Export results to CSV
  const handleExportCsv = () => {
    if (rows.length === 0) return;

    const exportHeaders = [
      ...columns,
      'model_summary',
      'summary_words',
      'compression_ratio',
      'latency_ms',
      'rougeL'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [
      exportHeaders.join(','),
      ...rows.map(row => {
        const res = results[row._index];
        const rowValues = columns.map(c => escapeCsv(row[c]));
        rowValues.push(escapeCsv(res?.summary || ''));
        rowValues.push(escapeCsv(res?.summary_words || ''));
        rowValues.push(escapeCsv(res ? (res.compression_ratio * 100).toFixed(1) + '%' : ''));
        rowValues.push(escapeCsv(res?.processing_time_ms || ''));
        rowValues.push(escapeCsv(res?.rougeL !== undefined && res?.rougeL !== null ? res.rougeL : ''));
        return rowValues.join(',');
      })
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summarized_${fileName || 'dataset'}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Data Health Stats
  const totalRows = rows.length;
  const wordCounts = rows.map(r => (r[textColumn] ? String(r[textColumn]).split(/\s+/).length : 0));
  const avgWords = totalRows > 0 ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / totalRows) : 0;
  const minWords = totalRows > 0 ? Math.min(...wordCounts) : 0;
  const maxWords = totalRows > 0 ? Math.max(...wordCounts) : 0;
  const chunkNeededCount = wordCounts.filter(w => w > 350).length;
  const processedCount = Object.keys(results).filter(k => results[Number(k)]?.status === 'success').length;

  const filteredRows = rows.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const textVal = String(r[textColumn] || '').toLowerCase();
    const titleVal = titleColumn ? String(r[titleColumn] || '').toLowerCase() : '';
    return textVal.includes(term) || titleVal.includes(term);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-cyan-400" />
            <span>CSV Batch Summarization & Text Inspector</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload custom CSV datasets, inspect document health, and run FLAN-T5 abstractive summarization at scale.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSampleDataset}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample CSV</span>
          </button>
          {rows.length > 0 && (
            <button
              onClick={() => {
                setFileName('');
                setRows([]);
                setColumns([]);
                setResults({});
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Zone (if no file loaded) */}
      {rows.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-2 border-cyan-500/30 hover:border-cyan-500/60 transition-colors">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4 shadow-glow-cyan">
              <UploadCloud className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Upload Your CSV Dataset</h3>
            <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
              Drag and drop your <code className="text-cyan-300">.csv</code> file here or browse from your computer. Supports articles, news reports, research abstracts, and multi-column tables.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
              accept=".csv"
              className="hidden"
            />
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl font-medium text-xs text-black bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 shadow-glow-cyan transition-all"
              >
                Browse CSV File
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSampleDataset();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-colors"
              >
                Or Try Sample Dataset
              </button>
            </div>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* File Overview & Column Selector Ribbon */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">{fileName}</h3>
                  <p className="text-xs text-slate-400">
                    {totalRows} rows loaded • {columns.length} columns detected
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Model Settings</span>
                </button>

                <div className="h-4 w-px bg-white/10 hidden sm:block" />

                <button
                  onClick={() => handleBatchSummarize(5)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  <span>Run First 5 Rows</span>
                </button>

                <button
                  onClick={() => handleBatchSummarize()}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold text-black bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 shadow-glow-cyan transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Summarize All ({totalRows})</span>
                </button>

                {processedCount > 0 && (
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>
            </div>

            {/* Column Mapping Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Text Column to Summarize <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={textColumn}
                  onChange={(e) => setTextColumn(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {columns.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Title Column <span className="text-slate-500">(Optional)</span>
                </label>
                <select
                  value={titleColumn}
                  onChange={(e) => setTitleColumn(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- None --</option>
                  {columns.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Reference Summary Column <span className="text-slate-500">(For ROUGE Scores)</span>
                </label>
                <select
                  value={refColumn}
                  onChange={(e) => setRefColumn(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- None --</option>
                  {columns.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Collapsible Model Generation Configuration */}
            {showConfig && (
              <div className="pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fadeIn">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Max Summary Tokens: {maxLength}</span>
                  <input
                    type="range"
                    min="30"
                    max="300"
                    step="10"
                    value={maxLength}
                    onChange={(e) => setMaxLength(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Min Summary Tokens: {minLength}</span>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="5"
                    value={minLength}
                    onChange={(e) => setMinLength(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Temperature: {temperature}</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Beam Search: {numBeams}</span>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={numBeams}
                    onChange={(e) => setNumBeams(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            )}
          </GlassCard>

          {/* Progress Bar (During Active Batch Run) */}
          {isProcessing && (
            <GlassCard className="p-4 border-cyan-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-cyan-300 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Processing FLAN-T5 Batch Summarization...</span>
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {progress.current} / {progress.total} Rows ({Math.round((progress.current / maxWords || 1) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 transition-all duration-300"
                  style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                />
              </div>
            </GlassCard>
          )}

          {/* Data Quality & Text Health Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Avg Word Count</span>
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold font-mono text-white mt-2">{avgWords} words</div>
              <span className="text-[11px] text-slate-500 mt-1 block">Range: {minWords} - {maxWords} words</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Text Health Check</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-2">
                {totalRows - chunkNeededCount} Optimal
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Fits standard T5 context</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recursive Chunking</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-2">
                {chunkNeededCount} Rows
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">&gt;350 words, auto-chunked</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Summaries Ready</span>
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-xl font-bold font-mono text-violet-300 mt-2">
                {processedCount} / {totalRows}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Generated with FLAN-T5</span>
            </div>
          </div>

          {/* Search Filter & Table */}
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search articles or titles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="text-xs text-slate-400">
                Showing {filteredRows.length} of {totalRows} rows
              </div>
            </div>

            {/* Interactive Data Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-slate-400 font-mono uppercase text-[11px] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4 w-12">#</th>
                    {titleColumn && <th className="py-3 px-4 w-44">Title</th>}
                    <th className="py-3 px-4 min-w-[280px]">Original Text</th>
                    <th className="py-3 px-4 w-28 text-center">Words</th>
                    <th className="py-3 px-4 min-w-[320px]">FLAN-T5 Summary</th>
                    <th className="py-3 px-4 w-32 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredRows.map((row) => {
                    const rowIdx = row._index;
                    const res = results[rowIdx];
                    const isExpanded = expandedRow === rowIdx;
                    const rawText = String(row[textColumn] || '');
                    const wordCount = rawText ? rawText.split(/\s+/).length : 0;
                    const isLong = wordCount > 350;

                    return (
                      <React.Fragment key={rowIdx}>
                        <tr className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-500">{rowIdx + 1}</td>

                          {titleColumn && (
                            <td className="py-3.5 px-4 font-medium text-slate-200">
                              <span className="line-clamp-2">{row[titleColumn] || 'Untitled'}</span>
                            </td>
                          )}

                          <td className="py-3.5 px-4">
                            <p className="text-slate-300 line-clamp-2 leading-relaxed">
                              {rawText || <span className="text-slate-600 italic">Empty text</span>}
                            </p>
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : rowIdx)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 mt-1 flex items-center gap-1 font-mono transition-colors"
                            >
                              <span>{isExpanded ? 'Hide Full Text' : 'View Full Text'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-bold text-slate-300">{wordCount}</span>
                            <span className={`block text-[10px] mt-0.5 ${isLong ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {isLong ? 'Chunked' : 'Optimal'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {res ? (
                              res.status === 'success' ? (
                                <div className="space-y-1.5">
                                  <p className="text-cyan-100 leading-relaxed font-light bg-black/30 p-2.5 rounded-lg border border-cyan-500/20">
                                    {res.summary}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                                    <span className="text-emerald-400">
                                      Ratio: {(res.compression_ratio * 100).toFixed(1)}%
                                    </span>
                                    <span>•</span>
                                    <span className="text-amber-300">
                                      {res.processing_time_ms} ms
                                    </span>
                                    {res.rougeL !== undefined && res.rougeL !== null && (
                                      <>
                                        <span>•</span>
                                        <span className="text-violet-300">
                                          ROUGE-L: {res.rougeL}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-rose-400 text-xs flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{res.error || 'Failed'}</span>
                                </div>
                              )
                            ) : (
                              <span className="text-slate-600 text-xs italic">Not summarized yet</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => summarizeSingleRow(row)}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-cyan-300 bg-white/[0.04] hover:bg-cyan-500/10 hover:text-cyan-200 border border-white/10 hover:border-cyan-500/30 transition-all disabled:opacity-50"
                            >
                              {res?.status === 'success' ? 'Re-run' : 'Summarize'}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Full Text Drawer */}
                        {isExpanded && (
                          <tr className="bg-black/40 border-b border-white/5">
                            <td colSpan={titleColumn ? 6 : 5} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-semibold uppercase font-mono text-slate-400">
                                      Full Original Document ({rawText.length} characters)
                                    </h4>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(rawText);
                                        setCopiedRow(rowIdx);
                                        setTimeout(() => setCopiedRow(null), 2000);
                                      }}
                                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                    >
                                      {copiedRow === rowIdx ? <Check className="w-3 h-3" /> : null}
                                      <span>{copiedRow === rowIdx ? 'Copied' : 'Copy Text'}</span>
                                    </button>
                                  </div>
                                  <p className="text-xs text-slate-200 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-sans">
                                    {rawText}
                                  </p>
                                </div>

                                {refColumn && row[refColumn] && (
                                  <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/20">
                                    <h4 className="text-xs font-semibold uppercase font-mono text-violet-400 mb-2">
                                      Ground Truth Reference Summary
                                    </h4>
                                    <p className="text-xs text-violet-100 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-sans">
                                      {row[refColumn]}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
