import { CSSProperties } from 'react';
import { CardTexture } from '@/types/finance';

interface TextureOption {
  label: string;
  className: string;
  style?: CSSProperties;
  overrideColor?: boolean;
}

export const CARD_TEXTURES: Record<string, TextureOption> = {
  // SÓLIDO — sem textura adicional, usa `backgroundColor` no inline style
  solid: {
    label: 'Sólido',
    className: '',
    style: {},
  },

  // HOLOGRÁFICO — gradiente animado contínuo via CSS
  holographic: {
    label: 'Holográfico',
    className: 'mix-blend-overlay',
    style: {
      background: `
        linear-gradient(
          125deg,
          rgba(255,0,128,0.55)   0%,
          rgba(255,140,0,0.50)  18%,
          rgba(255,220,0,0.50)  32%,
          rgba(0,230,120,0.50)  46%,
          rgba(0,180,255,0.52)  60%,
          rgba(100,80,255,0.55) 76%,
          rgba(255,0,200,0.55)  90%,
          rgba(255,0,128,0.55) 100%
        )
      `,
      backgroundSize: '300% 300%',
      animation: 'holographicShift 4s ease infinite',
    },
    overrideColor: false,
  },

  // PRETO FOSCO — ignora `cardColor` e fica pretão/dark
  black: {
    label: 'Black',
    className: 'mix-blend-multiply opacity-50',
    style: {
      backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.1), transparent 50%)',
    },
    overrideColor: true,
  },
};
