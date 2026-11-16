import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { useSiteData } from "@/components/layout/site-data";
import { toggleWishlist } from "@/lib/account.functions";
import { myWishlistIds } from "@/lib/storefront.functions";

export function useWishlist() {
  const { signedIn } = useSiteData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fetchIds = useServerFn(myWishlistIds);
  const toggle = useServerFn(toggleWishlist);

  const ids = useQuery({
    queryKey: ["wishlist-ids"],
    queryFn: () => fetchIds(),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (productId: string) => toggle({ data: { productId } }),
    onSuccess: (result) => {
      toast.success(result.saved ? "Saved to your wishlist" : "Removed from your wishlist");
      void queryClient.invalidateQueries({ queryKey: ["wishlist-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: () => toast.error("Could not update your wishlist."),
  });

  const saved = new Set(signedIn ? (ids.data ?? []) : []);

  return {
    isSaved: (productId: string) => saved.has(productId),
    toggle: (productId: string) => {
      if (!signedIn) {
        toast("Sign in to save items to your wishlist");
        void navigate({
          to: "/auth",
          search: { redirect: typeof window !== "undefined" ? window.location.pathname : "/" },
        });
        return;
      }
      mutation.mutate(productId);
    },
    pending: mutation.isPending,
  };
}
