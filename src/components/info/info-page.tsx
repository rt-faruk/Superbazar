import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";

export type InfoSection = { heading: string; body: ReactNode };

/** Shared layout for the help and policy pages. */
export function InfoPage({
  title,
  description,
  sections,
  aside,
}: {
  title: string;
  description?: ReactNode;
  sections: InfoSection[];
  aside?: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} description={description} crumbs={[{ label: title }]} />
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold">{section.heading}</h2>
              <div className="mt-2 space-y-3 leading-relaxed text-muted-foreground">{section.body}</div>
            </section>
          ))}
        </div>
        {aside ? <aside className="h-fit space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm">{aside}</aside> : null}
      </div>
    </>
  );
}

export function infoHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | AmarBazar` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | AmarBazar` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
