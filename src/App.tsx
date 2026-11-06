import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { Spinner } from './components/ui/Spinner';
import { AppShell } from './components/layout/AppShell';
import { SessionProvider } from './auth/SessionProvider';
import { ProfileProvider } from './auth/ProfileProvider';
import { LoginPage } from './auth/LoginPage';
import { ProfileSelectPage } from './auth/ProfileSelectPage';
import { RequireSession } from './auth/RequireSession';
import { RequireProfile } from './auth/RequireProfile';
import { DataRefreshProvider } from './data/DataRefreshProvider';
import { isSupabaseConfigured } from './lib/env';
import { SetupRequiredPage } from './pages/SetupRequiredPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { CashFlowPage } from './pages/CashFlowPage';
import { SettingsPage } from './pages/SettingsPage';

const ReportsPage = lazy(async () => {
  const module = await import('./pages/ReportsPage');
  return { default: module.ReportsPage };
});

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupRequiredPage />;
  }

  return (
    <ToastProvider>
      <HashRouter>
        <SessionProvider>
          <ProfileProvider>
            <DataRefreshProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route element={<RequireSession />}>
                  <Route path="/perfil" element={<ProfileSelectPage />} />

                  <Route element={<RequireProfile />}>
                    <Route element={<AppShell />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="contas" element={<ExpensesPage />} />
                      <Route path="fluxo" element={<CashFlowPage />} />
                      <Route
                        path="relatorios"
                        element={
                          <Suspense
                            fallback={
                              <div className="flex h-64 items-center justify-center">
                                <Spinner />
                              </div>
                            }
                          >
                            <ReportsPage />
                          </Suspense>
                        }
                      />
                      <Route path="configuracoes" element={<SettingsPage />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </DataRefreshProvider>
          </ProfileProvider>
        </SessionProvider>
      </HashRouter>
    </ToastProvider>
  );
}
