import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/features/auth/auth-store';
import { HomeScreen } from '@/features/home/home-screen';
import { deactivateDrafts } from '@/features/daily-shift/drafts';
import { releaseSession } from '@/lib/device-session';
import { MODULE_PATHS } from './constants';

export function HomeRoute(): JSX.Element | null {
  const user = useAuthStore((s) => s.user);
  const dbUserId = useAuthStore((s) => s.dbUserId);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  // RequireAuth guarantees a user; this narrows the type.
  if (!user) return null;
  return (
    <HomeScreen
      userId={user.userId}
      onSignOut={() => {
        if (dbUserId !== null) void releaseSession(dbUserId);
        // Half-entered figures stay saved for this user's shift, but leave memory so the next user cannot see them.
        deactivateDrafts();
        signOut();
      }}
      onSelectModule={(id) => {
        const path = MODULE_PATHS[id];
        if (path) void navigate(path);
      }}
    />
  );
}
