import { useEffect, useState, useRef } from 'react';

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
        // Load the pyodide script dynamically
        if (!document.getElementById('pyodide-script')) {
          const script = document.createElement('script');
          script.id = 'pyodide-script';
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
          script.async = true;
          document.head.appendChild(script);

          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }

        const py = await window.loadPyodide();
        setPyodide(py);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }

    initPyodide();
  }, []);

  const runTrace = async (code: string, entryPoint: string, args: any[], tracerScript: string) => {
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
