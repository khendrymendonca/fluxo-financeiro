import { cn } from '@/lib/utils';
import { useGlobalFlag } from '@/hooks/useFeatureFlags';
import { useThemeColor } from '@/hooks/useThemeColor';

interface AppLogoProps {
  className?: string;
  ariaLabel?: string;
  isLoginScreen?: boolean;
}

export function AppLogo({ className, ariaLabel = 'Fluxo', isLoginScreen = false }: AppLogoProps) {
  const copaEnabled = useGlobalFlag('theme_copa');
  
  let modoTorcida = false;
  try {
    const themeContext = useThemeColor();
    modoTorcida = themeContext?.modoTorcida || false;
  } catch {
    // Caso fora do context (ex: tela de login)
  }

  // A logo da Copa só aparece na tela de login se a flag global estiver ativa OU se o modo torcida estiver ativo.
  // Já dentro do app (onde isLoginScreen = false), a logo da Copa só aparece se o usuário explicitamente ativou o modo torcida.
  const showCopaLogo = isLoginScreen ? (copaEnabled || modoTorcida) : modoTorcida;

  if (showCopaLogo) {
    return (
      <img
        src="/fluxo-logo-copa.png"
        alt={ariaLabel}
        className={cn('inline-block align-middle object-contain', className)}
      />
    );
  }

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

