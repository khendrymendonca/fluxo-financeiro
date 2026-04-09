import { useState, useEffect, ReactNode } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileShortcuts, ShortcutId } from '@/hooks/useMobileShortcuts';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import {
  LayoutDashboard, ArrowUpDown, Receipt, CreditCard,
  Wallet, Rocket, TrendingDown, LineChart,
  Settings2, Database, Calculator, User, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/utils/dateUtils';

const SHORTCUT_META: Record<ShortcutId, { icon: any; label: string; featureKey?: string }> = {
  dashboard:    { icon: LayoutDashboard, label: 'Início' },
  transactions: { icon: ArrowUpDown,    label: 'Lançamentos', featureKey: 'transactions' },
  cards:        { icon: CreditCard,     label: 'Cartões',     featureKey: 'cards_dashboard' },
  bills:        { icon: Receipt,        label: 'Fixas',       featureKey: 'accounts' },
  accounts:     { icon: Wallet,         label: 'Contas',      featureKey: 'accounts' },
  goals:        { icon: Rocket,         label: 'Metas',       featureKey: 'goals_manager' },
  debts:        { icon: TrendingDown,   label: 'Dívidas',     featureKey: 'debts_manager' },
  reports:      { icon: LineChart,      label: 'Gráficos',    featureKey: 'reports_dashboard' },
  categories:   { icon: Settings2,      label: 'Categ.' },
  export:       { icon: Database,       label: 'Dados' },
  simulator:    { icon: Calculator,     label: 'Simulador',   featureKey: 'simulator' },
  emergency:    { icon: Shield,         label: 'Reserva',     featureKey: 'emergency_fund' },
  profile:      { icon: User,           label: 'Perfil' },
};

function NavItemGuard({
  item,
  children,
}: {
  item: { featureKey?: string };
  children: ReactNode;
}) {
  const isEnabled = useFeatureFlag(item.featureKey ?? '');
  if (item.featureKey && !isEnabled) return null;
  return <>{children}</>;
}

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

  // 🛡️ REGRA DE NEGÓCIO: Apenas 4 botões, excluindo Início (Home)
  const items = shortcuts
    .filter(id => id !== 'dashboard')
    .slice(0, 4)
    .map(id => ({ id, ...SHORTCUT_META[id] }))
    .filter(item => !!item.icon);

  // Geometria aprimorada: Arco Superior centralizado (180° a 0°)
  // O centro do botão central de 64px está a 32px do fundo do container.
  const RADIUS = 100;
  const START_ANGLE = 180; // Totalmente à esquerda
  const END_ANGLE = 0;     // Totalmente à direita

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Container do FAB */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pb-safe md:hidden">
        
        {/* Itens orbitais */}
        {isOpen && items.map((item, index) => {
          const total = items.length;
          const angle = total === 1 
            ? 90 
            : START_ANGLE - (index / (total - 1)) * (START_ANGLE - END_ANGLE);
          
          const rad = angle * (Math.PI / 180);
          const x = Math.cos(rad) * RADIUS;
          const y = Math.sin(rad) * RADIUS;
          
          const isActive = activeView === item.id;
          const Icon = item.icon;

          return (
            <NavItemGuard key={item.id} item={item}>
              <div
                className="absolute"
                style={{
                  left: `calc(50% + ${x}px)`,
                  bottom: `calc(32px + ${y}px - 46px)`,
                  animation: `scaleInOrbital 250ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards ${index * 40}ms`,
                  opacity: 0,
                }}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => { onNavigate(item.id); setIsOpen(false); }}
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      'backdrop-blur-xl border transition-all duration-300',
                      'shadow-xl active:scale-90 group',
                      isActive
                        ? 'bg-primary border-primary/50 ring-4 ring-primary/20 text-white'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    )}
                  >
                    <Icon className={cn("w-5 h-5 transition-transform duration-300", !isActive && "group-hover:scale-110")} />
                  </button>
                  
                  <span className={cn(
                    'text-[9px] font-black uppercase tracking-widest whitespace-nowrap px-2 py-0.5 rounded-full',
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-zinc-900/50 text-zinc-500 border border-zinc-800/50'
                  )}>
                    {item.label}
                  </span>
                </div>
              </div>
            </NavItemGuard>
          );
        })}

        {/* Botão Gatilho */}
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={cn(
            'relative w-16 h-16 rounded-full z-50',
            'flex items-center justify-center transition-all duration-500',
            'shadow-[0_20px_50px_rgba(0,0,0,0.4)] active:scale-95',
            isOpen 
              ? 'bg-zinc-100 text-zinc-900 rotate-45' 
              : 'bg-zinc-900 text-white hover:bg-zinc-800'
          )}
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu de navegação'}
        >
          {isOpen ? (
            <X className="w-7 h-7" />
          ) : (
            <div className="relative">
              <Plus className="w-7 h-7" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-zinc-900" />
            </div>
          )}
          
          {!isOpen && (
            <span className="absolute inset-0 rounded-full ring-2 ring-primary/20 animate-ping opacity-20" />
          )}
        </button>
      </div>
    </>
  );
}
