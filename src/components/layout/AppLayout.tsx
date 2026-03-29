import React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

interface AppLayoutProps {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    headerMobile?: React.ReactNode;
    bottomNav?: React.ReactNode;
    fab?: React.ReactNode;
}

export function AppLayout({
    children,
    sidebar,
    headerMobile,
    bottomNav,
    fab
}: AppLayoutProps) {
    const isMobile = useIsMobile();

    return (
        <div className="flex h-[100dvh] overflow-hidden bg-background transition-colors font-sans selection:bg-primary/30 text-gray-900 dark:text-zinc-50">
            {/* Sidebar Fixa (Apenas Desktop) */}
            <aside className={cn(
                "hidden md:flex flex-col flex-shrink-0 z-50",
                !sidebar && "md:hidden"
            )}>
                {sidebar}
            </aside>

            {/* Área Principal */}
            <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative bg-inherit">
                {/* Header Mobile (Apenas Mobile) */}
                <header className={cn(
                    "md:hidden flex-shrink-0 sticky top-0 z-50 bg-inherit border-b border-gray-100 dark:border-zinc-900 flex items-center justify-between p-4",
                    !headerMobile && "hidden"
                )}>
                    {headerMobile}
                </header>

                {/* Container de Conteúdo */}
                <div className={cn(
                    "flex-1 overflow-y-auto no-scrollbar pt-0",
                    "p-4 md:p-8 pb-24 md:pb-8"
                )}>
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>

                {/* Floating Action Button (Mobile) */}
                <div className={cn("md:hidden", !fab && "hidden")}>
                    {fab}
                </div>
            </main>

            {/* Bottom Navigation (Mobile) */}
            <div className={cn("md:hidden flex-shrink-0", !bottomNav && "hidden")}>
                {bottomNav}
            </div>
        </div>
    );
}
