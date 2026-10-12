import { Save, X } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { HELP } from '../../config/helpTexts';
import {
  DEPARTMENTS,
  LEVEL_OPTIONS,
  STATUSES,
  SYSTEMS,
  YES_NO_OPTIONS,
  YES_PARTIAL_NO_OPTIONS,
  YES_UNKNOWN_NO_OPTIONS,
} from '../../config/options';
import { evaluateProcess } from '../../lib/evaluation';
import { validateProcess, type FieldKey, type ProcessFormValues } from '../../lib/validation';
import { useToast } from '../../state/Toast';
import type { AutomationScenario, BusinessProcess, ProcessAssessment, ProcessDraft, ProcessMetrics } from '../../types/process';
import { Button } from '../ui/Button';
import { ChipCheckboxGroup, NumberField, SegmentedField, SelectField, TextArea, TextField } from '../ui/FormFields';
import { ConfirmDialog } from '../ui/Modal';
import { LivePreview } from './LivePreview';

export function emptyFormValues(): ProcessFormValues {
  return {
    name: '',
    department: '',
    description: '',
    systems: [],
    otherSystems: '',
    metrics: {
      transactionsPerMonth: null,
      minutesPerTransaction: null,
      hourlyCost: null,
      errorRatePct: null,
      reworkMinutesPerError: null,
    },
    assessment: {
      standardization: null,
      ruleBased: null,
      digitalData: null,
      integration: null,
      exceptionRate: null,
      unstructuredInfo: null,
      complianceConcerns: null,
    },
    scenario: {
      timeReductionPct: null,
      errorReductionPct: null,
      implementationCost: null,
      monthlyOperatingCost: null,
      annualHardSavings: null,
    },
    status: 'new',
  };
}

export function formValuesFromProcess(p: BusinessProcess): ProcessFormValues {
  return {
    name: p.name,
    department: p.department,
    description: p.description,
    systems: [...p.systems],
    otherSystems: p.otherSystems,
    metrics: { ...p.metrics },
    assessment: { ...p.assessment },
    scenario: { ...p.scenario },
    status: p.status,
  };
}

