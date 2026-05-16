import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HelpButtonProps {
  onClick: () => void;
  className?: string;
}

export function HelpButton({ onClick, className }: HelpButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn('h-10 w-10 rounded-xl text-muted-foreground hover:text-primary', className)}
      aria-label="Como utilizar o Fluxo"
      title="Como utilizar o Fluxo"
    >
      <CircleHelp className="h-5 w-5" />
    </Button>
  );
}
