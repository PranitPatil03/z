import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  title?: string;
  description?: string;
  rows?: number;
  className?: string;
}

export function LoadingState({
  title = "Loading...",
  description,
  rows = 3,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-4", className)}
      aria-busy="true"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: rows }, (_, position) => position + 1).map(
          (slot) => (
            <Skeleton key={`loading-row-${slot}`} className="h-4 w-full" />
          ),
        )}
      </div>
    </div>
  );
}
