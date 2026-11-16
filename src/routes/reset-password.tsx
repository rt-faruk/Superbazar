import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [ready, setReady] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.hash.includes("type=recovery");
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setMessage({ kind: "error", text: "Please use at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setMessage({ kind: "error", text: "The two passwords do not match." });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage({ kind: "error", text: "That link has expired. Please request a new one." });
      return;
    }
    setMessage({ kind: "ok", text: "Your password is updated. You can sign in now." });
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Choose a new password</CardTitle>
          <CardDescription>
            {ready
              ? "Pick a password you have not used before."
              : "Open this page from the link in your reset email."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ready ? (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {message ? (
                <p className={message.kind === "ok" ? "text-sm text-primary" : "text-sm text-destructive"}>
                  {message.text}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Save new password
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Did not get the link?{" "}
              <a href="/auth" className="font-medium text-primary underline">
                Request a new one
              </a>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password | AmarBazar" },
      { name: "description", content: "Set a new password for your AmarBazar account." },
    ],
  }),
  component: ResetPasswordPage,
});
