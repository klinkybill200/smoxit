interface LogoProps {
  className?: string;
  size?: number;
}

export const SmoxitLogo = ({ className = "", size = 32 }: LogoProps) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="40" height="40" rx="10" fill="hsl(var(--primary))" />
      <path
        d="M11 11 L20 20 L11 29 M29 11 L20 20 L29 29"
        stroke="hsl(var(--accent))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span className="font-display font-black tracking-tight text-foreground" style={{ fontSize: size * 0.72 }}>
      SMOXIT
    </span>
  </div>
);
