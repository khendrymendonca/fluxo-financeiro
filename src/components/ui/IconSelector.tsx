import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from './label';

export const CATEGORY_ICONS = [
  // Essenciais
  { name: 'Home', label: 'Moradia' },
  { name: 'ShoppingCart', label: 'Alimentação' },
  { name: 'Stethoscope', label: 'Saúde' },
  { name: 'GraduationCap', label: 'Educação' },
  { name: 'BookOpen', label: 'Teologia/Estudos' },
  { name: 'Dumbbell', label: 'Academia/Saúde' },
  { name: 'Car', label: 'Transporte' },
  { name: 'Dog', label: 'Pet' },
  
  // Estilo de Vida
  { name: 'Utensils', label: 'Gastronomia Social' },
  { name: 'Church', label: 'Igreja/Ministério' },
  { name: 'Cross', label: 'Fé' },
  { name: 'Cpu', label: 'Dev de Jogos' },
  { name: 'Gamepad2', label: 'Games/Lazer' },
  { name: 'Trophy', label: 'Hobbies/Colecionáveis' },
  { name: 'Tv', label: 'Assinaturas/Streaming' },
  { name: 'Gift', label: 'Presentes/Social' },
  { name: 'Coffee', label: 'Café/Encontros' },
  { name: 'Heart', label: 'Cuidados Pessoais' },
  
  // Objetivos
  { name: 'ShieldCheck', label: 'Reserva de Emergência' },
  { name: 'TrendingUp', label: 'Investimentos' },
  { name: 'Banknote', label: 'Financeiro/Taxas' },
  { name: 'Scale', label: 'Jurídico/Impostos' },
  { name: 'CreditCard', label: 'Cartões' },
  { name: 'Wallet', label: 'Carteira' },
  { name: 'PiggyBank', label: 'Poupança' },
  { name: 'Zap', label: 'Serviços/Utilidades' },
  { name: 'Tag', label: 'Outros' },
  { name: 'Briefcase', label: 'Trabalho' }
];

interface IconSelectorProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
  label?: string;
  color?: string;
}

export function IconSelector({ selectedIcon, onSelect, label, color = '#0d9488' }: IconSelectorProps) {
  // Função para calcular contraste (preto ou branco) baseado na cor de fundo
  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#ffffff';
  };

  const contrastColor = getContrastColor(color);

  return (
    <div className="space-y-3">
      {label && <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{label}</Label>}
      <div className="grid grid-cols-7 gap-2 p-3 bg-muted/10 rounded-2xl border-2 border-dashed border-border/50">
        {CATEGORY_ICONS.map((icon) => {
          const IconComponent = (LucideIcons as any)[icon.name] || LucideIcons.Tag;
          const isSelected = selectedIcon === icon.name;

          return (
            <button
              key={icon.name}
              type="button"
              onClick={() => onSelect(icon.name)}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                isSelected 
                  ? "shadow-lg scale-110" 
                  : "hover:bg-background/50 text-muted-foreground/60"
              )}
              style={isSelected ? { backgroundColor: color, color: contrastColor } : {}}
              title={icon.label}
            >
              <IconComponent className={cn("w-5 h-5", isSelected ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Helper para renderizar o ícone pelo nome
export function IconRenderer({ iconName, className, style }: { iconName: string; className?: string; style?: React.CSSProperties }) {
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Tag;
  return <IconComponent className={className} style={style} />;
}
