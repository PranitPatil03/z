"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

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
  if (showWordmark) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <Image
          alt="anvil"
          className={cn(
            "h-8 w-auto dark:hidden",
            iconClassName,
            wordmarkClassName,
          )}
          height={42}
          priority
          unoptimized
          src="/images/logo.svg?v=2"
          width={134}
        />
        <Image
          alt="anvil"
          className={cn(
            "hidden h-8 w-auto dark:block",
            iconClassName,
            wordmarkClassName,
          )}
          height={42}
          priority
          unoptimized
          src="/images/logo-dark.svg?v=2"
          width={134}
        />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center", className)}>
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-start overflow-hidden rounded-lg border border-border bg-background",
          iconClassName,
        )}
      >
        <Image
          alt="anvil"
          className="h-full w-auto max-w-none object-left dark:hidden"
          height={42}
          unoptimized
          src="/images/logo.svg?v=2"
          width={134}
        />
        <Image
          alt="anvil"
          className="hidden h-full w-auto max-w-none object-left dark:block"
          height={42}
          unoptimized
          src="/images/logo-dark.svg?v=2"
          width={134}
        />
      </span>
    </span>
  );
}
