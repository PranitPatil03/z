import { cn } from "@/lib/utils";

interface AnvilLogoProps {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
}

export function AnvilLogo({
  className,
  iconClassName,
  wordmarkClassName,
  showWordmark = true,
}: AnvilLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#1f232b] text-white",
          iconClassName,
        )}
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="anvilLogoGradient" x1="10" x2="54" y1="10" y2="56">
              <stop offset="0%" stopColor="#ff9f5a" />
              <stop offset="100%" stopColor="#ff5d2d" />
            </linearGradient>
          </defs>
          <path
            d="M10 28c5-10 14-16 25-16h15v9H36c-6 0-11 3-14 7H10z"
            fill="url(#anvilLogoGradient)"
          />
          <rect fill="url(#anvilLogoGradient)" height="8" rx="4" width="46" x="9" y="30" />
          <rect fill="url(#anvilLogoGradient)" height="16" rx="4" width="12" x="26" y="38" />
        </svg>
      </span>
      {showWordmark ? (
        <span className={cn("text-xl font-semibold tracking-tight text-[#171a1f]", wordmarkClassName)}>
          anvil
        </span>
      ) : null}
    </span>
  );
}
