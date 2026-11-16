import { useQuery } from "@tanstack/react-query";

import { useSiteData } from "@/components/layout/site-data";
import { supabase } from "@/integrations/supabase/client";

/** Whether the signed-in shopper has the admin role (checked in the database). */
export function useIsAdmin(): boolean {
  const { session } = useSiteData();
  const userId = session?.user.id;
  const { data } = useQuery({
    queryKey: ["is-admin", userId],
    queryFn: async () => {
      const { data: result } = await supabase.rpc("is_admin");
      return result === true;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });
  return Boolean(userId && data);
}
