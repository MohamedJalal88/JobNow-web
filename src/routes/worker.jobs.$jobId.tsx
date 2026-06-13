import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/worker/jobs/$jobId")({
  component: () => <Outlet />,
});
