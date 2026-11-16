import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminSaveSettings } from "@/lib/admin.functions";
import { adminSettingsQuery } from "@/lib/admin-queries";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminSettingsQuery()),
  component: SettingsPage,
});

const TEXT_FIELDS = [
  "site_name",
  "tagline",
  "announcement",
  "contact_phone",
  "whatsapp_number",
  "contact_email",
  "address",
  "bank_name",
  "bank_account_name",
  "bank_account_number",
  "bank_iban",
] as const;
const NUMBER_FIELDS = ["free_shipping_over", "default_shipping_fee", "tax_rate"] as const;

type Form = Record<(typeof TEXT_FIELDS)[number] | (typeof NUMBER_FIELDS)[number] | "instagram" | "facebook" | "tiktok", string>;

function SettingsPage() {
  const { data: settings } = useSuspenseQuery(adminSettingsQuery());
  const save = useServerFn(adminSaveSettings);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const socials = (settings?.social_links ?? {}) as Record<string, string>;
  const [form, setForm] = useState<Form>(() => {
    const initial = {} as Form;
    for (const key of TEXT_FIELDS) initial[key] = String(settings?.[key] ?? "");
    for (const key of NUMBER_FIELDS) initial[key] = String(settings?.[key] ?? 0);
    initial.instagram = socials["instagram"] ?? "";
    initial.facebook = socials["facebook"] ?? "";
    initial.tiktok = socials["tiktok"] ?? "";
    return initial;
  });

  const set = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.site_name.trim()) {
      toast.error("The shop needs a name.");
      return;
    }
    const values: Record<string, unknown> = {};
    for (const key of TEXT_FIELDS) values[key] = form[key].trim() || null;
    values["site_name"] = form.site_name.trim();
    for (const key of NUMBER_FIELDS) values[key] = Math.max(0, Number(form[key]) || 0);
    values["social_links"] = { instagram: form.instagram.trim(), facebook: form.facebook.trim(), tiktok: form.tiktok.trim() };
    setBusy(true);
    try {
      const result = await save({ data: values });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Settings saved");
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof Form, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`s-${key}`}>{label}</Label>
      <Input id={`s-${key}`} value={form[key]} onChange={set(key)} {...props} />
    </div>
  );

  return (
    <>
      <AdminTitle title="Store settings" description="Shown across the shop header, footer, checkout and help pages." />
      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-2">
        <Panel title="Shop">
          <div className="space-y-4">
            {field("site_name", "Shop name *")}
            {field("tagline", "Tagline")}
            <div className="space-y-1.5">
              <Label htmlFor="s-announcement">Announcement bar</Label>
              <Textarea id="s-announcement" rows={2} value={form.announcement} onChange={set("announcement")} placeholder="Leave empty to hide the bar" />
            </div>
          </div>
        </Panel>
        <Panel title="Contact">
          <div className="space-y-4">
            {field("contact_phone", "Phone", { placeholder: "+974 4400 1200" })}
            {field("whatsapp_number", "WhatsApp number (digits only)", { placeholder: "97444001200" })}
            {field("contact_email", "Email", { type: "email" })}
            {field("address", "Address")}
          </div>
        </Panel>
        <Panel title="Delivery & tax">
          <div className="grid grid-cols-2 gap-4">
            {field("free_shipping_over", "Free delivery over (QAR)", { type: "number", min: 0, step: "0.01" })}
            {field("default_shipping_fee", "Standard delivery fee (QAR)", { type: "number", min: 0, step: "0.01" })}
            {field("tax_rate", "Tax rate (%)", { type: "number", min: 0, step: "0.01" })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Each delivery option's own fee is set on the delivery option itself.</p>
        </Panel>
        <Panel title="Social links">
          <div className="space-y-4">
            {field("instagram", "Instagram", { placeholder: "https://instagram.com/…" })}
            {field("facebook", "Facebook", { placeholder: "https://facebook.com/…" })}
            {field("tiktok", "TikTok", { placeholder: "https://tiktok.com/@…" })}
          </div>
        </Panel>
        <Panel title="Bank details (for bank transfers)">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("bank_name", "Bank")}
            {field("bank_account_name", "Account name")}
            {field("bank_account_number", "Account number")}
            {field("bank_iban", "IBAN")}
          </div>
        </Panel>
        <div className="xl:col-span-2">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null} Save settings
          </Button>
        </div>
      </form>
    </>
  );
}
