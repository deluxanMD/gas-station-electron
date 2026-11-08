import type { ModuleId } from '@/features/auth/types';

export interface HomeScreenProps {
  userId: string;
  onSignOut: () => void;
  onSelectModule: (id: ModuleId) => void;
}
