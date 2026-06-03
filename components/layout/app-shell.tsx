"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquare,
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
import { ROUTES } from "@/lib/constants";
import { cn, getInitials } from "@/lib/utils";

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
}

export function AppShell({
  children,
  user,
  plan = "free",
  trialUsed = false,
  isDemo,
  onSignOut,
}: AppShellProps) {
  const t = useTranslations("common.shell");
  const pathname = usePathname();
  const displayName = user?.fullName || user?.email?.split("@")[0] || "Membre";

  // Built per-render so labels follow the active locale.
  const NAV = [
    { href: ROUTES.dashboard, label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: ROUTES.coach, label: t("nav.coach"), icon: MessageSquare },
    { href: ROUTES.plan, label: t("nav.plan"), icon: Map },
    { href: ROUTES.budget, label: t("nav.budget"), icon: Wallet },
    { href: ROUTES.incomes, label: t("nav.incomes"), icon: ArrowUpCircle },
    { href: ROUTES.expenses, label: t("nav.expenses"), icon: ArrowDownCircle },
    { href: ROUTES.goals, label: t("nav.goals"), icon: Target },
  ];

  const MOBILE_NAV = [
    { href: ROUTES.dashboard, label: t("mobileNav.dashboard"), icon: LayoutDashboard },
    { href: ROUTES.coach, label: t("mobileNav.coach"), icon: MessageSquare },
    { href: ROUTES.plan, label: t("mobileNav.plan"), icon: Map },
    { href: ROUTES.budget, label: t("mobileNav.budget"), icon: Wallet },
    { href: ROUTES.goals, label: t("mobileNav.goals"), icon: Target },
  ];

  const SECONDARY = [
    { href: ROUTES.profile, label: t("nav.profile"), icon: User },
    { href: ROUTES.settings, label: t("nav.settings"), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-card/30 backdrop-blur-md lg:flex">
        <div className="flex h-16 items-center px-6">
          <BrandMark />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <SidebarSection title={t("sectionPilotage")}>
            {NAV.map((item) => (
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
            ))}
          </SidebarSection>
          {!isDemo && (
            <SidebarSection title={t("sectionAccount")}>
              {SECONDARY.map((item) => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(pathname, item.href)}
                />
              ))}
            </SidebarSection>
          )}
        </nav>
        <div className="p-3">
          {isDemo ? <DemoUpsellCard /> : <UpgradeCard plan={plan} trialUsed={trialUsed} />}
        </div>
      </aside>

      {/* Topbar */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center border-b border-border/60 bg-background/70 backdrop-blur-xl lg:left-64">
        <div className="flex w-full items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandMark size="sm" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            {isDemo && (
              <span className="hidden rounded-full border border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.08)] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--gold))] sm:inline-flex">
                {t("demoBadge")}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-1.5 py-1.5 transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={t("menu.ariaLabel")}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-secondary text-xs">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm sm:inline">{displayName}</span>
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

      {/* Main content */}
      <main className="pt-16 lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-12">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — pb-[env(safe-area-inset-bottom)] keeps the
          tap targets above the iOS home indicator */}
      {isDemo ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="container flex items-center justify-between py-3">
            <p className="text-xs text-muted-foreground">{t("demoBottomNote")}</p>
            <Button asChild size="sm" variant="gold">
              <Link href={ROUTES.register}>{t("menu.createAccount")}</Link>
            </Button>
          </div>
        </nav>
      ) : (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur-xl lg:hidden"
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
                    active ? "text-foreground" : "text-muted-foreground",
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

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
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
        className="group flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground/50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/30 text-muted-foreground/60">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150",
        active
          ? "bg-foreground/5 text-foreground"
          : "text-muted-foreground hover:bg-accent/8 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-gradient-to-br from-[hsl(var(--gold)/0.4)] to-[hsl(var(--gold-muted)/0.2)] text-[hsl(var(--gold))]"
            : "bg-secondary/40 text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}

function DemoUpsellCard() {
  const t = useTranslations("common.shell.upgradeCard");
  return (
    <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--gold)/0.25)] bg-gradient-to-br from-[hsl(var(--gold)/0.08)] to-transparent p-4">
      <div className="flex items-center gap-2 text-[hsl(var(--gold))]">
        <Sparkles className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">{t("eyebrowDemo")}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("demoBody")}</p>
      <Button asChild size="sm" variant="gold" className="mt-3 w-full">
        <Link href={ROUTES.register}>{t("demoCta")}</Link>
      </Button>
    </div>
  );
}

function UpgradeCard({
  plan,
  trialUsed,
}: {
  plan: "free" | "premium";
  trialUsed: boolean;
}) {
  const t = useTranslations("common.shell.upgradeCard");
  if (plan === "premium") {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{t("premiumActive")}</p>
        <p className="mt-1">{t("premiumThanks")}</p>
      </div>
    );
  }
  const cta = trialUsed ? t("resumeCta") : t("trialCta");
  const body = trialUsed ? t("resumeBody") : t("trialBody");
  return (
    <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--gold)/0.25)] bg-gradient-to-br from-[hsl(var(--gold)/0.08)] to-transparent p-4">
      <div className="flex items-center gap-2 text-[hsl(var(--gold))]">
        <Sparkles className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">{t("eyebrowPremium")}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{body}</p>
      <Button asChild size="sm" variant="gold" className="mt-3 w-full">
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
