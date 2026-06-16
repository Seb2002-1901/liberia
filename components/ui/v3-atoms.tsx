"use client";

/**
 * Atomes V3 partagés — utilisés dans les pages V3 navy pour remplacer
 * les widgets shadcn dans les surfaces premium (LocaleForm,
 * SettingsPreferences, MemoryEntriesPanel, etc.).
 *
 * Zéro dépendance shadcn / Tailwind. Style inline tokens C.
 * Compatible focus accessible + clavier.
 */

import * as React from "react";

export const V3_TOKENS = {
  navy: "#011E5F",
  navyDeeper: "#011559",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  success: "#10A37F",
  successBg: "#ECFDF5",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
} as const;

const C = V3_TOKENS;

/* ════════════ V3Switch (navy toggle) ════════════ */

export function V3Switch({
  checked,
  onCheckedChange,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      style={{
        position: "relative",
        width: 42,
        height: 24,
        borderRadius: 999,
        backgroundColor: checked ? C.navy : "#D1D5DB",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "background-color 0.18s ease",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: 999,
          backgroundColor: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
          transition: "left 0.18s ease",
        }}
      />
    </button>
  );
}

/* ════════════ V3Select (custom dropdown) ════════════ */

export type V3SelectOption = {
  value: string;
  label: string;
};

export function V3Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly V3SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [focusIdx, setFocusIdx] = React.useState<number>(-1);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);

  const selected = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setFocusIdx(idx >= 0 ? idx : 0);
  }, [open, options, value]);

  React.useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !listRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onKeyDownTrigger = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusIdx >= 0 && focusIdx < options.length) {
        onChange(options[focusIdx].value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        ref={triggerRef}
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDownTrigger}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 10,
          border: `1px solid ${open ? C.primary : C.borderGhost}`,
          backgroundColor: C.cardBg,
          fontSize: 14,
          color: selected ? C.textDark : C.textLight,
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          cursor: "pointer",
          outline: "none",
          textAlign: "left",
          transition: "border-color 0.15s ease",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.label ?? placeholder ?? "Sélectionner"}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.textMuted}
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onKeyDownList}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: 280,
            overflowY: "auto",
            padding: 4,
            margin: 0,
            backgroundColor: C.cardBg,
            border: `1px solid ${C.borderGhost}`,
            borderRadius: 10,
            boxShadow: "0 12px 32px -8px rgba(15, 23, 42, 0.18)",
            zIndex: 50,
            listStyle: "none",
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === focusIdx;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocusIdx(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                style={{
                  padding: "9px 12px",
                  fontSize: 13.5,
                  color: isSelected ? C.navy : C.textDark,
                  fontWeight: isSelected ? 600 : 500,
                  backgroundColor: isFocused
                    ? C.primaryBg
                    : isSelected
                      ? C.pageBg
                      : "transparent",
                  cursor: "pointer",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {opt.label}
                </span>
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={C.navy}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ════════════ V3Label ════════════ */

export function V3Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: C.textDark,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </label>
  );
}

/* ════════════ V3InlineButton ════════════ */

export function V3InlineButton({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
}) {
  const styles = (() => {
    if (variant === "danger") {
      return {
        backgroundColor: C.dangerBg,
        color: C.danger,
        border: `1px solid rgba(220, 38, 38, 0.18)`,
      };
    }
    if (variant === "ghost") {
      return {
        backgroundColor: C.cardBg,
        color: C.textDark,
        border: `1px solid ${C.borderGhost}`,
      };
    }
    return {
      backgroundColor: C.navy,
      color: "white",
      border: "none",
    };
  })();
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...styles,
        padding: "10px 18px",
        fontSize: 13,
        fontWeight: 600,
        borderRadius: 10,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.55 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        fontFamily: "inherit",
        transition: "opacity 0.15s ease",
      }}
    >
      {loading && (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          aria-hidden
          style={{ animation: "v3-spin 0.7s linear infinite" }}
        >
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
          <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {children}
      <style>{`@keyframes v3-spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
