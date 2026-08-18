import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';
import { Input } from './input';
import { Pipette, Check } from 'lucide-react';

// 10 Cores mais elegantes e executivas do App
export const APP_COLORS = [
    '#0D9488', // Teal Principal
    '#10B981', // Verde Esmeralda
    '#3B82F6', // Azul Royal
    '#6366F1', // Índigo
    '#8B5CF6', // Violeta
    '#EC4899', // Rosa
    '#EF4444', // Vermelho
    '#F97316', // Laranja
    '#F59E0B', // Âmbar / Ouro
    '#18181B', // Grafite Escuro
];

interface ColorSelectorProps {
    selectedColor: string;
    onSelect: (color: string) => void;
    label?: string;
    className?: string;
}

export function ColorSelector({ selectedColor, onSelect, label, className }: ColorSelectorProps) {
    const [hexInput, setHexInput] = useState(selectedColor || '#0D9488');

    useEffect(() => {
        if (selectedColor && selectedColor !== hexInput) {
            setHexInput(selectedColor);
        }
    }, [selectedColor]);

    const handleHexChange = (value: string) => {
        let clean = value.trim();
        if (!clean.startsWith('#')) {
            clean = `#${clean}`;
        }
        setHexInput(clean);

        if (/^#([0-9A-F]{3}){1,2}$/i.test(clean)) {
            onSelect(clean);
        }
    };

    const handleNativeColorPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();
        setHexInput(val);
        onSelect(val);
    };

    const getContrastColor = (hexColor: string) => {
        if (!hexColor || !hexColor.startsWith('#') || hexColor.length < 7) return '#ffffff';
        const r = parseInt(hexColor.slice(1, 3), 16) || 0;
        const g = parseInt(hexColor.slice(3, 5), 16) || 0;
        const b = parseInt(hexColor.slice(5, 7), 16) || 0;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.6 ? '#000000' : '#ffffff';
    };

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0.5">
                    {label}
                </Label>
            )}

            {/* 10 Cores Rápidas com Tamanho Fixo e Borda de Alto Contraste */}
            <div className="flex flex-wrap items-center justify-start gap-2 p-2 bg-muted/15 rounded-xl border border-border/40">
                {APP_COLORS.map((color) => {
                    const isSelected = selectedColor?.toLowerCase() === color.toLowerCase();
                    const checkColor = getContrastColor(color);

                    return (
                        <button
                            key={color}
                            type="button"
                            onClick={() => {
                                setHexInput(color);
                                onSelect(color);
                            }}
                            className={cn(
                                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-all duration-150 flex items-center justify-center relative hover:scale-110 active:scale-95 shrink-0 border border-white/20 dark:border-white/20",
                                isSelected
                                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-xs"
                                    : "opacity-85 hover:opacity-100"
                            )}
                            style={{ 
                                backgroundColor: color,
                                boxShadow: color.toLowerCase() === '#18181b' ? '0 0 0 1px rgba(255,255,255,0.2)' : undefined
                            }}
                            title={color}
                        >
                            {isSelected && (
                                <Check className="w-3.5 h-3.5 stroke-[3px]" style={{ color: checkColor }} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Input HEX Personalizado + Seletor Nativo */}
            <div className="flex items-center gap-2 p-1.5 bg-muted/20 rounded-xl border border-border/40">
                {/* Seletor Nativo com Conta-gotas */}
                <div className="relative shrink-0">
                    <input
                        type="color"
                        id="custom-color-picker"
                        value={/^#([0-9A-F]{3}){1,2}$/i.test(selectedColor) ? selectedColor : '#0D9488'}
                        onChange={handleNativeColorPick}
                        className="w-8 h-8 rounded-lg border cursor-pointer opacity-0 absolute inset-0 z-10"
                        title="Abrir seletor de cores"
                    />
                    <div
                        className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center shadow-xs transition-transform hover:scale-105"
                        style={{ backgroundColor: selectedColor || '#0D9488' }}
                    >
                        <Pipette className="w-3.5 h-3.5" style={{ color: getContrastColor(selectedColor || '#0D9488') }} />
                    </div>
                </div>

                {/* Campo de texto HEX */}
                <div className="flex-1">
                    <Input
                        type="text"
                        placeholder="#0D9488"
                        maxLength={7}
                        value={hexInput}
                        onChange={(e) => handleHexChange(e.target.value)}
                        className="h-8 text-xs font-mono font-bold uppercase tracking-wider rounded-lg bg-background border-border/40 px-2.5"
                    />
                </div>

                {/* Badge de Cor Ativa */}
                <div
                    className="px-2.5 h-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-black uppercase border border-white/20 shrink-0 shadow-xs"
                    style={{
                        backgroundColor: selectedColor || '#0D9488',
                        color: getContrastColor(selectedColor || '#0D9488')
                    }}
                >
                    {selectedColor || '#0D9488'}
                </div>
            </div>
        </div>
    );
}
