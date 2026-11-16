import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deleteAddress, saveAddress, setDefaultAddress, type AddressRow } from "@/lib/account.functions";
import { accountQuery } from "@/lib/account-queries";
import { QATAR_CITIES } from "@/lib/qatar";

export const Route = createFileRoute("/_authenticated/account/addresses")({
  loader: ({ context }) => context.queryClient.ensureQueryData(accountQuery()),
  component: AddressesPage,
});

type Draft = {
  id?: string;
  label: string;
  full_name: string;
  phone: string;
  city: string;
  area: string;
  street: string;
  building_number: string;
  apartment_number: string;
  delivery_instructions: string;
  is_default: boolean;
};

const blank: Draft = {
  label: "Home",
  full_name: "",
  phone: "",
  city: "Doha",
  area: "",
  street: "",
  building_number: "",
  apartment_number: "",
  delivery_instructions: "",
  is_default: false,
};

function toDraft(address: AddressRow): Draft {
  return {
    id: address.id,
    label: address.label,
    full_name: address.full_name,
    phone: address.phone,
    city: address.city,
    area: address.area ?? "",
    street: address.street ?? "",
    building_number: address.building_number ?? "",
    apartment_number: address.apartment_number ?? "",
    delivery_instructions: address.delivery_instructions ?? "",
    is_default: address.is_default,
  };
}

function AddressesPage() {
  const { data: account } = useSuspenseQuery(accountQuery());
  const queryClient = useQueryClient();
  const save = useServerFn(saveAddress);
  const remove = useServerFn(deleteAddress);
  const makeDefault = useServerFn(setDefaultAddress);
  const [draft, setDraft] = useState<Draft | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["account"] });

  const saveMutation = useMutation({
    mutationFn: (value: Draft) => save({ data: value }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Address saved");
      setDraft(null);
      void refresh();
    },
    onError: () => toast.error("Could not save this address."),
  });

  const set = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((current) => (current ? { ...current, [key]: event.target.value } : current));

  return (
    <AccountShell title="Saved addresses">
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() =>
            setDraft({ ...blank, full_name: account.profile?.full_name ?? "", phone: account.profile?.phone ?? "", is_default: account.addresses.length === 0 })
          }
        >
          <Plus /> Add address
        </Button>
      </div>

      {account.addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <MapPin className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-medium">No saved addresses</p>
          <p className="text-sm text-muted-foreground">Save one and checkout fills it in for you.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {account.addresses.map((address) => (
            <li key={address.id} className="flex flex-col rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{address.label}</p>
                {address.is_default ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">Default</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm">{address.full_name} · {address.phone}</p>
              <p className="text-sm text-muted-foreground">
                {[address.building_number && `Bldg ${address.building_number}`, address.apartment_number && `Apt ${address.apartment_number}`, address.street, address.area, address.city]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {address.delivery_instructions ? (
                <p className="mt-1 text-xs text-muted-foreground">“{address.delivery_instructions}”</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setDraft(toDraft(address))}>
                  <Pencil /> Edit
                </Button>
                {!address.is_default ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await makeDefault({ data: { id: address.id } });
                      void refresh();
                    }}
                  >
                    <Star /> Make default
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    if (!window.confirm("Delete this address?")) return;
                    await remove({ data: { id: address.id } });
                    toast.success("Address deleted");
                    void refresh();
                  }}
                >
                  <Trash2 /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit address" : "New address"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate(draft);
              }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Field label="Label" id="ad-label">
                <Input id="ad-label" value={draft.label} onChange={set("label")} placeholder="Home, Work…" />
              </Field>
              <Field label="City *" id="ad-city">
                <Select value={draft.city} onValueChange={(value) => setDraft((d) => (d ? { ...d, city: value } : d))}>
                  <SelectTrigger id="ad-city"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QATAR_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Full name *" id="ad-name">
                <Input id="ad-name" required value={draft.full_name} onChange={set("full_name")} />
              </Field>
              <Field label="Phone *" id="ad-phone">
                <Input id="ad-phone" required value={draft.phone} onChange={set("phone")} />
              </Field>
              <Field label="Area / zone" id="ad-area">
                <Input id="ad-area" value={draft.area} onChange={set("area")} />
              </Field>
              <Field label="Street" id="ad-street">
                <Input id="ad-street" value={draft.street} onChange={set("street")} />
              </Field>
              <Field label="Building" id="ad-building">
                <Input id="ad-building" value={draft.building_number} onChange={set("building_number")} />
              </Field>
              <Field label="Apartment" id="ad-apt">
                <Input id="ad-apt" value={draft.apartment_number} onChange={set("apartment_number")} />
              </Field>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ad-notes">Delivery notes</Label>
                <Textarea id="ad-notes" rows={2} value={draft.delivery_instructions} onChange={set("delivery_instructions")} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox checked={draft.is_default} onCheckedChange={(value) => setDraft((d) => (d ? { ...d, is_default: value === true } : d))} />
                Use as my default address
              </label>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="animate-spin" /> : null} Save address
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </AccountShell>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
