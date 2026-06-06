"use client";

import { usePathname } from "next/navigation";
import { pageKeyFromPath } from "@/lib/navigation";
import { AppShell } from "./shell/AppShell";
import { AttestationPage } from "./pages/AttestationPage";
import { DemoPage } from "./pages/DemoPage";
import { ReportCenterPage } from "./pages/ReportCenterPage";
import { RunningTasksPage } from "./pages/RunningTasksPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TracePage } from "./pages/TracePage";
import { WatchlistPage } from "./pages/WatchlistPage";
import { WorkspacePage } from "./pages/WorkspacePage";

export default function DashboardApp() {
  const pageKey = pageKeyFromPath(usePathname());

  const page = {
    workspace: <WorkspacePage />,
    demo: <DemoPage />,
    tasks: <RunningTasksPage />,
    reports: <ReportCenterPage />,
    trace: <TracePage />,
    attestation: <AttestationPage />,
    watchlist: <WatchlistPage />,
    settings: <SettingsPage />
  }[pageKey];

  return <AppShell>{page}</AppShell>;
}
