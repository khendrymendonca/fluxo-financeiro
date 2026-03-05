import { cn } from '@/lib/utils';
import { Label } from './label';

export const APP_COLORS = [
    '#A78BFA', // Violet
    '#F97316', // Orange
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#6366F1', // Indigo
    '#F59E0B', // Amber
];

interface ColorSelectorProps {
    selectedColor: string;
    onSelect: (color: string) => void;
    label?: string;
    className?: string;
}

export function ColorSelector({ selectedColor, onSelect, label, className }: ColorSelectorProps) {
    return (
        <div className={cn("space-y-3", className)}>
            {label && (
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 text-center block">
                    {label}
                </Label>
            )}
            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-3xl gap-2 overflow-x-auto no-scrollbar">
                {APP_COLORS.map((color) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onSelect(color)}
                        className={cn(
                            "w-10 h-10 rounded-xl transition-all hover:scale-110 active:scale-90 shrink-0",
                            selectedColor === color
                                ? "ring-4 ring-primary ring-offset-4 ring-offset-background scale-110 shadow-lg"
                                : "opacity-70 hover:opacity-100"
                        )}
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
        </div>
    );
}
