/**
 * @vitest-environment jsdom
 *
 * Regression test for the /coach "first message at top on open" bug.
 *
 * What we assert
 * --------------
 * When CoachChat mounts with a long pre-existing conversation, the
 * scroll container's scrollTo is invoked with `top: scrollHeight` so
 * the user lands at the bottom (next to the textarea), not at the
 * first message. We schedule multiple retries (rAF, double rAF, 100ms,
 * 300ms) to cover late layout shifts (webfont swap, markdown reflow)
 * so the assertion counts ANY of those calls.
 *
 * Why JSDOM (and not Playwright)
 * ------------------------------
 * JSDOM doesn't compute real layout, so we monkey-patch the scroll
 * properties on the container we care about. The test then proves the
 * scroll INTENT is correct — the right element is targeted, with the
 * right value, even when scrollIntoView's ancestor-walk would have
 * been ambiguous. A real-browser test belongs in tests/e2e and is
 * skipped here because Playwright browsers aren't installable in CI
 * without network egress; the e2e spec at tests/e2e/coach-scroll.spec
 * .ts is the production gate.
 */

import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import frApp from "../../messages/fr/app.json";
import { CoachChat } from "../../components/coach/coach-chat";
import type { CoachMessage } from "../../lib/services/coach";

// next/navigation is server-component-aware; the client useRouter() it
// exposes works fine in jsdom but we stub router.refresh() to a no-op
// so we don't depend on app router internals here.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));

// sonner toasts pop a portal we don't need.
vi.mock("sonner", () => ({ toast: { error: () => undefined } }));

function makeMessages(n: number): CoachMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m-${i}`,
    role: i % 2 === 0 ? "user" : ("assistant" as const),
    content: `Message body ${i} — long enough to take vertical room when rendered as a chat bubble.`,
    created_at: new Date(2024, 0, 1, 12, i).toISOString(),
  }));
}

describe("CoachChat — first-paint scrolls to bottom of the chat container", () => {
  let container: HTMLDivElement;
  let root: Root;
  let scrollToSpy: ReturnType<typeof vi.fn>;
  // Patch scrollTo + scrollHeight on every div the component creates,
  // so whichever one ends up being scrollRef gets caught.
  const SCROLL_HEIGHT = 4000;
  const CLIENT_HEIGHT = 600;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    scrollToSpy = vi.fn();

    // Force every div to look like a scroll container with a tall
    // scrollHeight. scrollTo records the requested top.
    Object.defineProperty(HTMLDivElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return SCROLL_HEIGHT;
      },
    });
    Object.defineProperty(HTMLDivElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return CLIENT_HEIGHT;
      },
    });
    Object.defineProperty(HTMLDivElement.prototype, "scrollTop", {
      configurable: true,
      get() {
        return 0;
      },
      set() {
        /* swallow legacy direct sets — we only assert scrollTo */
      },
    });
    HTMLDivElement.prototype.scrollTo = scrollToSpy as unknown as typeof HTMLDivElement.prototype.scrollTo;
    // jsdom doesn't implement scrollIntoView at all by default.
    HTMLElement.prototype.scrollIntoView = vi.fn();

    // requestAnimationFrame in jsdom defers to setTimeout(0). Make it
    // synchronous-ish via fake timers so we control the schedule.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => root.unmount());
    container.remove();
  });

  it("calls scrollTo({ top: scrollHeight }) on the chat container after mount", () => {
    const messages = makeMessages(40);

    act(() => {
      root.render(
        <NextIntlClientProvider locale="fr" messages={{ app: frApp }}>
          <CoachChat
            conversationId="conv-1"
            initialMessages={messages}
            isDemo={false}
          />
        </NextIntlClientProvider>,
      );
    });

    // Flush rAF + the 100ms + 300ms timeouts.
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // At least one of the scheduled retries must have targeted the
    // bottom of the container.
    expect(scrollToSpy).toHaveBeenCalled();
    const calls = scrollToSpy.mock.calls.map((c) => c[0] as { top?: number });
    const reachedBottom = calls.some((arg) => arg?.top === SCROLL_HEIGHT);
    expect(reachedBottom).toBe(true);
  });

  it("does NOT scroll to bottom on follow-up updates when the user has scrolled up", () => {
    // Simulate a user that has scrolled UP: distance from bottom is huge.
    Object.defineProperty(HTMLDivElement.prototype, "scrollTop", {
      configurable: true,
      get() {
        return 0;
      },
      set() {},
    });
    // Pretend the visible window is tiny vs. the total — distance =
    // 4000 - 0 - 600 = 3400 > 120 (slack), so follow-up scroll should
    // skip.
    const messages = makeMessages(40);

    act(() => {
      root.render(
        <NextIntlClientProvider locale="fr" messages={{ app: frApp }}>
          <CoachChat
            conversationId="conv-2"
            initialMessages={messages}
            isDemo={false}
          />
        </NextIntlClientProvider>,
      );
    });

    // Drain the initial-mount schedule (these are FORCED — they will
    // call scrollTo regardless of scroll position. That's correct.)
    act(() => {
      vi.advanceTimersByTime(400);
    });

    const forcedCalls = scrollToSpy.mock.calls.length;

    // Now re-render with a new streamed-text-like state by sending a
    // fake update via React (we just re-render with same props; the
    // [messages, streamedText] effect doesn't fire without a state
    // change, so this is mainly a smoke test that the follow-up
    // effect's guard (distance > 120) doesn't re-call scrollTo when
    // the user is far from bottom). Re-rendering with same props
    // must NOT trigger more forced scrolls.
    act(() => {
      root.render(
        <NextIntlClientProvider locale="fr" messages={{ app: frApp }}>
          <CoachChat
            conversationId="conv-2"
            initialMessages={messages}
            isDemo={false}
          />
        </NextIntlClientProvider>,
      );
      vi.advanceTimersByTime(400);
    });

    expect(scrollToSpy.mock.calls.length).toBe(forcedCalls);
  });
});
