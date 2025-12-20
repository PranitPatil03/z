import { cn } from "@/lib/utils";
import type * as React from "react";

function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border",
        className,
      )}
      {...props}
    />
  );
}

interface AvatarImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "alt"> {}

function AvatarImage({ className, ...props }: AvatarImageProps) {
  return (
    <img
      {...props}
      alt="Avatar"
      className={cn("aspect-square h-full w-full", className)}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
