import { Button } from './Button.tsx';
import { Sheet } from './Sheet.tsx';
import { useI18n } from '../../i18n';

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
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Sheet open={open} title={title} onClose={onCancel}>
      <p className="mb-5 text-[15px] text-[var(--mg-text-soft)]">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" block onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="danger" block onClick={onConfirm}>
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Sheet>
  );
}
