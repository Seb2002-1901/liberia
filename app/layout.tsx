import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const tCommon = await getTranslations("common");
  const tMeta = await getTranslations("common.metadata");
  const tagline = tCommon("tagline");
  const description = tMeta("description");
  const keywords = tMeta.raw("keywords") as string[];
  const openGraphLocale = tMeta("openGraphLocale");

  return {
    title: {
      default: `${APP_NAME} — ${tagline}`,
      template: `%s · ${APP_NAME}`,
    },
    description,
    applicationName: APP_NAME,
    authors: [{ name: APP_NAME }],
    keywords,
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    ),
    openGraph: {
      title: `${APP_NAME} — ${tagline}`,
      description,
      siteName: APP_NAME,
      type: "website",
      locale: openGraphLocale,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${APP_NAME} — ${tagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${APP_NAME} — ${tagline}`,
      description,
      images: ["/og-image.png"],
    },
    category: "finance",
    // Sensible default for marketing pages. /admin and /dashboard set
    // their own robots:{ index: false } overrides via per-route metadata.
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  // Phase 5.0 — passage en light premium. themeColor = couleur du fond
  // app (#F6F8FC) pour que la barre d'adresse mobile l'adopte.
  themeColor: "#F6F8FC",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // Enables env(safe-area-inset-*) on iOS so the bottom nav clears the
  // home indicator and notches don't crop the hero / topbar.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      // Phase 5.0 — light-first. La classe `dark` est retirée ; le
      // darkMode Tailwind a aussi été désactivé (tailwind.config.ts)
      // pour interdire la réactivation accidentelle d'un thème sombre.
      className={`${inter.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster
            position="top-right"
            theme="light"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "rounded-xl border border-border bg-card shadow-[0_4px_16px_-4px_hsl(222_47%_11%/0.08)]",
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
