import { useEffect, useState } from 'react';

declare global {
  interface Window {
    loadPyodide: any;
  }
}

export function usePyodide() {
  const [pyodide, setPyodide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initPyodide() {
      try {
        if (!window.loadPyodide) {
          // If script hasn't loaded yet, wait a bit
          let retries = 0;
          while (!window.loadPyodide && retries < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
          }
        }

        if (!window.loadPyodide) {
          throw new Error('Pyodide script failed to load');
        }

        const py = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
        });
        setPyodide(py);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }

    initPyodide();
  }, []);

  const runTrace = async (code: string, entryPoint: string, args: string, tracerScript: string) => {
    if (!pyodide) return null;

    try {
      // Load the tracer script into the pyodide environment
      await pyodide.runPythonAsync(tracerScript);
      
      // Convert JS args to Python
      const pyArgs = pyodide.toPy(args);
      
      // Call our tracer function
      const traceResult = await pyodide.globals.get('trace_execution')(code, entryPoint, pyArgs);
      const result = traceResult.toJs({ dict_converter: Object.fromEntries });
      
      return result;
    } catch (err: any) {
      return { error: err.message };
    }
  };

  return { pyodide, loading, error, runTrace };
}
