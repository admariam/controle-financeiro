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

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/contas', label: 'Contas', icon: ReceiptText },
  { to: '/fluxo', label: 'Fluxo', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: ChartColumn },
  { to: '/configuracoes', label: 'Config.', icon: Settings },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800',
              )
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
