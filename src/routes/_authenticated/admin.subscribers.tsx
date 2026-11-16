import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { AdminTitle, EmptyRow, Panel } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { adminNewsletterQuery } from "@/lib/admin-queries";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/subscribers")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminNewsletterQuery()),
  component: SubscribersPage,
});

function SubscribersPage() {
  const { data: subscribers } = useSuspenseQuery(adminNewsletterQuery());

  function download() {
    const csv = ["email,subscribed_at", ...subscribers.map((row) => `${row.email},${row.created_at}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "amarbazar-subscribers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <AdminTitle
        title="Newsletter subscribers"
        description={`${subscribers.length} people signed up from the homepage.`}
        actions={
          <Button variant="outline" onClick={download} disabled={subscribers.length === 0}>
            <Download /> Download list
          </Button>
        }
      />
      <Panel className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Signed up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subscribers.length === 0 ? (
              <EmptyRow colSpan={2}>No subscribers yet.</EmptyRow>
            ) : (
              subscribers.map((row) => (
                <tr key={row.email}>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
