import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cumulativeValueSeries, type EconomicResult } from '../../lib/calculations';
import { useElementWidth, useIsNarrow } from '../../hooks';
import { formatAxisCurrency, formatCurrency, formatMonths } from '../../lib/format';

/** Chart colors – validated with the dataviz palette checker (relief via direct labels). */
const COLORS = {
  potential: '#2a78d6',
  cash: '#1baf7a',
  cost: '#e34948',
  total: '#30343c',
  grid: '#eef0f3',
  axis: '#6b7280',
};

type StepKind = 'potential' | 'cash' | 'cost' | 'total';

/** Rounded axis domain and ticks (e.g. −50.000 … 150.000 in steps of 50.000). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10) * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v));
  return ticks;
}

function CategoryTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  // At most two lines: first word, then the rest ("Betrieb" / "Jahr 1").
  const [first, ...rest] = (payload?.value ?? '').split(' ');
  const words = rest.length ? [first, rest.join(' ')] : [first];
  return (
    <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={COLORS.axis}>
      {words.map((w, i) => (
        <tspan key={w + i} x={x} dy={i === 0 ? 0 : 13}>
          {w}
        </tspan>
      ))}
    </text>
  );
}

interface Step {
  name: string;
  /** [start, end] of the floating bar. */
  range: [number, number];
  amount: number;
  kind: StepKind;
}

export function buildWaterfall(eco: EconomicResult): Step[] {
  const steps: Step[] = [];
  let running = 0;
  const add = (name: string, amount: number, kind: StepKind) => {
    const start = running;
    running += amount;
    steps.push({ name, range: [start, running], amount, kind });
  };
  add('Kapazitätswert', eco.annualCapacityValue, 'potential');
  add('Qualitätsnutzen', eco.annualAvoidedReworkValue, 'potential');
  add('Harte Einsparungen', eco.annualHardSavings, 'cash');
  add('Implementierung', -eco.implementationCost, 'cost');
  add('Betrieb Jahr 1', -eco.annualOperatingCosts, 'cost');
  steps.push({ name: 'Netto Jahr 1', range: [0, running], amount: running, kind: 'total' });
  return steps;
}

const LEGEND: { kind: StepKind; label: string }[] = [
  { kind: 'potential', label: 'Wirtschaftliches Potenzial (Kapazität, Qualität)' },
  { kind: 'cash', label: 'Harte Einsparungen (Cash)' },
  { kind: 'cost', label: 'Kosten' },
  { kind: 'total', label: 'Netto-Nutzen' },
];

function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: { payload: Step }[] }) {
  if (!active || !payload?.length) return null;
  const step = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-pop">
      <p className="font-semibold text-slate-900">{step.name}</p>
      <p className="tabular mt-0.5 text-slate-700">
        {step.kind === 'cost' ? '−' : ''}
        {formatCurrency(Math.abs(step.amount))}
      </p>
    </div>
  );
}

function WaterfallLegend() {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {LEGEND.map((l) => (
        <li key={l.kind} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: COLORS[l.kind] }} aria-hidden />
          {l.label}
        </li>
      ))}
    </ul>
  );
}

const WATERFALL_ARIA = 'Wasserfalldiagramm des wirtschaftlichen Nutzens im ersten Jahr. Werte siehe Rechenweg.';

interface LabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
}

/** Below this chart width the six columns' category labels would collide – switch to horizontal bars. */
const COLUMN_LAYOUT_MIN_WIDTH = 560;

