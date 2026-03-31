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

  // METÁLICO — gloss que respeita a cor base, simulando reflexo de luz
  metallic: {
    label: 'Metálico',
    className: '',
    style: {
      background: `linear-gradient(
        135deg,
        #c0c0c0 0%,
        #f8f8f8 25%,
        #e0e0e0 40%,
        #ffffff 50%,
        #d0d0d0 65%,
        #a8a8a8 80%,
        #c8c8c8 100%
      )`,
    },
    overrideColor: true,
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

  // HOLOGRÁFICO — arco-íris que desloca como se fosse percepção angular
  holographic: {
    label: 'Holográfico',
    className: 'mix-blend-overlay',
    style: {
      background: `
        linear-gradient(
          125deg,
          rgba(255, 0, 128, 0.60)   0%,
          rgba(255, 100,  0, 0.55)  15%,
          rgba(255, 220,  0, 0.55)  30%,
          rgba(0,  230, 120, 0.55)  45%,
          rgba(0,  180, 255, 0.58)  60%,
          rgba(100,  80, 255, 0.60) 75%,
          rgba(255,   0, 200, 0.60) 88%,
          rgba(255,   0, 128, 0.60) 100%
        )
      `,
      backgroundSize: '300% 300%',
      animation: 'holographicShift 5s ease infinite',
    },
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

  // POP ART — bolinhas halftone sobre a cor
  comic: {
    label: 'Pop Art',
    className: 'mix-blend-overlay opacity-50',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '20px 20px',
    },
  },
};
