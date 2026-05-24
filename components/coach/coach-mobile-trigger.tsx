"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CoachSidebar } from "@/components/coach/coach-sidebar";
import type { ConversationSummary } from "@/lib/services/coach";

interface CoachMobileTriggerProps {
  conversations: ConversationSummary[];
  isDemo: boolean;
}

/**
 * Mobile-only menu (md:hidden) that opens the conversation list inside a
 * Dialog. On desktop the persistent sidebar covers this; mobile users
 * would otherwise have no way to switch between conversations.
 */
export function CoachMobileTrigger({
  conversations,
  isDemo,
}: CoachMobileTriggerProps) {
  const [open, setOpen] = React.useState(false);

  // Auto-close when navigation happens (sidebar Link clicked).
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setOpen(false);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return (
    <div className="flex items-center gap-2 border-b border-border/60 bg-background/70 px-4 py-2.5 backdrop-blur-md md:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Ouvrir la liste des conversations"
          >
            <Menu className="h-3.5 w-3.5" />
            Conversations
          </button>
        </DialogTrigger>
        <DialogContent className="flex h-[80vh] max-w-md flex-col p-0">
          <DialogHeader className="border-b border-border/60 px-5 py-3">
            <DialogTitle>Mes conversations</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden" onClick={() => setOpen(false)}>
            <CoachSidebar conversations={conversations} isDemo={isDemo} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
