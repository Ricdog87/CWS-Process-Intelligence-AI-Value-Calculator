import { useMemo } from 'react';
import type { PortfolioRow } from './lib/csv';
import { useProcessStore } from './state/ProcessStore';

/** All processes joined with their evaluation. */
export function usePortfolioRows(): PortfolioRow[] {
  const { processes, evaluations } = useProcessStore();
  return useMemo(
    () => processes.flatMap((process) => {
      const evaluation = evaluations.get(process.id);
      return evaluation ? [{ process, evaluation }] : [];
    }),
    [processes, evaluations],
  );
}
