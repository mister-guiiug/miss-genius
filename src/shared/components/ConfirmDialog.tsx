import { Button } from './Button.tsx';
import { Sheet } from './Sheet.tsx';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet open={open} title={title} onClose={onCancel}>
      <p className="mb-5 text-[15px] text-[var(--mg-text-soft)]">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" block onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="danger" block onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
