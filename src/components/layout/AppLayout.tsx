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
        <div className="flex h-[100dvh] overflow-hidden bg-gray-50 dark:bg-zinc-950 transition-colors font-sans selection:bg-primary/30 text-gray-900 dark:text-zinc-50">
            {/* Sidebar Fixa (Apenas Desktop) */}
            {!isMobile && sidebar && (
                <aside className="hidden md:flex flex-col w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-50">
                    {sidebar}
                </aside>
            )}

            {/* Área Principal */}
            <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative bg-inherit">
                {/* Header Mobile (Apenas Mobile) */}
                {isMobile && headerMobile && (
                    <header className="md:hidden flex-shrink-0 sticky top-0 z-50 bg-inherit border-b border-gray-100 dark:border-zinc-900 flex items-center justify-between p-4">
                        {headerMobile}
                    </header>
                )}

                {/* Container de Conteúdo */}
                <div className={cn(
                    "flex-1 overflow-y-auto no-scrollbar pt-0",
                    !isMobile && "p-8",
                    isMobile && "p-4 pb-24"
                )}>
                    <div className={cn(!isMobile && "max-w-7xl mx-auto")}>
                        {children}
                    </div>
                </div>

                {/* Floating Action Button (Mobile) */}
                {isMobile && fab && (
                    <div className="md:hidden">
                        {fab}
                    </div>
                )}
            </main>

            {/* Bottom Navigation (Apenas Mobile) */}
            {isMobile && bottomNav && (
                <div className="md:hidden flex-shrink-0">
                    {bottomNav}
                </div>
            )}
        </div>
    );
}
