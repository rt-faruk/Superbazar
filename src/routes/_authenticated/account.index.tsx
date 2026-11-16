import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Loader2, MapPin, Package, Shield } from "lucide-react";
import { toast } from "sonner";

import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { updateProfile } from "@/lib/account.functions";
import { accountQuery, myOrdersQuery } from "@/lib/account-queries";

export const Route = createFileRoute("/_authenticated/account/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountQuery()),
      context.queryClient.ensureQueryData(myOrdersQuery()),
    ]),
  component: AccountOverview,
});

function AccountOverview() {
  const { data: account } = useSuspenseQuery(accountQuery());
  const { data: orders } = useSuspenseQuery(myOrdersQuery());
  const queryClient = useQueryClient();
  const save = useServerFn(updateProfile);
  const [profile, setProfile] = useState({ full_name: "", phone: "" });
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    setProfile({ full_name: account.profile?.full_name ?? "", phone: account.profile?.phone ?? "" });
  }, [account.profile]);

  const saveProfile = useMutation({
    mutationFn: () => save({ data: profile }),
    onSuccess: () => {
      toast.success("Profile saved");
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: () => toast.error("Could not save your profile."),
  });

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (passwords.next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: passwords.next,
      current_password: passwords.current,
    } as Parameters<typeof supabase.auth.updateUser>[0]);
    setPwBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPasswords({ current: "", next: "" });
    toast.success("Password updated");
  }

  const active = orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
  const firstName = (account.profile?.full_name ?? "").split(" ")[0];

  return (
    <AccountShell title={firstName ? `Hello, ${firstName}` : "My account"}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat to="/account/orders" icon={Package} label="Orders" value={`${orders.length}`} hint={active ? `${active} on the way` : "All delivered"} />
        <Stat to="/account/addresses" icon={MapPin} label="Saved addresses" value={`${account.addresses.length}`} hint="Used at checkout" />
        <Stat to="/wishlist" icon={Heart} label="Wishlist" value={`${account.wishlist.length}`} hint="Saved for later" />
      </div>

      {account.isAdmin ? (
        <Link to="/admin" className="mt-4 flex items-center gap-3 rounded-2xl border border-primary bg-secondary/60 p-4 text-sm font-medium">
          <Shield className="size-5 text-primary" /> Open the store admin
        </Link>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveProfile.mutate();
          }}
          className="space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="text-lg font-semibold">Your details</h2>
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">Full name</Label>
            <Input id="pf-name" value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-phone">Phone</Label>
            <Input id="pf-phone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="+974 5555 1234" />
          </div>
          <Button type="submit" disabled={saveProfile.isPending}>
            {saveProfile.isPending ? <Loader2 className="animate-spin" /> : null} Save details
          </Button>
        </form>

        <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Change password</h2>
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">Current password</Label>
            <Input id="pw-current" type="password" autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-next">New password</Label>
            <Input id="pw-next" type="password" autoComplete="new-password" value={passwords.next} onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))} />
          </div>
          <Button type="submit" variant="outline" disabled={pwBusy}>
            {pwBusy ? <Loader2 className="animate-spin" /> : null} Update password
          </Button>
        </form>
      </div>
    </AccountShell>
  );
}

function Stat({ to, icon: Icon, label, value, hint }: { to: "/account/orders" | "/account/addresses" | "/wishlist"; icon: typeof Package; label: string; value: string; hint: string }) {
  return (
    <Link to={to} className="card-lift rounded-2xl border border-border bg-card p-4">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Link>
  );
}
