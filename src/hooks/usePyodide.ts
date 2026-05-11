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
        let retries = 0;
        while (!window.loadPyodide && retries < 60) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
        if (!window.loadPyodide) throw new Error('Pyodide failed to load from CDN. Check your internet connection.');
        const py = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' });
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
      await pyodide.runPythonAsync(tracerScript);
      const jsonStr: string = await pyodide.globals.get('trace_execution')(code, entryPoint, args);
      return JSON.parse(jsonStr);
    } catch (err: any) {
      return { error: err.message };
    }
  };

  return { pyodide, loading, error, runTrace };
}
