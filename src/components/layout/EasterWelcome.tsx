import { useState, useEffect } from 'react';
import { Rabbit, Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/useThemeColor';

export function EasterWelcome() {
  const [open, setOpen] = useState(false);
  const { setAccentColor } = useThemeColor();

  useEffect(() => {
    // Pequeno delay para aparecer após o dashboard carregar
    const timer = setTimeout(() => {
      setOpen(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleEnableEaster = () => {
    setAccentColor('pascoa');
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Overlay de fundo */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={handleClose}
      />

      {/* Card do popup */}
      <div 
        className="relative w-full max-w-md bg-white dark:bg-zinc-950 border-2 border-primary/20 rounded-[2.5rem] p-8 gap-6 overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decoração de fundo sutil */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

        <button 
          onClick={handleClose}
          className="absolute right-6 top-6 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 relative z-10">
          <div className="w-20 h-20 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center animate-bounce duration-1000 shadow-xl shadow-primary/10">
            <Rabbit className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Edição Especial</p>
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-tight">
              A Páscoa chegou ao Fluxo!
            </h2>
            <p className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
              Preparamos um novo tema exclusivo para você. Habilite agora e aproveite os coelhinhos e cores de páscoa por tempo limitado.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 relative z-10 mt-6">
          <Button 
            onClick={handleEnableEaster}
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 font-black text-base shadow-lg shadow-primary/20 group"
          >
            Habilitar Tema de Páscoa
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleClose}
            className="w-full h-12 rounded-2xl font-bold text-muted-foreground hover:text-foreground"
          >
            Manter tema padrão
          </Button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground/40 font-black uppercase tracking-widest mt-6">
          Você pode desativar a qualquer momento no menu lateral
        </p>
      </div>
    </div>
  );
}
