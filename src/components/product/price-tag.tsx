import { discountPercent, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PriceTag({
  price,
  was,
  size = "md",
  className,
}: {
  price: number;
  was?: number | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const off = discountPercent(price, was);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-semibold text-foreground", size === "lg" ? "text-3xl" : "text-base")}>
        {formatMoney(price)}
      </span>
      {off > 0 && was ? (
        <span className={cn("text-muted-foreground line-through", size === "lg" ? "text-base" : "text-xs")}>
          {formatMoney(was)}
        </span>
      ) : null}
    </div>
  );
}
