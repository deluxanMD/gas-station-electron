import {
  AlertTriangle,
  CheckCircle2,
  LogIn,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import type { SyncStatusStyles } from './types';

const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? '' : 's'}`;

export const SYNC_STATUS_STYLES: SyncStatusStyles = {
  synced: {
    icon: CheckCircle2,
    className: 'bg-muted text-muted-foreground',
    label: () => 'All changes synced',
  },
  syncing: {
    icon: RefreshCw,
    className: 'bg-info text-info-foreground',
    label: (waiting) => `Syncing ${plural(waiting, 'change')}`,
  },
  offline: {
    icon: WifiOff,
    className: 'bg-warning text-warning-foreground',
    label: (waiting) =>
      waiting > 0
        ? `Offline: ${plural(waiting, 'change')} waiting to sync`
        : 'Offline: changes are saved on this device',
  },
  'sign-in': {
    icon: LogIn,
    className: 'bg-warning text-warning-foreground',
    label: (waiting) => `Sign in to sync ${plural(waiting, 'change')}`,
  },
  attention: {
    icon: AlertTriangle,
    className: 'bg-destructive text-destructive-foreground',
    label: (_waiting, needsAttention) =>
      `${plural(needsAttention, 'change')} need attention`,
  },
};
