import { Suspense } from "react";
import DashboardApp from "@/components/DashboardApp";

export default function AttestationRoute() {
  return (
    <Suspense fallback={null}>
      <DashboardApp />
    </Suspense>
  );
}
