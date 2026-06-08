"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S2 — cloche de notifications, stub UI inerte.
 *
 * IMPORTANT : aucun badge, aucun compteur, aucune fausse donnée.
 * Tant que le système de notifications n'existe pas réellement côté
 * backend, la cloche reste un signal visuel inerte. Quand le système
 * sera live (Phase ultérieure), il suffira de :
 *   1. passer `unreadCount` en prop
 *   2. afficher le badge conditionnellement
 *   3. câbler onClick → popover liste notifs
 *
 * Volontairement laissé en `<button>` (et non `<div>`) pour que
 * l'accessibilité (focus, aria-label) soit déjà correcte le jour
 * où on activera la fonctionnalité.
 */

export function NotificationBell({ className }: { className?: string }) {
  const t = useTranslations("common.shell.notifications");
  return (
    <button
      type="button"
      // Disabled visuellement : le bouton existe pour préserver la
      // structure DOM cible mais n'a aucune action. Pas de
      // pointer-events-none — on garde le hover discret pour montrer
      // que la fonctionnalité arrive bientôt.
      aria-label={t("ariaLabel")}
      aria-disabled="true"
      tabIndex={-1}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-full",
        "border border-border bg-card text-muted-foreground",
        "transition-colors hover:text-foreground",
        // Curseur par défaut (pas pointer) — on signale visuellement
        // que la cloche n'est pas encore actionnable.
        "cursor-default",
        className,
      )}
    >
      <Bell className="h-4 w-4" />
    </button>
  );
}
