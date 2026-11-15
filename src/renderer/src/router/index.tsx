import type { JSX } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { AppLayout } from '@/components/app-layout';
import { DailyShiftRoute } from './DailyShiftRoute';
import { HomeRoute } from './HomeRoute';
import { LoginRoute } from './LoginRoute';
import { RequireAuth } from './require-auth';
import { RequirePermission } from './require-permission';
import { ROUTES } from './constants';

// Hash routing: the packaged app is served from file://, where path-based
// routing breaks on reload.
export function AppRouter(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.login} element={<LoginRoute />} />
          <Route element={<RequireAuth />}>
            <Route path={ROUTES.home} element={<HomeRoute />} />
            <Route
              element={<RequirePermission module="daily-shift" action="view" />}
            >
              <Route path={ROUTES.dailyShift} element={<DailyShiftRoute />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
