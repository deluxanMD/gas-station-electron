import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DEFAULT_APPROVE_LABEL, DEFAULT_CANCEL_LABEL } from './constants';
import type { ModalProps } from './types';

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  onApprove,
  onCancel,
  approveLabel = DEFAULT_APPROVE_LABEL,
  cancelLabel = DEFAULT_CANCEL_LABEL,
  approveVariant = 'default',
  isApproving = false,
}: ModalProps): JSX.Element {
  const handleOpenChange = (nextOpen: boolean): void => {
    // Escape and overlay clicks must not dismiss the modal mid-approval.
    if (isApproving && !nextOpen) return;
    if (!nextOpen) onCancel?.();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="rounded-xl bg-card text-card-foreground"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isApproving}
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={approveVariant}
            disabled={isApproving}
            onClick={onApprove}
          >
            {approveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
