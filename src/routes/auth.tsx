import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";

import { useSiteData } from "@/components/layout/site-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AFTER_AUTH_KEY, safeRedirect } from "@/lib/auth-actions";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create an account | AmarBazar" },
      { name: "description", content: "Sign in to AmarBazar to track orders, save addresses and keep a wishlist." },
      { property: "og:title", content: "Sign in | AmarBazar" },
      { property: "og:description", content: "Your AmarBazar account: orders, addresses and wishlist in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const GOOGLE_G = (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);

function AuthPage() {
  const search = Route.useSearch();
  const target = safeRedirect(search.redirect);
  const navigate = useNavigate();
  const { signedIn, authReady } = useSiteData();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "" });

  useEffect(() => {
    if (authReady && signedIn) void navigate({ to: target as "/", replace: true });
  }, [authReady, signedIn, navigate, target]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("confirm")
          ? "Please confirm your email first — check your inbox."
          : "That email and password don't match.",
      );
      return;
    }
    toast.success("Welcome back!");
  }

  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    if (form.password.length < 8) {
      toast.error("Please choose a password of at least 8 characters.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: form.full_name.trim(), phone: form.phone.trim() },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      window.sessionStorage.setItem(AFTER_AUTH_KEY, target);
      setSentTo(form.email.trim());
    }
  }

  async function forgot(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error("We couldn't send the reset email. Please try again.");
      return;
    }
    setSentTo(form.email.trim());
  }

  async function social(provider: "google" | "lovable") {
    window.sessionStorage.setItem(AFTER_AUTH_KEY, target);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      window.sessionStorage.removeItem(AFTER_AUTH_KEY);
      toast.error("Sign-in was cancelled or failed. Please try again.");
      return;
    }
  }

  if (sentTo) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
          <MailCheck className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a link to <span className="font-medium text-foreground">{sentTo}</span>.{" "}
          {tab === "forgot" ? "Open it to choose a new password." : "Open it to confirm your account, then you're signed in."}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => { setSentTo(null); setTab("signin"); }}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-2 lg:py-16">
      <div className="hidden flex-col justify-center lg:flex">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Your AmarBazar account</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">Groceries you trust, a basket that remembers you.</h1>
        <ul className="mt-6 space-y-3 text-muted-foreground">
          <li>• Follow every order from packing to your door</li>
          <li>• Save delivery addresses for one-tap checkout</li>
          <li>• Keep a wishlist of favourites across devices</li>
        </ul>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <div className="mt-6 grid gap-3">
            <Button type="button" variant="google" size="lg" className="h-11 w-full" onClick={() => void social("google")}>
              {GOOGLE_G}
              Continue with Google
            </Button>
            <button type="button" className="lovable-auth-button" onClick={() => void social("lovable")}>
              Continue with Lovable
            </button>
          </div>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
          </div>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="si-password">Password</Label>
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => setTab("forgot")}>
                    Forgot password?
                  </button>
                </div>
                <Input id="si-password" type="password" required autoComplete="current-password" value={form.password} onChange={set("password")} />
              </div>
              <Button type="submit" size="lg" className="w-full rounded-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null} Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" required autoComplete="name" value={form.full_name} onChange={set("full_name")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-phone">Phone</Label>
                  <Input id="su-phone" autoComplete="tel" placeholder="+974 5555 1234" value={form.phone} onChange={set("phone")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-password">Password</Label>
                <Input id="su-password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <Button type="submit" size="lg" className="w-full rounded-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null} Create account
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="forgot">
            <form onSubmit={forgot} className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter your email and we'll send you a link to choose a new password.</p>
              <div className="space-y-1.5">
                <Label htmlFor="fp-email">Email</Label>
                <Input id="fp-email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
              </div>
              <Button type="submit" size="lg" className="w-full rounded-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null} Send reset link
              </Button>
              <button type="button" className="w-full text-center text-sm text-primary hover:underline" onClick={() => setTab("signin")}>
                Back to sign in
              </button>
            </form>
          </TabsContent>
        </Tabs>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/terms-of-service" className="underline">terms</Link> and{" "}
          <Link to="/privacy-policy" className="underline">privacy policy</Link>.
        </p>
      </div>
    </div>
  );
}
