import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/branding/AppLogo';
import { disableTutorialAutoOffer } from '@/hooks/useTutorialState';

interface TutorialOfferDialogProps {
  open: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

export function TutorialOfferDialog({ open, onStart, onDismiss }: TutorialOfferDialogProps) {
  const handleDismiss = () => {
    disableTutorialAutoOffer('initial offer dismissed');
    onDismiss();
  };

  const handleStart = () => {
    disableTutorialAutoOffer('initial offer started');
    onStart();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) handleDismiss();
    }}>
      <DialogContent className="max-w-md rounded-3xl border-border">
        <DialogHeader className="items-center text-center">
          <div className="text-primary">
            <AppLogo className="h-12 w-36" />
          </div>
          <DialogTitle>Deseja fazer um tour rapido pelo Fluxo?</DialogTitle>
          <DialogDescription>
            Conheca as principais telas e entenda onde pagar contas, acompanhar cartoes, ver relatorios e ajustar seu planejamento.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-center sm:space-x-0">
          <Button variant="ghost" className="rounded-xl font-bold" onClick={handleDismiss}>
            Agora nao
          </Button>
          <Button className="rounded-xl font-bold" onClick={handleStart}>
            Iniciar tutorial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
