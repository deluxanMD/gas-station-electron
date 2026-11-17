import type { LucideIcon } from 'lucide-react';
import type { SyncStatusKind } from '@/features/sync/types';

export interface SyncStatusStyle {
  icon: LucideIcon;
  className: string;
  label: (waiting: number, needsAttention: number) => string;
}

export type SyncStatusStyles = Record<SyncStatusKind, SyncStatusStyle>;
