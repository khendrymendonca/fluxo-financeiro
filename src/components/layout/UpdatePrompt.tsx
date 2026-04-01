import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { Rocket, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (needRefresh) {
      setIsVisible(true);
    }
  }, [needRefresh]);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-card border-2 border-primary/20 shadow-2xl rounded-3xl p-5 max-w-sm flex flex-col gap-4 backdrop-blur-xl">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Rocket className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-sm tracking-tight">Nova versão disponível!</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                Uma nova versão do Fluxo foi detectada. Atualize agora para receber as novidades e melhorias.
              </p>
            </div>
          </div>
          <button onClick={close} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => updateServiceWorker(true)}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold h-11 shadow-lg shadow-primary/20 group"
          >
            <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            Atualizar Agora
          </Button>
          <Button 
            variant="ghost" 
            onClick={close}
            className="rounded-2xl h-11 font-bold px-4"
          >
            Depois
          </Button>
        </div>
        
        <div className="text-[9px] text-center text-muted-foreground/50 uppercase font-black tracking-widest">
          O login será mantido após a atualização
        </div>
      </div>
    </div>
  );
}
