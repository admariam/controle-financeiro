import { NavLink } from 'react-router-dom';
import {
  ChartColumn,
  Home,
  ReceiptText,
  Settings,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { BrandMark } from './BrandMark';
import { ProfileChip } from './ProfileChip';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/contas', label: 'Contas', icon: ReceiptText },
  { to: '/fluxo', label: 'Fluxo financeiro', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: ChartColumn },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
        <BrandMark />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
            Controle Financeiro
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <ProfileChip />
      </div>
    </aside>
  );
}
