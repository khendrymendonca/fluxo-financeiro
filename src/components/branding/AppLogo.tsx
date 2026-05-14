import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
  ariaLabel?: string;
}

export function AppLogo({ className, ariaLabel = 'Fluxo' }: AppLogoProps) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={cn('inline-block align-middle', className)}
      style={{
        backgroundColor: 'currentColor',
        maskImage: 'url(/fluxo-logo-v2.svg)',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        maskSize: 'contain',
        WebkitMaskImage: 'url(/fluxo-logo-v2.svg)',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        WebkitMaskSize: 'contain',
      }}
    />
  );
}
