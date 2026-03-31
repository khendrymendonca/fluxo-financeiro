import { CSSProperties } from 'react';
import { CardTexture } from '@/types/finance';

export const CARD_TEXTURES: Record<CardTexture, {
  label: string;
  className: string;
  style?: CSSProperties;
  overrideColor?: boolean;
}> = {
  solid: {
    label: 'Sólido',
    className: '',
  },

  // CARBONO — só a trama, sem alterar a cor base
  carbon: {
    label: 'Carbono',
    className: 'opacity-30',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '6px 6px',
      mixBlendMode: 'overlay' as const,
    },
    overrideColor: false,
  },

  // BLACK EDITION — fosco premium com vinheta sutil, sem brilho
  black: {
    label: 'Black Edition',
    className: 'mix-blend-multiply',
    style: {
      background: `
        radial-gradient(
          ellipse at 60% 40%,
          rgba(60, 60, 60, 0.25) 0%,
          rgba(0,   0,  0, 0.65) 60%,
          rgba(0,   0,  0, 0.85) 100%
        )
      `,
    },
  },
};
