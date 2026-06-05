import { Suspense } from "react";
import DashboardApp from "@/components/DashboardApp";

export default function TasksRoute() {
  return (
    <Suspense fallback={null}>
      <DashboardApp />
    </Suspense>
  );
}