function HorizontalWaterfall({ data, min, max }: { data: Step[]; min: number; max: number }) {
  const span = max - min || 1000;
  // Value labels always sit right of the bar end, so the right side needs the headroom.
  const raw = niceTicks(min < 0 ? min - span * 0.08 : 0, max + span * 0.42, 3);
  const ticks = Array.from(new Set([raw[0], ...(raw[0] < 0 ? [0] : []), raw[raw.length - 1]]));
  return (
    <div className="h-[268px] w-full" role="img" aria-label={WATERFALL_ARIA}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="26%">
          <CartesianGrid stroke={COLORS.grid} horizontal={false} />
          <XAxis
            type="number"
            domain={[raw[0], raw[raw.length - 1]]}
            ticks={ticks}
            tickFormatter={(v: number) => formatAxisCurrency(v)}
            tick={{ fontSize: 10, fill: COLORS.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11, fill: COLORS.axis }} tickLine={false} axisLine={false} interval={0} />
          <ReferenceLine x={0} stroke="#8a8f98" />
          <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} isAnimationActive={false} />
          <Bar dataKey="range" radius={[4, 4, 4, 4]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={COLORS[d.kind]} />
            ))}
            <LabelList
              dataKey="amount"
              content={(props) => {
                const { x, y, width, height, value } = props as unknown as LabelBox;
                const right = Math.max(Number(x), Number(x) + Number(width));
                return (
                  <text x={right + 4} y={Number(y) + Number(height) / 2 + 4} textAnchor="start" fontSize={10} fill="#30343c" fontWeight={600}>
                    {formatAxisCurrency(Number(value))}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ColumnWaterfall({ data, min, max }: { data: Step[]; min: number; max: number }) {
  // Value labels always sit above the bar top (the minus sign carries the direction), so only the top needs headroom.
  const pad = (max - min) * 0.12 || 1000;
  const ticks = niceTicks(min, max + pad);
  return (
    <div className="h-[310px] w-full" role="img" aria-label={WATERFALL_ARIA}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 8, left: 0 }} barCategoryGap="22%">
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="name" tick={<CategoryTick />} tickLine={false} axisLine={false} interval={0} height={36} />
          <YAxis
            domain={[ticks[0], ticks[ticks.length - 1]]}
            ticks={ticks}
            tickFormatter={(v: number) => formatAxisCurrency(v)}
            tick={{ fontSize: 11, fill: COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <ReferenceLine y={0} stroke="#8a8f98" />
          <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} isAnimationActive={false} />
          <Bar dataKey="range" radius={[4, 4, 4, 4]} maxBarSize={56} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={COLORS[d.kind]} />
            ))}
            <LabelList
              dataKey="amount"
              content={(props) => {
                const { x, y, width, height, value } = props as unknown as LabelBox;
                // Range bars may report a negative height; use the visual top edge either way.
                const top = Math.min(Number(y), Number(y) + Number(height));
                return (
                  <text x={Number(x) + Number(width) / 2} y={top - 6} textAnchor="middle" fontSize={11} fill="#30343c" fontWeight={600}>
                    {formatAxisCurrency(Number(value))}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WaterfallChart({ economics }: { economics: EconomicResult }) {
  const narrowViewport = useIsNarrow();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const data = buildWaterfall(economics);
  const allValues = data.flatMap((d) => d.range);
  const min = Math.min(0, ...allValues);
  const max = Math.max(0, ...allValues);
  // Decide by the chart's own width (two-column layouts on wide screens make it narrow too).
  const horizontal = width > 0 ? width < COLUMN_LAYOUT_MIN_WIDTH : narrowViewport;

  return (
    <div ref={ref}>
      <WaterfallLegend />
      {horizontal ? <HorizontalWaterfall data={data} min={min} max={max} /> : <ColumnWaterfall data={data} min={min} max={max} />}
    </div>
  );
}

function CumulativeTooltip({ active, payload }: { active?: boolean; payload?: { payload: { month: number; value: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-pop">
      <p className="font-semibold text-slate-900">Monat {p.month}</p>
      <p className="tabular mt-0.5 text-slate-700">Kumuliert: {formatCurrency(p.value)}</p>
    </div>
  );
}

export function CumulativeChart({ economics, months = 36 }: { economics: EconomicResult; months?: number }) {
  const narrow = useIsNarrow();
  const data = cumulativeValueSeries(economics, months);
  const payback = economics.paybackMonths;
  const showPayback = payback !== null && payback > 0 && payback <= months;
  // Always include the 0 € line so break-even is visible even when the whole curve is negative.
  const values = data.map((p) => p.value);
  const yTicks = niceTicks(Math.min(0, ...values), Math.max(0, ...values), 4);

  return (
    <div>
      <div className="h-[260px] w-full" role="img" aria-label={`Kumulierter wirtschaftlicher Nutzen über ${months} Monate. Amortisation: ${formatMonths(payback)}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, months]}
              ticks={Array.from({ length: months / 6 + 1 }, (_, i) => i * 6)}
              tickFormatter={(m: number) => `M${m}`}
              tick={{ fontSize: 11, fill: COLORS.axis }}
              tickLine={false}
              axisLine={{ stroke: '#d4d7dd' }}
            />
            <YAxis
              domain={[yTicks[0], yTicks[yTicks.length - 1]]}
              ticks={yTicks}
              tickFormatter={(v: number) => formatAxisCurrency(v)}
              tick={{ fontSize: 11, fill: COLORS.axis }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <ReferenceLine y={0} stroke="#8a8f98" />
            {showPayback && (
              <ReferenceLine
                x={payback}
                stroke="#30343c"
                label={{
                  value: narrow ? `≈ ${formatMonths(payback)}` : `Amortisation ≈ ${formatMonths(payback)}`,
                  // Keep the label inside the plot: right of the line early on, left of it later.
                  position: payback / months > 0.55 ? 'insideTopRight' : 'insideTopLeft',
                  fontSize: 11,
                  fill: '#30343c',
                }}
              />
            )}
            <Tooltip content={<CumulativeTooltip />} cursor={{ stroke: '#c3c7ce' }} isAnimationActive={false} />
            <Area
              type="linear"
              dataKey="value"
              stroke={COLORS.potential}
              strokeWidth={2}
              fill={COLORS.potential}
              fillOpacity={0.1}
              baseValue={0}
              isAnimationActive={false}
              activeDot={{ r: 4, stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {!showPayback && (
        <p className="mt-2 text-xs text-slate-500">
          {payback === null
            ? 'Keine Amortisation: Der laufende Nutzen deckt die Betriebskosten nicht.'
            : payback === 0
              ? 'Keine Investition erfasst – der Nutzen wirkt ab Monat 1.'
              : `Amortisation erst nach ${formatMonths(payback)} – außerhalb des dargestellten Zeitraums von ${months} Monaten.`}
        </p>
      )}
    </div>
  );
}
