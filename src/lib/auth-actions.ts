import { supabase } from "@/integrations/supabase/client";

/** Where to send the shopper once a social sign-in or email confirmation finishes. */
export const AFTER_AUTH_KEY = "amarbazar.after-auth";

/** Signs the shopper out everywhere in this browser and returns them to the homepage. */
export async function signOut() {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") window.location.assign("/");
}

/** Only allow same-site paths as a post-sign-in destination. */
export function safeRedirect(value: unknown): string {
  if (typeof value !== "string") return "/account";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/auth")) return "/account";
  return value;
}
