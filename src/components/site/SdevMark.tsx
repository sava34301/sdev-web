export const SdevMark = ({ size = 28, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="hsl(var(--ink))" />
    <path d="M21 10.5h-6.5a2.9 2.9 0 0 0 0 5.8h3a2.9 2.9 0 0 1 0 5.8H11" fill="none" stroke="hsl(var(--paper))" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="20.6" y="19.4" width="3.4" height="3.4" rx=".7" fill="hsl(var(--lime))" />
  </svg>
);
