import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGlobalFlag } from '@/hooks/useFeatureFlags';
import { EasterWelcome } from '@/components/layout/EasterWelcome';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;       // agora usado como topnav no desktop
  headerMobile?: React.ReactNode;
  bottomNav?: React.ReactNode;
  fab?: React.ReactNode;
}

export function AppLayout({ children, sidebar, headerMobile, bottomNav, fab }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const easterEnabled = useGlobalFlag('theme:easter');
  const [showEaster, setShowEaster] = useState(false);

  useEffect(() => {
    if (easterEnabled) {
      const closed = sessionStorage.getItem('easter-welcome-closed');
      if (!closed) setShowEaster(true);
    }
  }, [easterEnabled]);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background transition-colors font-sans selection:bg-primary/30 text-gray-900 dark:text-zinc-50">

      {/* ── TOP NAV — apenas Desktop ── */}
      {sidebar && (
        <header className={cn(
          "hidden md:flex flex-shrink-0 z-50 w-full",
          "bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800"
        )}>
          {sidebar}
        </header>
      )}

      {/* ── HEADER MOBILE ── */}
      <header className={cn(
        "md:hidden flex-shrink-0 sticky top-0 z-50 bg-inherit border-b border-gray-100 dark:border-zinc-900 flex items-center justify-between p-4",
        !headerMobile && "hidden"
      )}>
        {headerMobile}
      </header>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-inherit">
        <div className={cn("flex-1 overflow-y-auto no-scrollbar", "p-4 md:p-8 pb-24 md:pb-8")}>
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
