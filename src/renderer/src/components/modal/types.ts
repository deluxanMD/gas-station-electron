export type ModalApproveVariant = 'default' | 'destructive';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onApprove: () => void;
  // Runs after the user cancels, before the modal closes.
  onCancel?: () => void;
  approveLabel?: string;
  cancelLabel?: string;
  // Use `destructive` only when approving carries real consequences.
  approveVariant?: ModalApproveVariant;
  // Locks the modal while the approve action is in flight.
  isApproving?: boolean;
}
