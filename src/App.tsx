import { useState, useEffect, useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';

// Configure Monaco loader to use a specific CDN version for stability
loader.config({
  paths: {
    vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs'
  }
});
import { usePyodide } from './hooks/usePyodide';
import { ArrayVisualizer, VariableVisualizer, TreeVisualizer, LinkedListVisualizer, MapVisualizer, ReturnedValueVisualizer } from './components/Visualizers';
import { TRACER_PYTHON } from './lib/tracer';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Zap,
  Code as CodeIcon,
  LayoutDashboard,
  History,
  Activity
} from 'lucide-react';

const DEFAULT_CODE = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        prevMap = {} # val : index
        
        for i, n in enumerate(nums):
            diff = target - n
            if diff in prevMap:
                return [prevMap[diff], i]
            prevMap[n] = i
        return
`;

const DEFAULT_ARGS = "[[2, 7, 11, 15], 9]";

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [argsStr, setArgsStr] = useState(DEFAULT_ARGS);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'live' | 'history'>('live');
  const [error, setError] = useState<string | null>(null);
  const { runTrace, loading, error: pyError } = usePyodide();
  
  const timerRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    if (isPlaying && currentStep < snapshots.length - 1) {
      timerRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 500);
    } else {
      setIsPlaying(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [isPlaying, currentStep, snapshots.length]);

  const currentSnapshot = snapshots[currentStep] || { line: 0, locals: {} };

  useEffect(() => {
    if (editorRef.current && currentSnapshot.line) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
        {
          range: { startLineNumber: currentSnapshot.line, startColumn: 1, endLineNumber: currentSnapshot.line, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: 'current-line-highlight',
            glyphMarginClassName: 'current-line-glyph',
          },
        },
      ]);
      editorRef.current.revealLineInCenter(currentSnapshot.line);
    }
  }, [currentSnapshot.line, snapshots]);

  const handleRun = async () => {
    setError(null);
    try {
      const parsedArgs = JSON.parse(argsStr);
      
      // Detect method name from code
      let methodToTrace = 'twoSum';
      const match = code.match(/def\s+(\w+)\s*\(/);
      if (match) {
        methodToTrace = match[1];
      }

      const result = await runTrace(code, methodToTrace, parsedArgs, TRACER_PYTHON);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSnapshots(result.snapshots);
        setCurrentStep(0);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderVisualizers = (snapshot: any, index?: number) => {
    const { locals, returnValue } = snapshot;
    return (
      <div key={index} className="snapshot-group" style={{ marginBottom: index !== undefined ? '60px' : '0' }}>
        {index !== undefined && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)' }}>
            <Activity size={16} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Step {index + 1} (Line {snapshot.line})
            </span>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {returnValue !== undefined && returnValue !== null && (
            <div style={{ gridColumn: 'span 2' }}>
              <ReturnedValueVisualizer value={returnValue} />
            </div>
          )}
          <VariableVisualizer variables={locals} />
          {Object.entries(locals).map(([name, value]) => {
            if (Array.isArray(value)) {
              return <ArrayVisualizer key={name} label={name} data={value} />;
            }
            if (typeof value === 'object' && value !== null) {
              const typedValue = value as { type?: string };
              if (typedValue.type === 'TreeNode') {
                return <TreeVisualizer key={name} label={name} data={value} />;
              }
              if (typedValue.type === 'LinkedList') {
                return <LinkedListVisualizer key={name} label={name} data={value} />;
              }
              return <MapVisualizer key={name} label={name} data={value} />;
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <Zap size={24} fill="currentColor" />
          NeetVisualizer
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="view-toggle">
             <button className={`toggle-btn ${viewMode === 'live' ? 'active' : ''}`} onClick={() => setViewMode('live')}>
               <Play size={14} /> Live
             </button>
             <button className={`toggle-btn ${viewMode === 'history' ? 'active' : ''}`} onClick={() => setViewMode('history')}>
               <History size={14} /> History
             </button>
          </div>
          {loading && <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Initializing Python...</span>}
          <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
            <Play size={18} fill="currentColor" />
            Run Trace
          </button>
        </div>
      </header>

      <div className="editor-pane">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CodeIcon size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>SOLUTION.PY</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              glyphMargin: true,
              scrollBeyondLastLine: false,
            }}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        </div>
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: '#111' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>FUNCTION ARGUMENTS (JSON LIST)</span>
            <span style={{ opacity: 0.6 }}>e.g. [[1,2,3]] or [arg1, arg2]</span>
          </div>
          <input 
            className="btn" 
            style={{ width: '100%', fontFamily: 'var(--font-mono)', textAlign: 'left', background: '#000' }}
            value={argsStr}
            placeholder="e.g. [[1, 2, 3], 10]"
            onChange={(e) => setArgsStr(e.target.value)}
          />
        </div>
      </div>

      <div className="visualizer-pane">
        <div className="visualization-canvas">
          {(error || pyError) && (
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-color)', borderRadius: '8px', color: 'var(--error-color)', fontSize: '0.9rem', marginBottom: '20px' }}>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{error || pyError}</pre>
            </div>
          )}

          {viewMode === 'live' ? (
            renderVisualizers(currentSnapshot)
          ) : (
            <div className="history-timeline">
               {snapshots.filter((s, i) => {
                  // Filter to only show snapshots where a variable changed or it's a return
                  if (i === 0) return true;
                  if (s.event === 'return') return true;
                  return JSON.stringify(s.locals) !== JSON.stringify(snapshots[i-1].locals);
               }).map((snapshot, idx) => renderVisualizers(snapshot, idx))}
            </div>
          )}

          {!snapshots.length && !loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
               <LayoutDashboard size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5 }} />
               <p>Write your solution and click Run Trace to visualize execution.</p>
            </div>
          )}
        </div>
      </div>

      <div className="controls-pane">
        <div className="step-controls">
          <button className="btn" onClick={() => setCurrentStep(0)} disabled={!snapshots.length}>
            <RotateCcw size={18} />
          </button>
          <button className="btn" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={!snapshots.length}>
            <ChevronLeft size={20} />
          </button>
          <button className="btn" onClick={() => setIsPlaying(!isPlaying)} disabled={!snapshots.length}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button className="btn" onClick={() => setCurrentStep(Math.min(snapshots.length - 1, currentStep + 1))} disabled={!snapshots.length}>
            <ChevronRight size={20} />
          </button>
        </div>

        <input 
          type="range" 
          className="progress-slider"
          min={0}
          max={snapshots.length ? snapshots.length - 1 : 0}
          value={currentStep}
          onChange={(e) => setCurrentStep(parseInt(e.target.value))}
          disabled={!snapshots.length}
        />

        <div style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Step {snapshots.length ? currentStep + 1 : 0} / {snapshots.length}
        </div>
      </div>
    </div>
  );
}
