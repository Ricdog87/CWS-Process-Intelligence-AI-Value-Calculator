import {
  BookOpenText,
  Calculator,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Scale,
  Menu,
  RotateCcw,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import logoUrl from '../../assets/cws-workwear-logo.png';
import { paths, type Route } from '../../state/router';
import { useProcessStore } from '../../state/ProcessStore';
import { useToast } from '../../state/Toast';
import { ConfirmDialog } from '../ui/Modal';
import { DEMO_PROCESSES } from '../../data/demoData';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (route: Route) => boolean;
  description: string;
}

const NAV: NavItem[] = [
  {
    label: 'KI-Cockpit',
    href: paths.cockpit(),
    icon: Gauge,
    match: (r) => r.name === 'cockpit',
    description: 'Kosten & Entscheidungen',
  },
  {
    label: 'Use Cases',
    href: paths.processes(),
    icon: ListChecks,
    match: (r) => r.name.startsWith('process'),
    description: 'Erfassen & bewerten',
  },
  {
    label: 'Business Case',
    href: paths.calculator(),
    icon: Calculator,
    match: (r) => r.name === 'calculator',
    description: 'Szenarien je Use Case',
  },
  {
    label: 'AI-CoE-Portfolio',
    href: paths.dashboard(),
    icon: LayoutDashboard,
    match: (r) => r.name === 'dashboard',
    description: 'Priorisierung & Pipeline',
  },
];

const TRANSPARENCY: { label: string; href: string; icon: LucideIcon; route: Route['name'] }[] = [
  { label: 'Preise & Annahmen', href: paths.pricing(), icon: Scale, route: 'pricing' },
  { label: 'Bewertungsmethodik', href: paths.methodology(), icon: BookOpenText, route: 'methodology' },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a href={paths.cockpit()} className="block rounded focus-visible:outline-offset-4" aria-label="CWS Process Intelligence – zum KI-Cockpit">
      <img
        src={logoUrl}
        alt="CWS Workwear"
        width={582}
        height={82}
        className={compact ? 'h-6 w-auto' : 'h-auto w-full max-w-[232px]'}
      />
      {!compact && (
        <span className="mt-3 block leading-tight">
          <span className="block text-[13px] font-bold tracking-[0.18em] text-white uppercase">Process Intelligence</span>
          <span className="mt-0.5 block text-[11px] text-slate-400">AI &amp; Automation Value Calculator</span>
        </span>
      )}
    </a>
  );
}

function SidebarContent({ route, onNavigate }: { route: Route; onNavigate: () => void }) {
  const { resetDemoData, clearAll, processes } = useProcessStore();
  const { notify } = useToast();
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null);
  const userCount = processes.filter((p) => !p.isDemo).length;

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-6">
        <Brand />
      </div>

      <nav aria-label="Hauptnavigation" className="px-3">
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Navigation</p>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = item.match(route);
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-cws-red-500" aria-hidden />}
                  <item.icon className={`size-[18px] shrink-0 ${active ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block text-[11px] text-slate-500">{item.description}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Transparenz</p>
        <ul className="space-y-1">
          {TRANSPARENCY.map((item) => {
            const active = route.name === item.route;
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-cws-red-500" aria-hidden />}
                  <item.icon className={`size-[18px] ${active ? 'text-brand-400' : 'text-slate-400'}`} aria-hidden />
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/10 px-3 py-4">
        <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Daten</p>
        <button
          type="button"
          onClick={() => setConfirm('reset')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <RotateCcw className="size-4 text-slate-400" aria-hidden />
          Demo-Daten zurücksetzen
        </button>
        <button
          type="button"
          onClick={() => setConfirm('clear')}
          disabled={processes.length === 0}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Trash2 className="size-4 text-slate-400" aria-hidden />
          Alle Prozesse löschen
        </button>
        <p className="px-3 pt-3 text-[11px] leading-relaxed text-slate-500">
          MVP · Daten werden nur lokal in diesem Browser gespeichert. Keine echten CWS-Daten eingeben.
        </p>
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Demo-Daten zurücksetzen?"
        tone="primary"
        confirmLabel="Zurücksetzen"
        message={
          <>
            Die {DEMO_PROCESSES.length} Demo-Use-Cases werden im Originalzustand wiederhergestellt; Änderungen an Demo-Prozessen gehen verloren.
            {userCount > 0 && <> Ihre {userCount} eigenen Prozesse bleiben erhalten.</>}
          </>
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          resetDemoData();
          setConfirm(null);
          onNavigate();
          notify('Demo-Daten wurden zurückgesetzt.');
        }}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        title="Alle Prozesse löschen?"
        confirmLabel="Endgültig löschen"
        message={`Alle ${processes.length} Prozesse – inklusive eigener Einträge – werden aus diesem Browser gelöscht. Demo-Daten können danach wieder geladen werden.`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          clearAll();
          setConfirm(null);
          onNavigate();
          notify('Alle Prozesse wurden gelöscht.', 'info');
        }}
      />
    </div>
  );
}

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { storageWarning, dismissStorageWarning } = useProcessStore();

  useEffect(() => setMobileOpen(false), [route]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen lg:pl-72">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-ink-900 lg:block">
        <SidebarContent route={route} onNavigate={() => undefined} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 bg-ink-900 px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <Brand compact />
          <span className="hidden truncate text-[11px] font-bold tracking-[0.16em] text-white uppercase sm:inline">Process Intelligence</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-200 hover:bg-white/10"
          aria-label="Navigation öffnen"
          aria-expanded={mobileOpen}
        >
          <Menu className="size-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="animate-fade-in absolute inset-0 bg-ink-950/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-ink-900 shadow-pop">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
              aria-label="Navigation schließen"
            >
              <X className="size-5" />
            </button>
            <SidebarContent route={route} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {storageWarning && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="flex-1">{storageWarning}</span>
            <button type="button" onClick={dismissStorageWarning} className="rounded p-0.5 hover:bg-amber-100" aria-label="Hinweis schließen">
              <X className="size-4" />
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
