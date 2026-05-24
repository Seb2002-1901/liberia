"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquarePlus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  createConversation,
  deleteConversation,
  renameConversation,
} from "@/app/actions/conversations";
import type { ConversationSummary } from "@/lib/services/coach";

interface CoachSidebarProps {
  conversations: ConversationSummary[];
  isDemo: boolean;
}

export function CoachSidebar({
  conversations,
  isDemo,
}: CoachSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeId = React.useMemo(() => {
    const match = pathname?.match(/\/coach\/([0-9a-f-]+)/i);
    return match?.[1];
  }, [pathname]);
  const [creating, setCreating] = React.useState(false);

  const handleCreate = async () => {
    if (isDemo) {
      toast.error("Mode démo : crée un compte pour ouvrir une conversation.");
      return;
    }
    setCreating(true);
    try {
      const res = await createConversation();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.push(`/coach/${res.data.id}`);
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: string, currentTitle: string) => {
    if (typeof window === "undefined") return;
    const next = window.prompt("Nouveau titre", currentTitle);
    if (!next || next.trim() === currentTitle.trim()) return;
    const res = await renameConversation(id, next.trim());
    if (!res.ok) toast.error(res.error);
    else router.refresh();
  };

  const handleDelete = async (id: string, title: string) => {
    if (typeof window === "undefined") return;
    if (!window.confirm(`Supprimer « ${title} » ? Cette action est définitive.`)) {
      return;
    }
    const res = await deleteConversation(id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Conversation supprimée.");
    if (pathname?.endsWith(`/${id}`)) {
      router.push("/coach");
    } else {
      router.refresh();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 p-3">
        <Button
          variant="gold"
          size="sm"
          className="w-full"
          onClick={handleCreate}
          disabled={creating || isDemo}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Nouvelle conversation
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Aucune conversation pour l'instant.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id} className="group relative">
                  <Link
                    href={`/coach/${c.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 pr-9 text-sm transition-colors",
                      active
                        ? "bg-foreground/5 text-foreground"
                        : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                    )}
                  >
                    <span className="line-clamp-1">{c.title}</span>
                  </Link>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Actions"
                          className="h-7 w-7"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            void handleRename(c.id, c.title);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Renommer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            void handleDelete(c.id, c.title);
                          }}
                          className="text-[hsl(var(--destructive))]"
                        >
                          <Trash2 className="h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
