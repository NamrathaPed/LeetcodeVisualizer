import { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';

loader.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

import { usePyodide } from './hooks/usePyodide';
import {
  ArrayVisualizer, VariableVisualizer, TreeVisualizer, LinkedListVisualizer,
  MapVisualizer, ReturnedValueVisualizer, CallStackVisualizer, MatrixVisualizer,
  SetVisualizer, DequeVisualizer, TupleVisualizer, CounterVisualizer
} from './components/Visualizers';
import { TRACER_PYTHON } from './lib/tracer';
import {
  Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Zap,
  Code as CodeIcon, LayoutDashboard, History, Activity, AlertCircle, CheckCircle2
} from 'lucide-react';

const DEFAULT_CODE = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        prevMap = {}  # val -> index

        for i, n in enumerate(nums):
            diff = target - n
            if diff in prevMap:
                return [prevMap[diff], i]
            prevMap[n] = i
        return []
`;

const DEFAULT_ARGS = '[[2, 7, 11, 15], 9]';

const SPEED_OPTIONS = [
  { label: '0.25×', ms: 2000 },
  { label: '0.5×',  ms: 1000 },
  { label: '1×',    ms: 500  },
  { label: '2×',    ms: 250  },
  { label: '4×',    ms: 100  },
];

// Variables whose names suggest they are array indices / pointers
const POINTER_NAMES = new Set([
  'i', 'j', 'k', 'l', 'r', 'p', 'q', 'x', 'y',
  'left', 'right', 'mid', 'start', 'end', 'idx', 'index',
  'ptr', 'lo', 'hi', 'low', 'high', 'begin', 'curr', 'cur',
  'prev', 'next', 'head', 'tail', 'top', 'bot', 'front', 'back',
  'slow', 'fast', 'pos', 'pointer', 'anchor', 'pivot', 'runner',
]);

export default function App() {
  const [code, setCode]             = useState(DEFAULT_CODE);
  const [argsStr, setArgsStr]       = useState(DEFAULT_ARGS);
  const [snapshots, setSnapshots]   = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [speedIdx, setSpeedIdx]     = useState(2);       // default 1×
  const [viewMode, setViewMode]     = useState<'live' | 'history'>('live');
  const [error, setError]           = useState<string | null>(null);
  const [execError, setExecError]   = useState<string | null>(null);
  const [isRunning, setIsRunning]   = useState(false);
  const [traceResult, setTraceResult] = useState<any | null>(null);

  const { runTrace, loading, error: pyError } = usePyodide();
  const timerRef        = useRef<any>(null);
  const editorRef       = useRef<any>(null);
  const decorationsRef  = useRef<string[]>([]);

  const speedMs = SPEED_OPTIONS[speedIdx].ms;

  // Auto-play
  useEffect(() => {
    if (isPlaying && currentStep < snapshots.length - 1) {
      timerRef.current = setTimeout(() => setCurrentStep(s => s + 1), speedMs);
    } else if (isPlaying && currentStep >= snapshots.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [isPlaying, currentStep, snapshots.length, speedMs]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (!snapshots.length) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setCurrentStep(s => Math.min(snapshots.length - 1, s + 1)); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setCurrentStep(s => Math.max(0, s - 1)); }
      if (e.key === ' ')          { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snapshots.length]);

  const currentSnapshot = snapshots[currentStep] ?? { line: 0, locals: {}, callStack: [], event: 'line', changedVars: [] };

  // Editor line highlight
  useEffect(() => {
    if (editorRef.current && currentSnapshot.line) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [{
        range: { startLineNumber: currentSnapshot.line, startColumn: 1, endLineNumber: currentSnapshot.line, endColumn: 1 },
        options: { isWholeLine: true, className: 'current-line-highlight', glyphMarginClassName: 'current-line-glyph' },
      }]);
      editorRef.current.revealLineInCenter(currentSnapshot.line);
    }
  }, [currentSnapshot.line, snapshots]);

  const handleRun = useCallback(async () => {
    setError(null);
    setExecError(null);
    setTraceResult(null);
    setIsRunning(true);
    setIsPlaying(false);
    setCurrentStep(0);
    setSnapshots([]);

    try {
      const methods = [...code.matchAll(/def\s+([a-zA-Z_]\w*)\s*\(/g)].map(m => m[1]);
      const mainMethod = methods.find(m => m !== '__init__') ?? 'solution';

      const result = await runTrace(code, mainMethod, argsStr, TRACER_PYTHON);

      if (!result) {
        setError('No result returned. Pyodide may not be ready yet.');
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }

      const snaps = result.snapshots ?? [];
      setSnapshots(snaps);
      setCurrentStep(0);
      setTraceResult(result);

      if (result.execError) setExecError(result.execError);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  }, [code, argsStr, runTrace]);

  // Extract current line text for the step info panel
  const codeLines = code.split('\n');
  const currentLineText = currentSnapshot.line > 0
    ? codeLines[currentSnapshot.line - 1]?.trimStart() ?? ''
    : '';

  // History: show only snapshots where something changed or it's a return
  const historySnapshots = snapshots.filter((s, i) => {
    if (i === 0) return true;
    if (s.event === 'return') return true;
    return (s.changedVars?.length ?? 0) > 0;
  });

  const renderVisualizers = (snapshot: any, stepIdx?: number) => {
    const { locals = {}, returnValue, callStack = [], changedVars = [], event } = snapshot;

    // Pointer detection: only named pointer variables within bounds of a known array
    const arrays = Object.entries(locals).filter(([, v]) => Array.isArray(v)) as [string, any[]][];
    const maxLen  = arrays.length > 0 ? Math.max(...arrays.map(([, v]) => v.length)) : 0;

    const pointers1D: Record<string, number> = {};
    const pointers2D: Record<string, number[]> = {};

    Object.entries(locals).forEach(([k, v]) => {
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) return;
      if (POINTER_NAMES.has(k.toLowerCase()) && v < maxLen) {
        pointers1D[k] = v;
      }
    });

    if (locals.r !== undefined && locals.c !== undefined) pointers2D['(r,c)'] = [locals.r, locals.c];
    if (locals.row !== undefined && locals.col !== undefined) pointers2D['(row,col)'] = [locals.row, locals.col];

    return (
      <div key={stepIdx ?? 'live'} className="snapshot-group" style={{ marginBottom: stepIdx !== undefined ? '60px' : 0 }}>
        {stepIdx !== undefined && (
          <div className="step-header">
            <Activity size={15} />
            <span>Step {stepIdx + 1} &mdash; Line {snapshot.line}</span>
            <span className={`event-badge event-${event}`}>{event?.toUpperCase()}</span>
            {changedVars.length > 0 && (
              <span className="changed-vars-badge">
                changed: {changedVars.join(', ')}
              </span>
            )}
          </div>
        )}

        <div className="visualizer-grid">
          {/* Left column */}
          <div className="visualizer-col-small">
            <CallStackVisualizer callStack={callStack} />
            <VariableVisualizer variables={locals} changedVars={changedVars} />
          </div>

          {/* Right column */}
          <div className="visualizer-col-main">
            {returnValue !== undefined && returnValue !== null && (
              <ReturnedValueVisualizer value={returnValue} />
            )}

            {Object.entries(locals).map(([name, value]) => {
              if (Array.isArray(value)) {
                return <ArrayVisualizer key={name} label={name} data={value} pointers={pointers1D} />;
              }
              if (typeof value === 'object' && value !== null) {
                const typed = value as { type?: string; data?: any; values?: any };
                if (typed.type === 'Matrix')     return <MatrixVisualizer     key={name} label={name} data={typed.data}   pointers={pointers2D} />;
                if (typed.type === 'Set')        return <SetVisualizer        key={name} label={name} data={typed.values} />;
                if (typed.type === 'Tuple')      return <TupleVisualizer      key={name} label={name} data={typed.values} />;
                if (typed.type === 'Deque')      return <DequeVisualizer      key={name} label={name} data={typed.values} />;
                if (typed.type === 'Counter')    return <CounterVisualizer    key={name} label={name} data={typed.data}   />;
                if (typed.type === 'TreeNode')   return <TreeVisualizer       key={name} label={name} data={value}        />;
                if (typed.type === 'LinkedList') return <LinkedListVisualizer key={name} label={name} data={value}        />;
                return <MapVisualizer key={name} label={name} data={value} />;
              }
              return null;
            })}
          </div>
        </div>
      </div>
    );
  };

  const disabled = !snapshots.length || isRunning;

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <Zap size={22} fill="currentColor" />
          AlgoTrace
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'live' ? 'active' : ''}`} onClick={() => setViewMode('live')}>
              <Play size={13} /> Live
            </button>
            <button className={`toggle-btn ${viewMode === 'history' ? 'active' : ''}`} onClick={() => setViewMode('history')}>
              <History size={13} /> History
            </button>
          </div>
          {loading && <span className="status-text">Initializing Python runtime…</span>}
          {isRunning && <span className="status-text running-pulse">Tracing…</span>}
          <button className="btn btn-primary" onClick={handleRun} disabled={loading || isRunning}>
            <Play size={16} fill="currentColor" />
            {isRunning ? 'Running…' : 'Run Trace'}
          </button>
        </div>
      </header>

      {/* ── Editor pane ── */}
      <div className="editor-pane">
        <div className="pane-title-bar">
          <CodeIcon size={14} color="var(--text-secondary)" />
          <span>SOLUTION.PY</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={v => setCode(v ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              glyphMargin: true,
              scrollBeyondLastLine: false,
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
            }}
            onMount={editor => { editorRef.current = editor; }}
          />
        </div>
        <div className="args-pane">
          <div className="args-label">
            <span>ARGUMENTS (Python / JSON)</span>
            <span className="args-hint">e.g. nums=[1,2], k=3 &nbsp;|&nbsp; [[1,2,3], 9] &nbsp;|&nbsp; make_list([1,2,3])</span>
          </div>
          <textarea
            className="args-textarea"
            value={argsStr}
            placeholder="e.g. [2, 7, 11, 15], 9"
            onChange={e => setArgsStr(e.target.value)}
          />
        </div>
      </div>

      {/* ── Visualizer pane ── */}
      <div className="visualizer-pane">
        {/* Step info bar */}
        {snapshots.length > 0 && viewMode === 'live' && (
          <div className="step-info-bar">
            <span className={`event-badge event-${currentSnapshot.event}`}>
              {currentSnapshot.event?.toUpperCase()}
            </span>
            <span className="step-info-line">
              Line {currentSnapshot.line}: <code>{currentLineText}</code>
            </span>
            {(currentSnapshot.changedVars ?? []).length > 0 && (
              <span className="changed-pill">
                ✦ {currentSnapshot.changedVars.join(', ')}
              </span>
            )}
            {traceResult?.result !== undefined && currentStep === snapshots.length - 1 && (
              <span className="result-pill">
                <CheckCircle2 size={13} /> result: {JSON.stringify(traceResult.result)}
              </span>
            )}
          </div>
        )}

        <div className="visualization-canvas">
          {/* Errors */}
          {(error || pyError) && (
            <div className="error-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={16} />
                <strong>Error</strong>
              </div>
              <pre>{error || pyError}</pre>
            </div>
          )}
          {execError && (
            <div className="error-box warn">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={16} />
                <strong>Runtime Exception (partial trace available)</strong>
              </div>
              <pre>{execError}</pre>
            </div>
          )}

          {/* Visualizations */}
          {viewMode === 'live' ? (
            snapshots.length > 0 ? renderVisualizers(currentSnapshot) : null
          ) : (
            <div className="history-timeline">
              {historySnapshots.map((snap, idx) => renderVisualizers(snap, idx))}
            </div>
          )}

          {/* Empty state */}
          {!snapshots.length && !isRunning && !error && !pyError && (
            <div className="empty-state">
              <LayoutDashboard size={44} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.4 }} />
              <p style={{ marginBottom: '8px' }}>Paste any Python solution and click <strong>Run Trace</strong>.</p>
              <p className="empty-hints">
                Supports: arrays · matrices · linked lists · trees · dicts · sets · deques · tuples · recursive functions
              </p>
              <p className="empty-hints" style={{ marginTop: '6px' }}>
                Keyboard: <kbd>←</kbd> <kbd>→</kbd> step &nbsp; <kbd>Space</kbd> play/pause
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Controls pane ── */}
      <div className="controls-pane">
        <div className="step-controls">
          <button className="btn" title="Reset (Home)" onClick={() => { setCurrentStep(0); setIsPlaying(false); }} disabled={disabled}>
            <RotateCcw size={16} />
          </button>
          <button className="btn" title="Previous (←)" onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={disabled}>
            <ChevronLeft size={18} />
          </button>
          <button className="btn btn-play" title="Play/Pause (Space)" onClick={() => setIsPlaying(p => !p)} disabled={disabled}>
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button className="btn" title="Next (→)" onClick={() => setCurrentStep(s => Math.min(snapshots.length - 1, s + 1))} disabled={disabled}>
            <ChevronRight size={18} />
          </button>
        </div>

        <input
          type="range"
          className="progress-slider"
          min={0}
          max={snapshots.length ? snapshots.length - 1 : 0}
          value={currentStep}
          onChange={e => { setCurrentStep(parseInt(e.target.value)); setIsPlaying(false); }}
          disabled={disabled}
        />

        <div className="controls-right">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {snapshots.length ? `${currentStep + 1} / ${snapshots.length}` : '— / —'}
          </div>
          <div className="speed-selector">
            {SPEED_OPTIONS.map((opt, i) => (
              <button
                key={i}
                className={`speed-btn ${i === speedIdx ? 'active' : ''}`}
                onClick={() => setSpeedIdx(i)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
