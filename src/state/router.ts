import { useEffect, useState } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'processes' }
  | { name: 'process-new' }
  | { name: 'process-detail'; id: string }
  | { name: 'process-edit'; id: string }
  | { name: 'calculator'; id?: string }
  | { name: 'methodology' }
  | { name: 'not-found' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0 || (parts[0] === 'dashboard' && parts.length === 1)) return { name: 'dashboard' };
  if (parts[0] === 'processes') {
    if (parts.length === 1) return { name: 'processes' };
    if (parts[1] === 'new' && parts.length === 2) return { name: 'process-new' };
    if (parts.length === 2) return { name: 'process-detail', id: parts[1] };
    if (parts.length === 3 && parts[2] === 'edit') return { name: 'process-edit', id: parts[1] };
  }
  if (parts[0] === 'calculator') {
    if (parts.length === 1) return { name: 'calculator' };
    if (parts.length === 2) return { name: 'calculator', id: parts[1] };
  }
  if (parts[0] === 'methodology' && parts.length === 1) return { name: 'methodology' };
  return { name: 'not-found' };
}

export const paths = {
  dashboard: () => '#/dashboard',
  processes: () => '#/processes',
  processNew: () => '#/processes/new',
  processDetail: (id: string) => `#/processes/${encodeURIComponent(id)}`,
  processEdit: (id: string) => `#/processes/${encodeURIComponent(id)}/edit`,
  calculator: (id?: string) => (id ? `#/calculator/${encodeURIComponent(id)}` : '#/calculator'),
  methodology: () => '#/methodology',
};

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  if (options.replace) {
    const url = new URL(window.location.href);
    url.hash = to;
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = to;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
