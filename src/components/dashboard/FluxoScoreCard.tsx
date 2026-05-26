import { useEffect, useMemo, useState } from 'react';

type FluxoScoreCardProps = {
  score: number;
  className?: string;
};

export function FluxoScoreCard({ score, className }: FluxoScoreCardProps) {
  const normalizedScore = Math.max(0, Math.min(1000, score));
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedScore(normalizedScore));
    return () => cancelAnimationFrame(frame);
  }, [normalizedScore]);

  const roundedScore = Math.round(animatedScore);
  const progress = animatedScore / 1000;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);
  const glowOpacity = Math.max(0.2, Math.min(0.75, progress));

  const haloStyle = useMemo(() => ({
    background: `radial-gradient(circle at 50% 50%, hsl(var(--primary) / ${0.18 + glowOpacity * 0.42}) 0%, transparent 62%)`,
    filter: `blur(${10 + glowOpacity * 10}px)`,
    opacity: 0.9,
    transform: `scale(${1.06 + glowOpacity * 0.08})`,
  }), [glowOpacity]);

  return (
    <div className={className}>
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm rounded-[2rem] p-6 h-full">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fluxo Score</p>
        <div className="mt-4 flex items-center justify-center">
          <div className="relative h-[170px] w-[170px]">
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={haloStyle}
              aria-hidden="true"
            />
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="hsl(var(--primary) / 0.15)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                style={{
                  transition: 'stroke-dashoffset 1300ms cubic-bezier(0.2, 0.9, 0.2, 1)',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black tracking-tighter tabular-nums">{roundedScore}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">de 1000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
