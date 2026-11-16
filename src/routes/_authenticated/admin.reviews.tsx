import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { RatingStars } from "@/components/product/rating-stars";
import { Button } from "@/components/ui/button";
import { adminDeleteReview, adminSetReviewApproved } from "@/lib/admin.functions";
import { adminReviewsQuery } from "@/lib/admin-queries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: AdminReviewsPage,
});

function AdminReviewsPage() {
  const [pendingOnly, setPendingOnly] = useState(true);
  const { data: reviews = [], isLoading } = useQuery(adminReviewsQuery(pendingOnly));
  const queryClient = useQueryClient();
  const setApproved = useServerFn(adminSetReviewApproved);
  const remove = useServerFn(adminDeleteReview);

  async function act(promise: Promise<{ ok: boolean; message?: string }>, done: string) {
    const result = await promise;
    if (!result.ok) {
      toast.error(result.message ?? "Something went wrong.");
      return;
    }
    toast.success(done);
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["product"] });
  }

  return (
    <>
      <AdminTitle title="Reviews" description="New reviews stay hidden until you approve them." />
      <div className="mb-4 flex gap-1">
        {[
          { value: true, label: "Waiting for approval" },
          { value: false, label: "All reviews" },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setPendingOnly(option.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              pendingOnly === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <Panel>
          <p className="py-8 text-center text-sm text-muted-foreground">{pendingOnly ? "No reviews waiting. Nice!" : "No reviews yet."}</p>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => {
            const product = (review as typeof review & { products: { name: string; slug: string } | null }).products;
            return (
              <li key={review.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <RatingStars value={review.rating} />
                    <p className="mt-1 font-medium">{review.title ?? "No title"}</p>
                    <p className="text-xs text-muted-foreground">
                      {review.author_name ?? "Customer"} · {formatDate(review.created_at)}
                      {product ? (
                        <>
                          {" · "}
                          <Link to="/product/$slug" params={{ slug: product.slug }} className="text-primary hover:underline">{product.name}</Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", review.is_approved ? "bg-success/15 text-success" : "bg-harvest/20 text-harvest-foreground")}>
                    {review.is_approved ? "Live" : "Waiting"}
                  </span>
                </div>
                {review.body ? <p className="mt-2 text-sm text-muted-foreground">{review.body}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.is_approved ? (
                    <Button size="sm" variant="outline" onClick={() => void act(setApproved({ data: { id: review.id, approved: false } }), "Review hidden")}>
                      <EyeOff /> Hide
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void act(setApproved({ data: { id: review.id, approved: true } }), "Review approved")}>
                      <Check /> Approve
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (window.confirm("Delete this review?")) void act(remove({ data: { id: review.id } }), "Review deleted");
                    }}
                  >
                    <Trash2 /> Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
