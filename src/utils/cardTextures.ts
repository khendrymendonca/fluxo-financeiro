import { CardTexture } from '@/types/finance';

export const CARD_TEXTURES: Record<CardTexture, { label: string; className: string; style?: React.CSSProperties }> = {
  solid: {
    label: 'Sólido',
    className: 'bg-opacity-100',
  },
  metallic: {
    label: 'Metálico',
    className: 'bg-gradient-to-br from-white/30 via-transparent to-black/20 mix-blend-overlay',
  },
  carbon: {
    label: 'Carbono',
    className: 'mix-blend-soft-light opacity-40',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
    },
  },
  holographic: {
    label: 'Holográfico',
    className: 'bg-gradient-to-tr from-purple-500/20 via-cyan-400/20 to-yellow-300/20 mix-blend-color-dodge animate-pulse duration-[4000ms]',
  },
  black: {
    label: 'Black Edition',
    className: 'bg-zinc-950/90 mix-blend-multiply border-t border-white/20',
  },
  comic: {
    label: 'Pop Art',
    className: 'mix-blend-overlay opacity-20',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    },
  },
};
