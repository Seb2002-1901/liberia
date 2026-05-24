import { CoachSidebar } from "@/components/coach/coach-sidebar";
import { CoachMobileTrigger } from "@/components/coach/coach-mobile-trigger";
import { listConversations } from "@/lib/services/coach";
import { getFinanceData } from "@/lib/services/finance";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [conversations, data] = await Promise.all([
    listConversations(),
    getFinanceData(),
  ]);

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-10 -mt-6">
      <div className="grid h-[calc(100dvh-4rem)] grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/60 bg-card/30 backdrop-blur-md md:flex md:flex-col">
          <CoachSidebar conversations={conversations} isDemo={data.isDemo} />
        </aside>
        <section className="flex h-full min-w-0 flex-col">
          <CoachMobileTrigger conversations={conversations} isDemo={data.isDemo} />
          <div className="flex-1 overflow-hidden">{children}</div>
        </section>
      </div>
    </div>
  );
}
