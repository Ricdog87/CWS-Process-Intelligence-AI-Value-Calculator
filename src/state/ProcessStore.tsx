import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createDemoProcesses } from '../data/demoData';
import { evaluateProcess, type ProcessEvaluation } from '../lib/evaluation';
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

  useEffect(() => {
    const error = saveProcesses(storage.current, processes);
    if (error) setStorageWarning(error);
  }, [processes]);

  const evaluations = useMemo(() => new Map(processes.map((p) => [p.id, evaluateProcess(p)])), [processes]);

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
      storageWarning,
      dismissStorageWarning: () => setStorageWarning(null),
    }),
    [processes, evaluations, getProcess, addProcess, updateProcess, deleteProcess, setStatus, resetDemoData, clearAll, storageWarning],
  );

  return <ProcessStoreContext.Provider value={value}>{children}</ProcessStoreContext.Provider>;
}

export function useProcessStore(): ProcessStore {
  const ctx = useContext(ProcessStoreContext);
  if (!ctx) throw new Error('useProcessStore muss innerhalb von ProcessStoreProvider verwendet werden.');
  return ctx;
}
