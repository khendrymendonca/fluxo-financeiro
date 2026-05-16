import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { tutorialSteps } from '@/components/tutorial/tutorialSteps';

interface GuidedTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinish?: () => void;
}

export function GuidedTour({ open, onOpenChange, onFinish }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = tutorialSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tutorialSteps.length - 1;
  const progress = useMemo(
    () => `${stepIndex + 1} de ${tutorialSteps.length}`,
    [stepIndex]
  );

  const close = () => onOpenChange(false);

  const finish = () => {
    onFinish?.();
    setStepIndex(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) setStepIndex(0);
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="max-w-lg rounded-3xl border-border">
        <DialogHeader>
          <div className="mb-1 flex items-center justify-between pr-8">
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              Tutorial {progress}
            </span>
          </div>
          <DialogTitle className="text-xl font-black">{step.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {step.body}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1">
          {tutorialSteps.map((item, index) => (
            <div
              key={item.id}
              className={index <= stepIndex ? 'h-1 flex-1 rounded-full bg-primary' : 'h-1 flex-1 rounded-full bg-muted'}
            />
          ))}
        </div>

        <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
          <Button variant="ghost" className="rounded-xl font-bold" onClick={close}>
            <X className="mr-2 h-4 w-4" />
            Sair
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl font-bold"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={isFirst}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button
              className="rounded-xl font-bold"
              onClick={() => {
                if (isLast) finish();
                else setStepIndex((current) => current + 1);
              }}
            >
              {isLast ? 'Concluir' : 'Proximo'}
              {!isLast && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
