import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account | AmarBazar" },
      { name: "description", content: "Your AmarBazar profile, orders and saved delivery addresses." },
      { property: "og:title", content: "My account | AmarBazar" },
      { property: "og:description", content: "Manage your AmarBazar profile, orders and addresses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <Outlet />,
});
