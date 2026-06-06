import { AppShell } from "@/components/shell/AppShell";
import { ReportDetailPage } from "@/components/pages/ReportDetailPage";

export default async function ReportDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppShell>
      <ReportDetailPage reportId={id} />
    </AppShell>
  );
}
