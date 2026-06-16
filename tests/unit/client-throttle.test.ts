import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkAuthThrottle,
  bumpAuthThrottle,
  clearAuthThrottle,
} from "@/lib/auth/client-throttle";

/**
 * Sprint S2-BIS — UI throttle login / register / forgot-password.
 *
 * Compteur localStorage isolé par identifiant. La fenêtre est de 60s
 * et la limite est 5 tentatives — au-delà, retourner allowed:false
 * + retryInSeconds restants.
 */

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-14T12:00:00Z"));
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: new MemoryStorage() },
    configurable: true,
  });
});

describe("checkAuthThrottle", () => {
  it("allows the first attempt", () => {
    expect(checkAuthThrottle("login:a@b.c")).toEqual({ allowed: true });
  });

  it("allows up to 5 attempts in the window", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkAuthThrottle("login:a@b.c").allowed).toBe(true);
      bumpAuthThrottle("login:a@b.c");
    }
  });

  it("blocks the 6th attempt with retryInSeconds", () => {
    for (let i = 0; i < 5; i++) bumpAuthThrottle("login:a@b.c");
    const result = checkAuthThrottle("login:a@b.c");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryInSeconds).toBeGreaterThan(0);
      expect(result.retryInSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("resets after window expires", () => {
    for (let i = 0; i < 5; i++) bumpAuthThrottle("login:a@b.c");
    expect(checkAuthThrottle("login:a@b.c").allowed).toBe(false);
    // Avance de 61s — la fenêtre de 60s est dépassée.
    vi.setSystemTime(new Date("2026-06-14T12:01:01Z"));
    expect(checkAuthThrottle("login:a@b.c")).toEqual({ allowed: true });
  });

  it("isolates by identifier (different emails)", () => {
    for (let i = 0; i < 5; i++) bumpAuthThrottle("login:a@b.c");
    expect(checkAuthThrottle("login:a@b.c").allowed).toBe(false);
    expect(checkAuthThrottle("login:x@y.z").allowed).toBe(true);
  });

  it("clearAuthThrottle resets the counter", () => {
    for (let i = 0; i < 5; i++) bumpAuthThrottle("login:a@b.c");
    clearAuthThrottle("login:a@b.c");
    expect(checkAuthThrottle("login:a@b.c")).toEqual({ allowed: true });
  });

  it("degrades gracefully when localStorage throws", () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: () => {
            throw new Error("blocked");
          },
          setItem: () => {
            throw new Error("blocked");
          },
          removeItem: () => {
            throw new Error("blocked");
          },
        },
      },
      configurable: true,
    });
    // Never throws, always allows (server-side remains the boundary).
    expect(checkAuthThrottle("login:a@b.c")).toEqual({ allowed: true });
    expect(() => bumpAuthThrottle("login:a@b.c")).not.toThrow();
    expect(() => clearAuthThrottle("login:a@b.c")).not.toThrow();
  });

  it("degrades gracefully in SSR (no window)", () => {
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      configurable: true,
    });
    expect(checkAuthThrottle("login:a@b.c")).toEqual({ allowed: true });
    expect(() => bumpAuthThrottle("login:a@b.c")).not.toThrow();
  });
});
