import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: string;
    icon?: LucideIcon;
    className?: string;
    children?: React.ReactNode;
}

export function PageHeader({ title, icon: Icon, className, children }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500", className)}>
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
                        <Icon className="w-6 h-6" />
                    </div>
                )}
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    {title}
                </h1>
            </div>
            {children && (
                <div className="flex items-center gap-2">
                    {children}
                </div>
            )}
        </div>
    );
}
