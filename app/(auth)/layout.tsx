import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { APP_TAGLINE } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <BrandMark />
        <div className="my-auto flex w-full max-w-md flex-col py-12 lg:py-20">
          {children}
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} LIBERIA ·{" "}
          <Link href="/terms" className="hover:text-foreground">
            Conditions
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="hover:text-foreground">
            Confidentialité
          </Link>
        </p>
      </div>

      {/* Right: brand panel */}
      <div className="relative hidden overflow-hidden bg-[hsl(var(--secondary))] lg:block">
        <div
          className="absolute inset-0 grid-bg opacity-50"
          aria-hidden
        />
        <div
          className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[hsl(var(--gold)/0.12)] blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full bg-[hsl(var(--gold-muted)/0.10)] blur-3xl"
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-between p-16">
          <div />
          <div className="max-w-md">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
              {APP_TAGLINE}
            </p>
            <p className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight">
              Construis ta stabilité financière, calmement.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune publicité, aucune revente de données. Juste un outil clair, pour toi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
