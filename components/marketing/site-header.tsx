"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 6.0 — Site header V3 light premium.
 *
 * Navy + blanc, Outfit pour le wordmark (via BrandMark déjà
 * V3-compatible). Sticky avec ombre légère au scroll. Aligné
 * sur l'identité cockpit V3 verrouillée.
 */

const NAV_LINKS = [
  { href: "/#features", label: "Fonctionnalités" },
  { href: ROUTES.pricing, label: "Tarifs" },
  { href: "/#security", label: "Sécurité" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        transition: "background-color 0.3s, box-shadow 0.3s, border-color 0.3s",
        backgroundColor: scrolled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.6)",
        backdropFilter: scrolled ? "saturate(180%) blur(14px)" : "blur(8px)",
        WebkitBackdropFilter: scrolled ? "saturate(180%) blur(14px)" : "blur(8px)",
        borderBottom: scrolled ? "1px solid #F2F4F8" : "1px solid transparent",
        boxShadow: scrolled ? "0 8px 24px -16px rgb(15 23 42 / 0.10)" : "none",
      }}
    >
      <div className="container" style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <BrandMark size="sm" />
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }} className="lv3-nav-desktop">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                color: "#64748B",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="lv3-nav-desktop">
          <Link
            href={ROUTES.login}
            style={{
              padding: "8px 14px",
              fontSize: 13.5,
              fontWeight: 600,
              color: "#0F172A",
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            Connexion
          </Link>
          <Link
            href={ROUTES.register}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              fontSize: 13.5,
              fontWeight: 600,
              color: "white",
              backgroundColor: "#011E5F",
              borderRadius: 8,
              textDecoration: "none",
              boxShadow: "0 1px 2px rgb(2 31 96 / 0.10), 0 6px 16px -6px rgb(2 31 96 / 0.25)",
            }}
          >
            Essai gratuit 14 jours
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          style={{
            display: "none",
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            border: "1px solid #F2F4F8",
            borderRadius: 10,
            cursor: "pointer",
            color: "#011E5F",
          }}
          className="lv3-nav-mobile-btn"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div style={{ borderTop: "1px solid #F2F4F8", backgroundColor: "rgba(255,255,255,0.98)", backdropFilter: "blur(16px)" }} className="lv3-nav-mobile-panel">
          <div className="container" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 24px" }}>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{
                  padding: "10px 12px",
                  fontSize: 14,
                  color: "#0F172A",
                  textDecoration: "none",
                  borderRadius: 8,
                }}
              >
                {l.label}
              </Link>
            ))}
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <Link
                href={ROUTES.login}
                onClick={() => setOpen(false)}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 12px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#011E5F",
                  border: "1px solid #F2F4F8",
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                Connexion
              </Link>
              <Link
                href={ROUTES.register}
                onClick={() => setOpen(false)}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 12px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "white",
                  backgroundColor: "#011E5F",
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                Essai gratuit
              </Link>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 767px) {
          .lv3-nav-desktop { display: none !important; }
          .lv3-nav-mobile-btn { display: inline-flex !important; }
        }
        @media (min-width: 768px) {
          .lv3-nav-mobile-panel { display: none !important; }
        }
      `}</style>
    </header>
  );
}
