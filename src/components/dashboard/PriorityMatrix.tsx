import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MATRIX_THRESHOLDS, type PriorityKey } from '../../config/scoringConfig';
import { departmentLabel } from '../../config/options';
import type { PortfolioRow } from '../../lib/csv';
import { formatAxisCurrency, formatCurrency } from '../../lib/format';
import { navigate, paths } from '../../state/router';

/** Ordinal blue ramp (validated): darker = higher priority. */
export const PRIORITY_COLORS: Record<PriorityKey, string> = {
  high: '#184f95',
  medium: '#2a78d6',
  low: '#86b6ef',
};

const PRIORITY_LABEL: Record<PriorityKey, string> = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' };

interface Point {
  id: string;
  name: string;
  department: string;
  score: number;
  value: number;
  priority: PriorityKey;
  priorityScore: number;
  showLabel: boolean;
}

function niceCeil(value: number): number {
  if (value <= 0) return 10_000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

function MatrixTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="max-w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-pop">
      <p className="font-semibold text-slate-900">{p.name}</p>
      <p className="text-slate-500">{p.department}</p>
      <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-slate-700">
        <dt>Automation Score</dt>
        <dd className="tabular text-right font-medium">{p.score}</dd>
        <dt>Wert p. a. (netto)</dt>
        <dd className="tabular text-right font-medium">{formatCurrency(p.value)}</dd>
        <dt>Priorität</dt>
        <dd className="text-right font-medium">
          {PRIORITY_LABEL[p.priority]} ({p.priorityScore})
        </dd>
      </dl>
      <p className="mt-2 text-[11px] text-slate-400">Klicken für Details</p>
    </div>
  );
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: Point;
}

function Dot({ cx = 0, cy = 0, payload }: DotProps) {
  if (!payload) return null;
  const label = payload.name.length > 26 ? `${payload.name.slice(0, 25)}…` : payload.name;
  return (
    <g style={{ cursor: 'pointer' }}>
      {/* Larger invisible hit target */}
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      <circle cx={cx} cy={cy} r={7} fill={PRIORITY_COLORS[payload.priority]} stroke="#ffffff" strokeWidth={2} />
      {payload.showLabel && (
        <text x={cx - 10} y={cy + 4} textAnchor="end" fontSize={11} fill="#30343c" style={{ pointerEvents: 'none' }}>
          {label}
        </text>
      )}
    </g>
  );
}

export function PriorityMatrix({ rows }: { rows: PortfolioRow[] }) {
  const points: Point[] = rows.map(({ process: p, evaluation: e }) => ({
    id: p.id,
    name: p.name,
    department: departmentLabel(p.department),
    score: e.score.score,
    value: e.economics.annualRecurringNetValue,
    priority: e.priority.level,
    priorityScore: e.priority.score,
    showLabel: e.priority.level === 'high',
  }));

  const values = points.map((p) => p.value);
  const yMin = Math.min(0, ...values);
  const yMax = niceCeil(Math.max(MATRIX_THRESHOLDS.annualValue * 1.5, ...values) * 1.08);
  const yMinNice = yMin < 0 ? -niceCeil(-yMin) : 0;
  const tx = MATRIX_THRESHOLDS.score;
  const ty = MATRIX_THRESHOLDS.annualValue;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600" aria-hidden>
        {(['high', 'medium', 'low'] as PriorityKey[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: PRIORITY_COLORS[k] }} />
            Priorität {PRIORITY_LABEL[k]}
          </span>
        ))}
      </div>
      <div className="h-[340px] w-full" role="img" aria-label="Priorisierungsmatrix: Automation Score gegenüber jährlichem Netto-Wert je Prozess. Werte siehe Portfolio-Tabelle.">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 8 }}>
            <ReferenceArea x1={tx} x2={100} y1={ty} y2={yMax} fill="#fffbe6" fillOpacity={1} ifOverflow="hidden"
              label={{ value: 'Priorisieren', position: 'insideTopRight', fontSize: 11, fill: '#7a6400', fontWeight: 600 }} />
            <ReferenceArea x1={0} x2={tx} y1={ty} y2={yMax} fill="transparent"
              label={{ value: 'Voraussetzungen schaffen', position: 'insideTopLeft', fontSize: 11, fill: '#8a8f98' }} />
            <ReferenceArea x1={tx} x2={100} y1={yMinNice} y2={ty} fill="transparent"
              label={{ value: 'Effizient bündeln', position: 'insideBottomRight', fontSize: 11, fill: '#8a8f98' }} />
            <ReferenceArea x1={0} x2={tx} y1={yMinNice} y2={ty} fill="transparent"
              label={{ value: 'Beobachten', position: 'insideBottomLeft', fontSize: 11, fill: '#8a8f98' }} />
            <CartesianGrid stroke="#eef0f3" />
            <ReferenceLine x={tx} stroke="#c3c7ce" />
            <ReferenceLine y={ty} stroke="#c3c7ce" />
            {yMinNice < 0 && <ReferenceLine y={0} stroke="#8a8f98" />}
            <XAxis
              type="number"
              dataKey="score"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#d4d7dd' }}
              label={{ value: 'Automation Score (Umsetzungsreife)', position: 'insideBottom', offset: -16, fontSize: 12, fill: '#4b5563' }}
            />
            <YAxis
              type="number"
              dataKey="value"
              domain={[yMinNice, yMax]}
              tickFormatter={(v: number) => formatAxisCurrency(v)}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip content={<MatrixTooltip />} cursor={false} isAnimationActive={false} />
            <Scatter
              data={points}
              shape={<Dot />}
              isAnimationActive={false}
              onClick={(d: { payload?: Point }) => d?.payload && navigate(paths.processDetail(d.payload.id))}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Y-Achse: jährlicher Netto-Wert (Kapazitäts- und Qualitätswert + harte Einsparungen − Betriebskosten). Schwellen: Score {tx}, {formatCurrency(ty)} p. a.
      </p>
    </div>
  );
}
