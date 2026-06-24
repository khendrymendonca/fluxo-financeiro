import { cn } from '@/lib/utils';

export function BandeiraBrasil({ className = "w-5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 14"
      className={cn("rounded-sm shadow-sm shrink-0", className)}
    >
      <rect width="20" height="14" fill="#009B3A" />
      <polygon points="10,2 18,7 10,12 2,7" fill="#FEDF00" />
      <circle cx="10" cy="7" r="3.2" fill="#002776" />
      <path d="M 6.8,7.3 Q 10,6 13.2,7.3" stroke="#FFFFFF" strokeWidth="0.5" fill="none" />
    </svg>
  );
}
