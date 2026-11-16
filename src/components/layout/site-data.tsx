import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { AFTER_AUTH_KEY, safeRedirect } from "@/lib/auth-actions";
import type { Brand, Category, WebsiteSettings } from "@/lib/types";

type SiteDataValue = {
  settings: WebsiteSettings;
  categories: Category[];
  brands: Brand[];
  session: Session | null;
  signedIn: boolean;
  /** False until the browser has checked for a saved sign-in. */
  authReady: boolean;
};

const SiteDataContext = createContext<SiteDataValue | null>(null);

export function SiteDataProvider({
  settings,
  categories,
  brands,
  children,
}: {
  settings: WebsiteSettings;
  categories: Category[];
  brands: Brand[];
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  // One app-wide listener: it keeps the header, the cart badge and the page cache honest.
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(nextSession);
      void router.invalidate();
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        return;
      }
      void queryClient.invalidateQueries();
      // Finish a social sign-in or email confirmation on the page the shopper started from.
      if (event === "SIGNED_IN") {
        const next = window.sessionStorage.getItem(AFTER_AUTH_KEY);
        if (next) {
          window.sessionStorage.removeItem(AFTER_AUTH_KEY);
          void router.navigate({ to: safeRedirect(next) as "/" });
        }
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return (
    <SiteDataContext.Provider
      value={{ settings, categories, brands, session, signedIn: Boolean(session), authReady }}
    >
      {children}
    </SiteDataContext.Provider>
  );
}

export function useSiteData(): SiteDataValue {
  const context = useContext(SiteDataContext);
  if (!context) throw new Error("useSiteData must be used inside SiteDataProvider");
  return context;
}
