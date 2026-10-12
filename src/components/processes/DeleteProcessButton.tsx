import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { navigate } from '../../state/router';
import { useProcessStore } from '../../state/ProcessStore';
import { useToast } from '../../state/Toast';
import type { BusinessProcess } from '../../types/process';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/Modal';

interface Props {
  process: BusinessProcess;
  /** Where to go after deleting (e.g. back to the list from the detail view). */
  redirectTo?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md';
}

export function DeleteProcessButton({ process, redirectTo, iconOnly, size = 'md' }: Props) {
  const { deleteProcess } = useProcessStore();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size={size}
        variant="ghost"
        icon={Trash2}
        onClick={() => setOpen(true)}
        aria-label={`„${process.name}“ löschen`}
        title="Löschen"
        className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
      >
        {iconOnly ? undefined : 'Löschen'}
      </Button>
      <ConfirmDialog
        open={open}
        title="Prozess löschen?"
        confirmLabel="Löschen"
        message={
          <>
            „<span className="font-medium text-slate-900">{process.name}</span>“ wird mit allen Angaben und Bewertungen dauerhaft aus diesem Browser entfernt.
            {process.isDemo && ' Demo-Prozesse lassen sich über „Demo-Daten zurücksetzen“ wiederherstellen.'}
          </>
        }
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          if (redirectTo) navigate(redirectTo);
          deleteProcess(process.id);
          notify(`„${process.name}“ wurde gelöscht.`, 'info');
        }}
      />
    </>
  );
}
