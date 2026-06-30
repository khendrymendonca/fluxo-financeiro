import React, { useEffect, useRef, useState } from 'react';

// Funções utilitárias de conversão de cores HSV/HEX
function hsvToHex(h: number, s: number, v: number): string {
    h = h / 360;
    s = s / 100;
    v = v / 100;
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): { h: number, s: number, v: number } {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
    const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
    const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const v = max;

    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max !== min) {
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        v: Math.round(v * 100)
    };
}

interface VisualColorPickerProps {
    value: string;
    onChange: (hex: string) => void;
    label: string;
}

export function VisualColorPicker({ value, onChange, label }: VisualColorPickerProps) {
    const areaRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);

    // Converter cor hexadecimal de entrada para HSV
    const { h: initialH, s: initialS, v: initialV } = hexToHsv(value);

    // Estados locais para controlar o arrasto de forma suave
    const [h, setH] = useState(initialH);
    const [s, setS] = useState(initialS);
    const [v, setV] = useState(initialV);
    const [textValue, setTextValue] = useState(value);

    // Sincronizar o estado local quando a propriedade `value` mudar externamente
    useEffect(() => {
        const { h: newH, s: newS, v: newV } = hexToHsv(value);
        setH(newH);
        setS(newS);
        setV(newV);
        setTextValue(value);
    }, [value]);

    const updateAreaCoords = (clientX: number, clientY: number) => {
        if (!areaRef.current) return;
        const rect = areaRef.current.getBoundingClientRect();
        let x = (clientX - rect.left) / rect.width;
        let y = (clientY - rect.top) / rect.height;

        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));

        const newS = Math.round(x * 100);
        const newV = Math.round((1 - y) * 100);

        setS(newS);
        setV(newV);
        
        const nextHex = hsvToHex(h, newS, newV);
        setTextValue(nextHex);
        onChange(nextHex);
    };

    const updateHueCoords = (clientX: number) => {
        if (!hueRef.current) return;
        const rect = hueRef.current.getBoundingClientRect();
        let x = (clientX - rect.left) / rect.width;

        x = Math.max(0, Math.min(1, x));
        const newH = Math.round(x * 360);

        setH(newH);
        
        const nextHex = hsvToHex(newH, s, v);
        setTextValue(nextHex);
        onChange(nextHex);
    };

    const handleAreaMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        updateAreaCoords(e.clientX, e.clientY);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            updateAreaCoords(moveEvent.clientX, moveEvent.clientY);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleAreaTouchStart = (e: React.TouchEvent) => {
        // Impedir o scroll padrão no celular ao arrastar a cor
        if (e.cancelable) e.preventDefault();
        updateAreaCoords(e.touches[0].clientX, e.touches[0].clientY);

        const handleTouchMove = (moveEvent: TouchEvent) => {
            if (moveEvent.touches.length === 0) return;
            updateAreaCoords(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
        };

        const handleTouchEnd = () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
    };

    const handleHueMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        updateHueCoords(e.clientX);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            updateHueCoords(moveEvent.clientX);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleHueTouchStart = (e: React.TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        updateHueCoords(e.touches[0].clientX);

        const handleTouchMove = (moveEvent: TouchEvent) => {
            if (moveEvent.touches.length === 0) return;
            updateHueCoords(moveEvent.touches[0].clientX);
        };

        const handleTouchEnd = () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTextValue(val);
        
        // Se for um hex válido de 7 caracteres (com o #), atualiza as cores
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            onChange(val);
        }
    };

    return (
        <div className="flex flex-col gap-4 bg-gray-50/60 dark:bg-zinc-950/30 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800/80 w-full animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                    {label}
                </span>
                <div className="flex items-center gap-2">
                    <span 
                        className="w-5 h-5 rounded-full border border-gray-200 dark:border-zinc-800 shadow-sm"
                        style={{ backgroundColor: value }}
                    />
                    <input
                        type="text"
                        value={textValue}
                        onChange={handleTextChange}
                        className="w-20 text-[11px] font-mono text-center font-bold h-7 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground"
                    />
                </div>
            </div>

            {/* Quadro RGB / HSV (Saturation & Value) */}
            <div
                ref={areaRef}
                className="relative w-full h-32 rounded-2xl cursor-crosshair select-none overflow-hidden shadow-inner border border-gray-100 dark:border-zinc-800/50"
                style={{
                    backgroundColor: `hsl(${h}, 100%, 50%)`,
                    backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
                }}
                onMouseDown={handleAreaMouseDown}
                onTouchStart={handleAreaTouchStart}
            >
                {/* Indicador de Bolinha / Cursor */}
                <div
                    className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.6)] -translate-x-2 -translate-y-2 pointer-events-none"
                    style={{
                        left: `${s}%`,
                        top: `${100 - v}%`,
                        backgroundColor: value
                    }}
                />
            </div>

            {/* Slider de Hue (Matiz) */}
            <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-400">
                    <span>Tom</span>
                    <span>{h}°</span>
                </div>
                <div
                    ref={hueRef}
                    className="relative w-full h-3 rounded-full cursor-pointer select-none border border-gray-100 dark:border-zinc-800/30"
                    style={{
                        background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                    }}
                    onMouseDown={handleHueMouseDown}
                    onTouchStart={handleHueTouchStart}
                >
                    {/* Indicador de Posição do Tom */}
                    <div
                        className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_3px_rgba(0,0,0,0.5)] -translate-x-2 -translate-y-0.5 pointer-events-none"
                        style={{
                            left: `${(h / 360) * 100}%`,
                            backgroundColor: `hsl(${h}, 100%, 50%)`
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
