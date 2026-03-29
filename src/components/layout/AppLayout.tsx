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
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-zinc-950 transition-colors font-sans selection:bg-primary/30">
            {/* Sidebar Fixa (Apenas Desktop) */}
            {!isMobile && sidebar && (
                <aside className="hidden md:flex flex-col flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-50">
                    {sidebar}
                </aside>
            )}

            {/* Área Principal e Rolagem */}
            <main className="flex-1 overflow-y-auto relative no-scrollbar bg-inherit">
                {/* Header Mobile (Apenas Mobile) */}
                {isMobile && headerMobile && (
                    <header className="md:hidden sticky top-0 z-50 bg-inherit border-b border-transparent dark:border-zinc-900 flex items-center justify-between p-4">
                        {headerMobile}
                    </header>
                )}

                {/* Container de Conteúdo */}
                <div className={cn(
                    "max-w-7xl mx-auto p-4 md:p-8",
                    isMobile && "pb-24 pt-0"
                )}>
                    {children}
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
                <div className="md:hidden">
                    {bottomNav}
                </div>
            )}
        </div>
    );
}
