import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGlobalFlag } from '@/hooks/useFeatureFlags';
import { useThemeColor } from '@/hooks/useThemeColor';
import { EasterWelcome } from '@/components/layout/EasterWelcome';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;       // agora usado como topnav no desktop
  headerMobile?: React.ReactNode;
  bottomNav?: React.ReactNode;
  fab?: React.ReactNode;
}

function BandeirinhasVaral() {
  return (
    <div className="absolute top-0 left-0 right-0 h-4 flex justify-around overflow-hidden pointer-events-none z-50 select-none animate-in fade-in slide-in-from-top duration-500">
      {/* 16 bandeirinhas distribuídas igualmente pelo topo da tela */}
      {Array.from({ length: 16 }).map((_, i) => {
        const colors = [
          'bg-[#009B3A] border-t border-[#FEDF00]/30', // Verde
          'bg-[#FEDF00] border-t border-[#002776]/30', // Amarelo
          'bg-[#002776] border-t border-[#009B3A]/30', // Azul
        ];
        const colorClass = colors[i % colors.length];
        
        return (
          <div 
            key={i} 
            className={cn(
              "w-3.5 h-4.5 origin-top transition-transform shadow-[0_1px_2px_rgba(0,0,0,0.1)]",
              colorClass
            )}
            style={{
              clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
              animation: `sway ${1.5 + (i % 3) * 0.4}s ease-in-out infinite alternate`,
              transformOrigin: 'top center',
            }}
          />
        );
      })}
    </div>
  );
}

export function AppLayout({ children, sidebar, headerMobile, bottomNav, fab }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const easterEnabled = useGlobalFlag('theme_easter');
  const copaGloballyEnabled = useGlobalFlag('theme_copa');
  const [showEaster, setShowEaster] = useState(false);
  
  let modoTorcida = false;
  try {
    const context = useThemeColor();
    modoTorcida = context?.modoTorcida || false;
  } catch {
    // Fallback caso renderizado fora do provider
  }

  useEffect(() => {
    if (easterEnabled) {
      const closed = sessionStorage.getItem('easter-welcome-closed');
      if (!closed) setShowEaster(true);
    }
  }, [easterEnabled]);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background transition-colors font-sans relative selection:bg-primary/30 text-gray-900 dark:text-zinc-50">
      {modoTorcida && <BandeirinhasVaral />}

      {/* ── TOP NAV — apenas Desktop ── */}
      {sidebar && (
        <header className={cn(
          "hidden md:flex flex-shrink-0 z-50 w-full",
          "bg-card border-b border-border"
        )}>
          {sidebar}
        </header>
      )}

      {/* ── HEADER MOBILE ── */}
      <header className={cn(
        "md:hidden flex-shrink-0 sticky top-0 z-50 bg-background border-b border-border flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.875rem)]",
        !headerMobile && "hidden"
      )}>
        {headerMobile}
      </header>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-inherit">
        <div className={cn("flex-1 overflow-y-auto", "p-4 md:p-8 pb-24 md:pb-8")}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>

        {/* FAB Mobile */}
        <div className={cn("md:hidden", !fab && "hidden")}>
          {fab}
        </div>
      </main>

      {/* Bottom Nav Mobile */}
      <div className={cn("md:hidden flex-shrink-0", !bottomNav && "hidden")}>
        {bottomNav}
      </div>

      {showEaster && (
        <EasterWelcome onClose={() => {
          setShowEaster(false);
          sessionStorage.setItem('easter-welcome-closed', 'true');
        }} />
      )}
    </div>
  );
}
