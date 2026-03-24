import { cn } from '@/lib/utils';
import { Label } from './label';

export const APP_COLORS = [
    // Premium & Metals
    '#18181B', // Matte Black
    '#27272A', // Carbon
    '#09090B', // Deep Black
    '#D4AF37', // Classic Gold
    '#FBBF24', // Yellow Gold
    '#9CA3AF', // Platinum/Silver
    '#475569', // Slate/Space Grey

    // Primaries
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Emerald Green
    '#F59E0B', // Amber/Yellow

    // Blues & Cyans
    '#06B6D4', // Cyan
    '#0EA5E9', // Sky Blue
    '#1D4ED8', // Royal Blue
    '#312E81', // Navy

    // Purples & Pinks
    '#8B5CF6', // Violet
    '#6D28D9', // Deep Purple
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#A855F7', // Fuchsia

    // Greens
    '#22C55E', // Green
    '#166534', // Dark Green
    '#84CC16', // Lime
    '#14B8A6', // Teal

    // Oranges & Earth
    '#F97316', // Orange
    '#C2410C', // Rust
    '#78350F', // Dark Brown
    '#B45309', // Bronze

    // Extras
    '#6366F1', // Indigo
    '#64748B', // Steel
    '#7DD3FC', // Light Blue
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
            <div className="flex flex-wrap justify-center items-center bg-muted/30 p-4 rounded-3xl gap-3 max-h-48 overflow-y-auto no-scrollbar shadow-inner">
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


