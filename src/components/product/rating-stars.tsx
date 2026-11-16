import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const icon = size === "sm" ? "size-3.5" : "size-4";
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(icon, n <= Math.round(value) ? "fill-star text-star" : "text-border")}
          />
        ))}
      </div>
      {count != null ? <span className="text-xs text-muted-foreground">({count})</span> : null}
    </div>
  );
}
