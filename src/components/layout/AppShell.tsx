import { Outlet } from 'react-router-dom';
import { MonthProvider } from '../../data/MonthProvider';
import { BrandMark } from './BrandMark';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ProfileChip } from './ProfileChip';

export function AppShell() {
  return (
    <MonthProvider>
      <div className="min-h-dvh bg-slate-50">
        <Sidebar />

        <div className="lg:pl-60">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
            <BrandMark className="h-7 w-7" />
            <span className="truncate text-sm font-semibold tracking-tight text-slate-900">
              Controle Financeiro
            </span>
            <div className="ml-auto">
              <ProfileChip compact />
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            <Outlet />
          </main>
        </div>

        <BottomNav />
      </div>
    </MonthProvider>
  );
}
