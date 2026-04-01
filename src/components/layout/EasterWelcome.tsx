import { useState, useEffect } from 'react';
import { Rabbit, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EasterWelcome() {
  const [open, setOpen] = useState(false);
  const { setAccentColor } = useThemeColor();

  useEffect(() => {
    // Verifica se o usuário já viu este aviso específico de 2026
    const hasSeen = localStorage.getItem('easter-announcement-2026');
    if (!hasSeen) {
      // Pequeno delay para aparecer após o dashboard carregar
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnableEaster = () => {
    setAccentColor('pascoa');
    localStorage.setItem('easter-announcement-2026', 'true');
    setOpen(false);
  };

  const handleClose = () => {
    localStorage.setItem('easter-announcement-2026', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-card border-2 border-primary/20 rounded-[2.5rem] p-8 gap-6 overflow-hidden">
        {/* Decoração de fundo sutil */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

        <div className="flex flex-col items-center text-center space-y-4 relative z-10">
          <div className="w-20 h-20 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center animate-bounce duration-1000 shadow-xl shadow-primary/10">
            <Rabbit className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Edição Especial</p>
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight leading-tight">
              A Páscoa chegou ao Fluxo!
            </DialogTitle>
            <DialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
              Preparamos um novo tema exclusivo para você. Habilite agora e aproveite os coelhinhos e cores de páscoa por tempo limitado.
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-3 relative z-10">
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

        <p className="text-[9px] text-center text-muted-foreground/40 font-black uppercase tracking-widest">
          Você pode desativar a qualquer momento no menu lateral
        </p>
      </DialogContent>
    </Dialog>
  );
}
