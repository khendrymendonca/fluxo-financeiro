import { useState, useEffect } from 'react';
import { X, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileShortcuts, ShortcutId } from '@/hooks/useMobileShortcuts';
import {
  LayoutDashboard, ArrowUpDown, Receipt, CreditCard,
  Wallet, Rocket, TrendingDown, LineChart,
  Settings2, Database, Calculator, User, Shield
} from 'lucide-react';

const SHORTCUT_META: Record<ShortcutId, { icon: any; label: string }> = {
  dashboard:    { icon: LayoutDashboard, label: 'Início' },
  transactions: { icon: ArrowUpDown,    label: 'Extratos' },
  cards:        { icon: CreditCard,     label: 'Cartões' },
  bills:        { icon: Receipt,        label: 'Fixas' },
  accounts:     { icon: Wallet,         label: 'Contas' },
  goals:        { icon: Rocket,         label: 'Metas' },
  debts:        { icon: TrendingDown,   label: 'Dívidas' },
  reports:      { icon: LineChart,      label: 'Gráficos' },
  categories:   { icon: Settings2,      label: 'Categ.' },
  export:       { icon: Database,       label: 'Dados' },
  simulator:    { icon: Calculator,     label: 'Simulador' },
  emergency:    { icon: Shield,         label: 'Reserva' },
  profile:      { icon: User,           label: 'Perfil' },
};

interface FloatingNavMenuProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export function FloatingNavMenu({ activeView, onNavigate }: FloatingNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { shortcuts } = useMobileShortcuts();

  // Fechar com ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  if (!shortcuts || shortcuts.length === 0) return null;

  const items = shortcuts
    .map(id => ({ id, ...SHORTCUT_META[id] }))
    .filter(item => !!item.icon);

  const RADIUS = 90;
  const START_ANGLE = 200;
  const END_ANGLE = 340;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Container do FAB — centralizado, acima do safe area */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pb-safe md:hidden">
        {/* Itens orbitais */}
        {isOpen && items.map((item, index) => {
          const total = items.length;
          const angle = total === 1
            ? 270
            : START_ANGLE + (index / (total - 1)) * (END_ANGLE - START_ANGLE);
          const rad = (angle - 90) * (Math.PI / 180);
          const x = Math.cos(rad) * RADIUS;
          const y = Math.sin(rad) * RADIUS;
          const isActive = activeView === item.id;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="absolute flex flex-col items-center gap-1"
              style={{
                left: `calc(50% + ${x}px - 24px)`,
                bottom: `calc(0px - ${-y}px - 24px)`,
                animation: `scaleIn 200ms ease forwards ${index * 40}ms`,
                opacity: 0,
                transform: 'scale(0.5)',
              }}
            >
              <button
                onClick={() => { onNavigate(item.id); setIsOpen(false); }}
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  'backdrop-blur-xl border transition-all duration-200',
                  'shadow-lg active:scale-95',
                  isActive
                    ? 'bg-primary/90 border-primary/50 ring-2 ring-primary/40 text-white'
                    : 'bg-zinc-800/90 border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-700/90'
                )}
              >
                <Icon className="w-5 h-5" />
              </button>
              <span className={cn(
                'text-[9px] font-black uppercase tracking-widest whitespace-nowrap',
                isActive ? 'text-primary' : 'text-zinc-400'
              )}>
                {item.label}
              </span>
            </div>
          );
        })}

        {/* FAB Principal */}
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={cn(
            'relative w-14 h-14 rounded-full z-50',
            'flex items-center justify-center',
            'bg-zinc-900/90 dark:bg-zinc-900/90 backdrop-blur-xl',
            'border border-zinc-700/60 ring-1 ring-white/5',
            'shadow-2xl shadow-zinc-950/50',
            'transition-all duration-300 active:scale-95',
            isOpen && 'bg-zinc-800/90'
          )}
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu de navegação'}
        >
          <div className={cn(
            'transition-transform duration-300',
            isOpen ? 'rotate-180' : 'rotate-0'
          )}>
            {isOpen
              ? <X className="w-6 h-6 text-zinc-100" />
              : <Menu className="w-6 h-6 text-zinc-100" />
            }
          </div>
          {/* Pulse ring quando fechado */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full ring-1 ring-primary/20 animate-ping opacity-30" />
          )}
        </button>
      </div>
    </>
  );
}
