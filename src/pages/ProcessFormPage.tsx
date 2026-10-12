import { FileQuestion } from 'lucide-react';
import { useMemo } from 'react';
import { DemoNotice } from '../components/layout/DemoNotice';
import { PageHeader } from '../components/layout/PageHeader';
import { emptyFormValues, formValuesFromProcess, ProcessForm } from '../components/processes/ProcessForm';
import { LinkButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { navigate, paths } from '../state/router';
import { useProcessStore } from '../state/ProcessStore';
import { useToast } from '../state/Toast';

export function ProcessFormPage({ id }: { id?: string }) {
  const { getProcess, addProcess, updateProcess } = useProcessStore();
  const { notify } = useToast();
  const existing = id ? getProcess(id) : undefined;
  // Initial values are captured once per process; later store updates must not reset the form.
  const initial = useMemo(() => (existing ? formValuesFromProcess(existing) : emptyFormValues()), [id]);

  if (id && !existing) {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="Prozess nicht gefunden"
          text="Der Prozess existiert nicht (mehr). Möglicherweise wurde er gelöscht."
          actions={<LinkButton href={paths.processes()}>Zur Prozessliste</LinkButton>}
        />
      </Card>
    );
  }

  const isEdit = Boolean(existing);

  return (
    <>
      <PageHeader
        back={isEdit && existing ? { href: paths.processDetail(existing.id), label: 'Zurück zur Bewertung' } : { href: paths.processes(), label: 'Zur Prozessliste' }}
        title={isEdit ? 'Prozess bearbeiten' : 'Neuen Prozess erfassen'}
        subtitle={
          isEdit
            ? 'Angaben anpassen – Score, Empfehlung und Wirtschaftlichkeit werden sofort neu berechnet.'
            : 'In vier Schritten zur nachvollziehbaren Bewertung. Die Live-Bewertung zeigt sofort, wie sich Ihre Angaben auswirken.'
        }
      />
      {existing?.isDemo && <DemoNotice text="Sie bearbeiten einen fiktiven Demo-Prozess." />}
      <ProcessForm
        key={id ?? 'new'}
        initial={initial}
        mode={isEdit ? 'edit' : 'create'}
        isDemo={existing?.isDemo}
        onCancel={() => navigate(existing ? paths.processDetail(existing.id) : paths.processes())}
        onSubmit={(draft) => {
          if (existing) {
            updateProcess(existing.id, draft);
            notify('Änderungen gespeichert – Bewertung aktualisiert.');
            navigate(paths.processDetail(existing.id));
          } else {
            const created = addProcess(draft);
            notify(`„${created.name}“ wurde erfasst und bewertet.`);
            navigate(paths.processDetail(created.id));
          }
        }}
      />
    </>
  );
}
