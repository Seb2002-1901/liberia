"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Compass,
  Crown,
  LayoutDashboard,
  LineChart,
  LogOut,
  Map,
  MessageSquare,
  PiggyBank,
  Settings,
  Sparkles,
  Target,
  User,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandMark } from "@/components/layout/brand-mark";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ROUTES } from "@/lib/constants";
import { cn, getInitials } from "@/lib/utils";

/**
 * Phase 5.0 S2 — sidebar 280 px + topbar light premium.
 *
 * Structure de navigation alignée maquette (4 sections) :
 *   PRINCIPAL    Tableau de bord · Coach IA · Plan d'action
 *   FINANCES     Revenus · Dépenses · Budget · Objectifs
 *   CROISSANCE   Épargne · Investissements · Opportunités
 *   PLUS         Paramètres · Profil
 *
 * Trois nouvelles routes (Épargne / Investissements / Opportunités)
 * cliquent vers des stubs "Bientôt disponible" — décision D3
 * validée fondateur : la sidebar montre déjà la vision complète du
 * produit sans contenu fake.
 *
 * Topbar globale (D1 validé) :
 *   Greeting "Bonjour {firstName} 👋" + sous-ligne (lg+ uniquement)
 *   NotificationBell stub inerte (D2 validé)
 *   Avatar + nom + chevron dropdown
 *
 * État actif (D6 validé) : item en bleu primary, finis le gold.
 *
 * Mobile (< lg) : sidebar cachée, bottom nav 5 items conservée
 * (D5 validé — pas de refonte mobile en S2).
 */

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    fullName?: string | null;
    email?: string | null;
  };
  plan?: "free" | "premium";
  trialUsed?: boolean;
  isDemo?: boolean;
  onSignOut?: () => Promise<void> | void;
  /** Bloc Greeting (Server Component) injecté par le layout serveur
   *  qui a accès aux traductions + au prénom utilisateur. */
  greeting?: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AppShell({
  children,
  user,
  plan = "free",
  trialUsed = false,
  isDemo,
  onSignOut,
  greeting,
}: AppShellProps) {
  const t = useTranslations("common.shell");
  const pathname = usePathname();
  const displayName = user?.fullName || user?.email?.split("@")[0] || "Membre";

  /* ------------------------------------------------------------------ */
  /*  Navigation par sections (alignée maquette Phase 5.0)              */
  /* ------------------------------------------------------------------ */

  const SECTION_PRINCIPAL: NavItem[] = [
    { href: ROUTES.dashboard, label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: ROUTES.coach, label: t("nav.coach"), icon: MessageSquare },
    { href: ROUTES.plan, label: t("nav.plan"), icon: Map },
  ];

  const SECTION_FINANCES: NavItem[] = [
    { href: ROUTES.incomes, label: t("nav.incomes"), icon: ArrowUpCircle },
    { href: ROUTES.expenses, label: t("nav.expenses"), icon: ArrowDownCircle },
    { href: ROUTES.budget, label: t("nav.budget"), icon: Wallet },
    { href: ROUTES.goals, label: t("nav.goals"), icon: Target },
  ];

  const SECTION_CROISSANCE: NavItem[] = [
    { href: ROUTES.savings, label: t("nav.savings"), icon: PiggyBank },
    { href: ROUTES.investments, label: t("nav.investments"), icon: LineChart },
    { href: ROUTES.opportunities, label: t("nav.opportunities"), icon: Compass },
  ];

  const SECTION_PLUS: NavItem[] = [
    { href: ROUTES.settings, label: t("nav.settings"), icon: Settings },
    { href: ROUTES.profile, label: t("nav.profile"), icon: User },
  ];

  // Bottom nav mobile — inchangée S2 (D5 validé). 5 items max pour
  // tenir confortablement la largeur d'écran. Épargne/Invest/Opportu-
  // nités ne sont pas mis en mobile faute de place ; ils seront
  // accessibles via la page Profil/menu plus tard si besoin.
  const MOBILE_NAV: NavItem[] = [
    { href: ROUTES.dashboard, label: t("mobileNav.dashboard"), icon: LayoutDashboard },
    { href: ROUTES.coach, label: t("mobileNav.coach"), icon: MessageSquare },
    { href: ROUTES.plan, label: t("mobileNav.plan"), icon: Map },
    { href: ROUTES.budget, label: t("mobileNav.budget"), icon: Wallet },
    { href: ROUTES.goals, label: t("mobileNav.goals"), icon: Target },
  ];

  // En démo, seul le Dashboard est cliquable (les autres redirigent
  // vers /demo via le href forcé + sont visuellement désactivés).
  // Cette UX existait avant S2 — on la préserve pour ne pas casser
  // le tunnel marketing → démo → register.
  const renderItem = (item: NavItem) => (
    <SidebarLink
      key={item.href}
      href={isDemo ? "/demo" : item.href}
      label={item.label}
      icon={item.icon}
      active={
        isActive(pathname, item.href) ||
        (isDemo === true && pathname === "/demo" && item.href === ROUTES.dashboard)
      }
      disabled={isDemo === true && item.href !== ROUTES.dashboard}
      disabledTooltip={t("menu.disabledTooltip")}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — 280 px, fond blanc cassé, hairline droite */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-[72px] items-center px-6">
          <BrandMark />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          <SidebarSection title={t("sectionPrincipal")}>
            {SECTION_PRINCIPAL.map(renderItem)}
          </SidebarSection>
          <SidebarSection title={t("sectionFinances")}>
            {SECTION_FINANCES.map(renderItem)}
          </SidebarSection>
          <SidebarSection title={t("sectionCroissance")}>
            {SECTION_CROISSANCE.map(renderItem)}
          </SidebarSection>
          {/* PLUS reste hidden en mode démo : un démo-user n'a pas de
              profil ni de paramètres à régler tant qu'il n'a pas créé
              de compte. Cohérent avec l'ancien comportement. */}
          {!isDemo && (
            <SidebarSection title={t("sectionPlus")}>
              {SECTION_PLUS.map(renderItem)}
            </SidebarSection>
          )}
        </nav>
        <div className="p-3">
          {isDemo ? <DemoUpsellCard /> : <PremiumCard plan={plan} trialUsed={trialUsed} />}
        </div>
      </aside>

      {/* Topbar — fond clair, sans backdrop-blur. Greeting (lg+) à
          gauche, NotificationBell + avatar à droite. Phase 5.0
          S3.1 v2 : hauteur passée 16 → 18 (72px) pour caler avec
          la sidebar et donner plus d'air à la salutation. */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-[72px] items-center border-b border-border bg-card lg:left-[280px]">
        <div className="flex w-full items-center justify-between gap-3 px-4 lg:px-8">
          {/* Mobile : BrandMark compact. Desktop : Greeting injecté. */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <BrandMark size="sm" />
            </div>
            {greeting}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isDemo && (
              <span className="hidden rounded-full border border-primary/30 bg-primary/8 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-primary sm:inline-flex">
                {t("demoBadge")}
              </span>
            )}
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-1.5 py-1.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={t("menu.ariaLabel")}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-secondary text-xs">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium text-foreground sm:inline">
                    {displayName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {displayName}
                    </span>
                    {user?.email && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isDemo ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={ROUTES.register}>
                        <Sparkles className="h-4 w-4" /> {t("menu.createAccount")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={ROUTES.login}>
                        <User className="h-4 w-4" /> {t("menu.login")}
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={ROUTES.profile}>
                        <User className="h-4 w-4" /> {t("menu.profile")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={ROUTES.settings}>
                        <Settings className="h-4 w-4" /> {t("menu.settings")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={ROUTES.subscription}>
                        <Sparkles className="h-4 w-4" /> {t("menu.subscription")}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {onSignOut && !isDemo && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        void onSignOut();
                      }}
                    >
                      <LogOut className="h-4 w-4" /> {t("menu.signOut")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content — padding gauche ajusté à 280 px (vs 256 avant).
          Phase 5.0 S3.1 v5 : densité maquette. pt-8 → pt-6 et
          pb-24 → pb-16 pour réduire le scroll vertical sur 1440p
          (feedback "occuper même hauteur que maquette"). */}
      <main className="pt-[72px] lg:pl-[280px]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — pb-[env(safe-area-inset-bottom)] keeps the
          tap targets above the iOS home indicator. Inchangée S2. */}
      {isDemo ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="container flex items-center justify-between py-3">
            <p className="text-xs text-muted-foreground">{t("demoBottomNote")}</p>
            <Button asChild size="sm" variant="default">
              <Link href={ROUTES.register}>{t("menu.createAccount")}</Link>
            </Button>
          </div>
        </nav>
      ) : (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-5">
            {MOBILE_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 text-[11px] transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sidebar building blocks                                                    */
/* -------------------------------------------------------------------------- */

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  // Phase 5.0 S3.1 v4 — feedback v3 : "menu légèrement plus
  // compact". py-4 → py-3 (revient v2). Caption pb-2.5 → pb-2.
  return (
    <div className="py-3">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  disabled,
  disabledTooltip,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        title={disabledTooltip}
        className="group flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground/60"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground/60">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </span>
    );
  }
  return (
    // Phase 5.0 S3.1 v5 — feedback v4 : "bouton actif moins bleu,
    // moins haut, plus gris bleuté". py-2 → py-1.5, fond actif
    // primary/10 → secondary (gris bleuté neutre). Icône active
    // conserve bg-primary text-primary-foreground (contraste pour
    // identifier la page courante).
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bottom card — premium / demo upsell                                        */
/* -------------------------------------------------------------------------- */

function DemoUpsellCard() {
  const t = useTranslations("common.shell.upgradeCard");
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">{t("eyebrowDemo")}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("demoBody")}</p>
      <Button asChild size="sm" variant="default" className="mt-3 w-full">
        <Link href={ROUTES.register}>{t("demoCta")}</Link>
      </Button>
    </div>
  );
}

function PremiumCard({
  plan,
  trialUsed,
}: {
  plan: "free" | "premium";
  trialUsed: boolean;
}) {
  const t = useTranslations("common.shell.upgradeCard");
  if (plan === "premium") {
    return (
      <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{t("premiumActive")}</p>
        <p className="mt-1">{t("premiumThanks")}</p>
      </div>
    );
  }
  const cta = trialUsed ? t("resumeCta") : t("trialCta");
  const body = trialUsed ? t("resumeBody") : t("trialBody");
  // Carte premium light : fond card blanc, bordure subtile, couronne
  // dorée petit format (icône iconographique, pas un thème). Bouton
  // CTA bleu primary plein. Cohérent maquette dashboard.png — bloc
  // bas sidebar.
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10 text-warning">
          <Crown className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
          {t("eyebrowPremium")}
        </p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{body}</p>
      <Button asChild size="sm" variant="default" className="mt-3 w-full">
        <Link href={ROUTES.subscription}>{cta}</Link>
      </Button>
    </div>
  );
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
