import { useEffect, useMemo, useState } from 'react';
import type { PortfolioRow } from './lib/csv';
import { useProcessStore } from './state/ProcessStore';

/** True while the viewport is narrower than `maxWidth` px (default: Tailwind's sm breakpoint). */
export function useIsNarrow(maxWidth = 640): boolean {
  const query = `(max-width: ${maxWidth - 0.02}px)`;
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

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