function FormSection({ step, title, description, children }: { step: number; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-card">
      <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-cws-red-500 text-sm font-semibold text-white">{step}</span>
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

interface ProcessFormProps {
  initial: ProcessFormValues;
  mode: 'create' | 'edit';
  isDemo?: boolean;
  onSubmit: (draft: ProcessDraft) => void;
  onCancel: () => void;
}

export function ProcessForm({ initial, mode, isDemo = false, onSubmit, onCancel }: ProcessFormProps) {
  const { notify } = useToast();
  const [values, setValues] = useState<ProcessFormValues>(initial);
  const [touched, setTouched] = useState<Set<FieldKey>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const validation = useMemo(() => validateProcess(values), [values]);
  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initial), [values, initial]);

  const preview = useMemo(() => {
    const now = new Date().toISOString();
    const process: BusinessProcess = {
      ...values,
      department: values.department || 'other',
      id: 'preview',
      isDemo,
      createdAt: now,
      updatedAt: now,
    };
    return evaluateProcess(process);
  }, [values, isDemo]);

  const touch = (key: FieldKey) => setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
  const errorFor = (key: FieldKey) => (submitted || touched.has(key) ? validation.errors[key] : undefined);
  const warningFor = (key: FieldKey) => validation.warnings[key];

  const setMetric = <K extends keyof ProcessMetrics>(key: K, value: ProcessMetrics[K]) =>
    setValues((v) => ({ ...v, metrics: { ...v.metrics, [key]: value } }));
  const setAssessment = <K extends keyof ProcessAssessment>(key: K, value: ProcessAssessment[K]) =>
    setValues((v) => ({ ...v, assessment: { ...v.assessment, [key]: value } }));
  const setScenario = <K extends keyof AutomationScenario>(key: K, value: AutomationScenario[K]) =>
    setValues((v) => ({ ...v, scenario: { ...v.scenario, [key]: value } }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!validation.isValid || !values.department) {
      const count = Object.keys(validation.errors).length;
      notify(`Bitte ${count === 1 ? 'das markierte Feld' : `die ${count} markierten Felder`} prüfen.`, 'error');
      window.requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('form [aria-invalid="true"]');
        first?.focus();
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    onSubmit({
      ...values,
      department: values.department,
      name: values.name.trim(),
      description: values.description.trim(),
      otherSystems: values.systems.includes('other') ? values.otherSystems.trim() : '',
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <FormSection step={1} title="Allgemeine Informationen" description="Worum geht es, und wer verantwortet den Prozess?">
          <TextField
            className="md:col-span-2"
            label="Prozessname"
            required
            value={values.name}
            maxLength={120}
            placeholder="z. B. Eingangsrechnungsprüfung"
            tooltip={HELP.name}
            onChange={(name) => setValues((v) => ({ ...v, name }))}
            onBlur={() => touch('name')}
            error={errorFor('name')}
          />
          <SelectField
            label="Fachbereich"
            required
            value={values.department}
            options={DEPARTMENTS}
            tooltip={HELP.department}
            onChange={(department) => {
              setValues((v) => ({ ...v, department }));
              touch('department');
            }}
            error={errorFor('department')}
          />
          <SelectField
            label="Status"
            value={values.status}
            options={STATUSES}
            placeholder="Status wählen"
            hint="Bearbeitungsstand im AI-CoE-Portfolio"
            onChange={(status) => setValues((v) => ({ ...v, status: status || 'new' }))}
          />
          <TextArea
            className="md:col-span-2"
            label="Kurzbeschreibung"
            value={values.description}
            maxLength={1000}
            placeholder="Eingang, wesentliche Arbeitsschritte und Ergebnis …"
            tooltip={HELP.description}
            onChange={(description) => setValues((v) => ({ ...v, description }))}
            onBlur={() => touch('description')}
            error={errorFor('description')}
          />
          <ChipCheckboxGroup
            className="md:col-span-2"
            label="Aktuell genutzte Systeme"
            values={values.systems}
            options={SYSTEMS}
            tooltip={HELP.systems}
            onChange={(systems) => setValues((v) => ({ ...v, systems }))}
          />
          {values.systems.includes('other') && (
            <TextField
              className="md:col-span-2"
              label="Sonstige Systeme"
              value={values.otherSystems}
              maxLength={200}
              placeholder="z. B. DATEV, Dokumentenmanagement"
              onChange={(otherSystems) => setValues((v) => ({ ...v, otherSystems }))}
              onBlur={() => touch('otherSystems')}
              error={errorFor('otherSystems')}
              warning={touched.has('otherSystems') || submitted ? warningFor('otherSystems') : undefined}
            />
          )}
        </FormSection>

        <FormSection step={2} title="Prozesskennzahlen" description="Volumen und Aufwand heute – Schätzungen sind in Ordnung.">
          <NumberField
            label="Vorgänge pro Monat"
            required
            unit="Anzahl"
            placeholder="z. B. 1.200"
            tooltip={HELP.transactionsPerMonth}
            value={values.metrics.transactionsPerMonth}
            onChange={(v) => setMetric('transactionsPerMonth', v)}
            onBlur={() => touch('metrics.transactionsPerMonth')}
            error={errorFor('metrics.transactionsPerMonth')}
          />
          <NumberField
            label="Bearbeitungszeit je Vorgang"
            required
            unit="Min."
            placeholder="z. B. 8"
            hint="Ohne Nacharbeit"
            tooltip={HELP.minutesPerTransaction}
            value={values.metrics.minutesPerTransaction}
            onChange={(v) => setMetric('minutesPerTransaction', v)}
            onBlur={() => touch('metrics.minutesPerTransaction')}
            error={errorFor('metrics.minutesPerTransaction')}
          />
          <NumberField
            label="Interner Stundensatz (Vollkosten)"
            unit="€/h"
            placeholder="z. B. 55"
            tooltip={HELP.hourlyCost}
            value={values.metrics.hourlyCost}
            onChange={(v) => setMetric('hourlyCost', v)}
            onBlur={() => touch('metrics.hourlyCost')}
            error={errorFor('metrics.hourlyCost')}
            warning={touched.has('metrics.hourlyCost') || submitted ? warningFor('metrics.hourlyCost') : undefined}
          />
          <NumberField
            label="Aktuelle Fehlerquote"
            unit="%"
            placeholder="z. B. 5"
            tooltip={HELP.errorRatePct}
            value={values.metrics.errorRatePct}
            onChange={(v) => setMetric('errorRatePct', v)}
            onBlur={() => touch('metrics.errorRatePct')}
            error={errorFor('metrics.errorRatePct')}
          />
          <NumberField
            label="Nacharbeitszeit je Fehler"
            unit="Min."
            placeholder="z. B. 20"
            tooltip={HELP.reworkMinutesPerError}
            value={values.metrics.reworkMinutesPerError}
            onChange={(v) => setMetric('reworkMinutesPerError', v)}
            onBlur={() => touch('metrics.reworkMinutesPerError')}
            error={errorFor('metrics.reworkMinutesPerError')}
            warning={touched.has('metrics.reworkMinutesPerError') || submitted ? warningFor('metrics.reworkMinutesPerError') : undefined}
          />
        </FormSection>

        <FormSection
          step={3}
          title="Prozessbewertung"
          description="Grundlage für den Automation Score und die Empfehlung. Unbeantwortete Fragen führen zu einer vorläufigen Bewertung."
        >
          <SegmentedField label="Standardisierungsgrad" value={values.assessment.standardization} options={LEVEL_OPTIONS} tooltip={HELP.standardization} onChange={(v) => setAssessment('standardization', v)} />
          <SegmentedField label="Regelbasiert und repetitiv" value={values.assessment.ruleBased} options={YES_PARTIAL_NO_OPTIONS} tooltip={HELP.ruleBased} onChange={(v) => setAssessment('ruleBased', v)} />
          <SegmentedField label="Digitale Eingangsdaten vorhanden" value={values.assessment.digitalData} options={YES_PARTIAL_NO_OPTIONS} tooltip={HELP.digitalData} onChange={(v) => setAssessment('digitalData', v)} />
          <SegmentedField label="Technische Systemintegration möglich" value={values.assessment.integration} options={YES_UNKNOWN_NO_OPTIONS} tooltip={HELP.integration} onChange={(v) => setAssessment('integration', v)} />
          <SegmentedField label="Ausnahmequote" value={values.assessment.exceptionRate} options={LEVEL_OPTIONS} tooltip={HELP.exceptionRate} onChange={(v) => setAssessment('exceptionRate', v)} />
          <SegmentedField label="Unstrukturierte Informationen interpretieren" value={values.assessment.unstructuredInfo} options={YES_NO_OPTIONS} tooltip={HELP.unstructuredInfo} onChange={(v) => setAssessment('unstructuredInfo', v)} />
          <SegmentedField
            className="md:col-span-2 md:max-w-[calc(50%-0.625rem)]"
            label="Datenschutz- oder Compliance-Bedenken"
            value={values.assessment.complianceConcerns}
            options={YES_UNKNOWN_NO_OPTIONS}
            tooltip={HELP.complianceConcerns}
            onChange={(v) => setAssessment('complianceConcerns', v)}
          />
        </FormSection>

        <FormSection step={4} title="Automatisierungsszenario" description="Erwarteter Effekt und Kosten der Lösung – bei Unsicherheit eher vorsichtig schätzen.">
          <NumberField
            label="Reduktion der Bearbeitungszeit"
            unit="%"
            placeholder="z. B. 50"
            tooltip={HELP.timeReductionPct}
            value={values.scenario.timeReductionPct}
            onChange={(v) => setScenario('timeReductionPct', v)}
            onBlur={() => touch('scenario.timeReductionPct')}
            error={errorFor('scenario.timeReductionPct')}
            warning={warningFor('scenario.timeReductionPct')}
          />
          <NumberField
            label="Reduktion der Fehler"
            unit="%"
            placeholder="z. B. 50"
            tooltip={HELP.errorReductionPct}
            value={values.scenario.errorReductionPct}
            onChange={(v) => setScenario('errorReductionPct', v)}
            onBlur={() => touch('scenario.errorReductionPct')}
            error={errorFor('scenario.errorReductionPct')}
          />
          <NumberField
            label="Einmalige Implementierungskosten"
            unit="€"
            placeholder="z. B. 40.000"
            tooltip={HELP.implementationCost}
            value={values.scenario.implementationCost}
            onChange={(v) => setScenario('implementationCost', v)}
            onBlur={() => touch('scenario.implementationCost')}
            error={errorFor('scenario.implementationCost')}
          />
          <NumberField
            label="Monatliche Betriebskosten"
            unit="€/Mon."
            placeholder="z. B. 800"
            tooltip={HELP.monthlyOperatingCost}
            value={values.scenario.monthlyOperatingCost}
            onChange={(v) => setScenario('monthlyOperatingCost', v)}
            onBlur={() => touch('scenario.monthlyOperatingCost')}
            error={errorFor('scenario.monthlyOperatingCost')}
          />
          <NumberField
            className="md:col-span-2 md:max-w-[calc(50%-0.625rem)]"
            label="Realisierbare harte Einsparungen p. a. (optional)"
            unit="€/Jahr"
            placeholder="z. B. 5.000"
            hint="Nur Cash-wirksame Einsparungen – keine Personalkosten."
            tooltip={HELP.annualHardSavings}
            value={values.scenario.annualHardSavings}
            onChange={(v) => setScenario('annualHardSavings', v)}
            onBlur={() => touch('scenario.annualHardSavings')}
            error={errorFor('scenario.annualHardSavings')}
          />
        </FormSection>

        <div className="flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            <span className="text-rose-600">*</span> Pflichtfelder. Bitte nur fiktive oder freigegebene Daten verwenden – keine personenbezogenen Daten.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button icon={X} onClick={() => (dirty ? setConfirmCancel(true) : onCancel())}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary" icon={Save}>
              {mode === 'create' ? 'Prozess speichern & bewerten' : 'Änderungen speichern'}
            </Button>
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <LivePreview evaluation={preview} hasName={values.name.trim().length > 0} />
      </aside>

      <ConfirmDialog
        open={confirmCancel}
        title="Änderungen verwerfen?"
        message="Ihre ungespeicherten Eingaben gehen verloren."
        confirmLabel="Verwerfen"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          onCancel();
        }}
      />
    </form>
  );
}
