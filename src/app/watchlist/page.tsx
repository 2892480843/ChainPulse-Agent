import { Suspense } from "react";
import DashboardApp from "@/components/DashboardApp";

export default function WatchlistRoute() {
  return (
    <Suspense fallback={null}>
      <DashboardApp />
    </Suspense>
  );
}
