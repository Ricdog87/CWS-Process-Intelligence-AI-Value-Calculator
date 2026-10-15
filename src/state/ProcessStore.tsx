import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AI_CATALOG, DEFAULT_EUR_PER_USD } from '../config/aiPlatforms';
import { createDemoProcesses } from '../data/demoData';
import { defaultAiSettings, loadAiSettings, saveAiSettings, type AiSettings } from '../lib/aiSettings';
import { evaluateProcess, type AiContext, type ProcessEvaluation } from '../lib/evaluation';
import { createId, getBrowserStorage, loadProcesses, saveProcesses } from '../lib/storage';
import type { BusinessProcess, ProcessDraft, ProcessStatus } from '../types/process';

interface ProcessStore {
  processes: BusinessProcess[];
  evaluations: Map<string, ProcessEvaluation>;
  getProcess: (id: string) => BusinessProcess | undefined;
  addProcess: (draft: ProcessDraft) => BusinessProcess;
  updateProcess: (id: string, patch: Partial<ProcessDraft>) => void;
  deleteProcess: (id: string) => void;
  setStatus: (id: string, status: ProcessStatus) => void;
  /** Restores the original demo records; user-created processes are kept. */
  resetDemoData: () => void;
  clearAll: () => void;
  /** Assumptions of the AI cost model (prices, policy) and the context used for every evaluation. */
  aiSettings: AiSettings;
  aiContext: AiContext;
  updateAiSettings: (patch: Partial<AiSettings>) => void;
  resetAiSettings: () => void;
  /** Persistent storage problem (shown as banner), null if fine. */
  storageWarning: string | null;
  dismissStorageWarning: () => void;
}

const ProcessStoreContext = createContext<ProcessStore | null>(null);

export function ProcessStoreProvider({ children }: { children: ReactNode }) {
  const storage = useRef(getBrowserStorage());
  const [initial] = useState(() => loadProcesses(storage.current));
  const [processes, setProcesses] = useState<BusinessProcess[]>(initial.processes);
  const [storageWarning, setStorageWarning] = useState<string | null>(initial.warning ?? null);
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings(storage.current, defaultAiSettings(DEFAULT_EUR_PER_USD)));

  useEffect(() => {
    const error = saveProcesses(storage.current, processes);
    if (error) setStorageWarning(error);
  }, [processes]);

  useEffect(() => {
    const error = saveAiSettings(storage.current, aiSettings);
    if (error) setStorageWarning(error);
  }, [aiSettings]);

  const aiContext = useMemo<AiContext>(() => ({ settings: aiSettings, catalog: AI_CATALOG }), [aiSettings]);
  const updateAiSettings = useCallback((patch: Partial<AiSettings>) => setAiSettings((s) => ({ ...s, ...patch })), []);
  const resetAiSettings = useCallback(() => setAiSettings(defaultAiSettings(DEFAULT_EUR_PER_USD)), []);

  const evaluations = useMemo(() => new Map(processes.map((p) => [p.id, evaluateProcess(p, aiContext)])), [processes, aiContext]);

  const getProcess = useCallback((id: string) => processes.find((p) => p.id === id), [processes]);

  const addProcess = useCallback((draft: ProcessDraft) => {
    const now = new Date().toISOString();
    const process: BusinessProcess = { ...draft, id: createId(), isDemo: false, createdAt: now, updatedAt: now };
    setProcesses((list) => [process, ...list]);
    return process;
  }, []);

  const updateProcess = useCallback((id: string, patch: Partial<ProcessDraft>) => {
    const now = new Date().toISOString();
    setProcesses((list) => list.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now } : p)));
  }, []);

  const deleteProcess = useCallback((id: string) => {
    setProcesses((list) => list.filter((p) => p.id !== id));
  }, []);

  const setStatus = useCallback(
    (id: string, status: ProcessStatus) => updateProcess(id, { status }),
    [updateProcess],
  );

  const resetDemoData = useCallback(() => {
    setProcesses((list) => [...list.filter((p) => !p.isDemo), ...createDemoProcesses()]);
  }, []);

  const clearAll = useCallback(() => setProcesses([]), []);

  const value = useMemo<ProcessStore>(
    () => ({
      processes,
      evaluations,
      getProcess,
      addProcess,
      updateProcess,
      deleteProcess,
      setStatus,
      resetDemoData,
      clearAll,
      aiSettings,
      aiContext,
      updateAiSettings,
      resetAiSettings,
      storageWarning,
      dismissStorageWarning: () => setStorageWarning(null),
    }),
    [processes, evaluations, getProcess, addProcess, updateProcess, deleteProcess, setStatus, resetDemoData, clearAll, aiSettings, aiContext, updateAiSettings, resetAiSettings, storageWarning],
  );

  return <ProcessStoreContext.Provider value={value}>{children}</ProcessStoreContext.Provider>;
}

export function useProcessStore(): ProcessStore {
  const ctx = useContext(ProcessStoreContext);
  if (!ctx) throw new Error('useProcessStore muss innerhalb von ProcessStoreProvider verwendet werden.');
  return ctx;
}
