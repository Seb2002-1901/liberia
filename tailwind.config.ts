import type { Config } from "tailwindcss";

const config: Config = {
  // Phase 5.0 — light premium. On retire darkMode pour éviter qu'un
  // `<html className="dark">` résiduel ne réactive un thème sombre.
  // Si on doit un jour réintroduire un mode dark, il faudra refondre
  // tous les tokens HSL (voir globals.css) — ce n'est pas un simple
  // toggle.
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand navy (#0F3D9E). Réservé carte Score (S3) + wordmark.
        navy: {
          DEFAULT: "hsl(var(--navy))",
          foreground: "hsl(var(--navy-foreground))",
        },
        // Legacy `gold` remappé vers primary pour compat. Les 152
        // références existantes (bg-gold, text-gold, border-gold)
        // rendent désormais en bleu accent. Renommage sémantique
        // gold → primary/navy programmé S3.
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
          muted: "hsl(var(--gold-muted))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        // Phase 5.0 S3.1 — palette charts premium.
        // Violet : jalon roadmap 12 mois + slice "Loisirs & divers" donut.
        // Coral  : icône priority (bouclier fonds d'urgence), plus chaud
        //         que warning, plus rassurant que destructive.
        "chart-violet": {
          DEFAULT: "hsl(var(--chart-violet))",
          foreground: "hsl(var(--chart-violet-foreground))",
        },
        "chart-coral": {
          DEFAULT: "hsl(var(--chart-coral))",
          foreground: "hsl(var(--chart-coral-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Phase 5.0 S3.1 — ombres premium (deux niveaux : base + hover).
      // Calibrées sur couleur foreground avec opacités très faibles
      // pour rester subtiles. Les composants utilisent `shadow-card`
      // par défaut, et `hover:shadow-card-hover` pour les cartes
      // interactives (ScoreCard, PriorityCard). Aucune ombre dépassant
      // 0.08 d'opacité — interdit produit premium.
      // Phase 5.0 S3.1 v4 — ombres recalibrées. Feedback v3 : "trop
       // plates, maquette montre une légère profondeur, détachement
       // du fond, ombre douce mais visible". Entre v2 (trop) et v3
       // (pas assez) → cible 0.05 + 0.10.
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.05), 0 8px 24px -8px rgb(15 23 42 / 0.10)",
        "card-hover":
          "0 1px 3px 0 rgb(15 23 42 / 0.07), 0 12px 28px -8px rgb(15 23 42 / 0.14)",
        "card-navy":
          "0 1px 3px 0 rgb(15 23 42 / 0.07), 0 16px 40px -12px rgb(15 42 85 / 0.20)",
        "halo-primary":
          "0 0 0 1px rgb(37 99 235 / 0.10), 0 4px 16px -4px rgb(37 99 235 / 0.20)",
        "halo-coral":
          "0 0 0 1px rgb(237 96 47 / 0.10), 0 4px 16px -4px rgb(237 96 47 / 0.20)",
        "halo-violet":
          "0 0 0 1px rgb(154 92 217 / 0.10), 0 4px 16px -4px rgb(154 92 217 / 0.20)",
        "halo-success":
          "0 0 0 1px rgb(22 163 74 / 0.10), 0 4px 16px -4px rgb(22 163 74 / 0.20)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        shimmer: "shimmer 2s infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        // Renommage de `gold-gradient` → `accent-gradient` pour la
        // sémantique Phase 5.0. L'ancien nom est conservé en alias
        // pour ne pas casser les consommateurs marketing/hero.
        "accent-gradient":
          "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--navy)) 100%)",
        "gold-gradient":
          "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--navy)) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
