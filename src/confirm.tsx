/**
 * On-page confirmation for consequential LATCH writes.
 *
 * The dialog is the source of truth. A WebMCP host may wrap the same promise
 * through `requestUserInteraction`, but execute must not wait on that wrap:
 * some test and subset hosts advertise the API, never invoke the callback,
 * and then drop the tool call on timeout.
 *
 * Automation: wait for `[data-testid="latch-confirm"]`, then click
 * `[data-testid="latch-confirm-yes"]`. The page also dispatches
 * `latch:confirm-open` / `latch:confirm-close` on `window`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { canOpenConfirm } from "./authority";

/** Stable selectors for Chrome / Site-tools test drivers. */
export const CONFIRM_ROOT = "latch-confirm";
export const CONFIRM_YES = "latch-confirm-yes";
export const CONFIRM_NO = "latch-confirm-no";

export type LatchConfirmDetail = {
  message: string;
};

export type LatchConfirmFn = (
  message: string,
  signal?: AbortSignal,
) => Promise<boolean>;

type ConfirmPrompt = {
  message: string;
  resolve: (ok: boolean) => void;
};

/** Parallel waiter: `window.addEventListener("latch:confirm-open", ...)`. */
function emit(name: "latch:confirm-open" | "latch:confirm-close", message: string) {
  window.dispatchEvent(new CustomEvent<LatchConfirmDetail>(name, { detail: { message } }));
}

/**
 * Queue at most one confirm. A newer ask dismisses the previous as "Not now".
 * Escape and an aborted execute signal also resolve false and close the layer.
 */
export function useBoardConfirm() {
  const [prompt, setPrompt] = useState<ConfirmPrompt | null>(null);
  const yesRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<LatchConfirmFn>((message, signal) => {
    return new Promise<boolean>((resolve) => {
      if (signal?.aborted) {
        resolve(false);
        return;
      }

      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        resolve(ok);
      };

      const onAbort = () => {
        finish(false);
        flushSync(() => {
          setPrompt((current) => (current?.resolve === finish ? null : current));
        });
      };

      signal?.addEventListener("abort", onAbort, { once: true });

      // Paint before execute yields. A late setState after abort must not reopen.
      flushSync(() => {
        if (!canOpenConfirm(settled, Boolean(signal?.aborted))) {
          setPrompt((current) => (current?.resolve === finish ? null : current));
          return;
        }
        setPrompt((current) => {
          if (!canOpenConfirm(settled, Boolean(signal?.aborted))) {
            return current?.resolve === finish ? null : current;
          }
          current?.resolve(false);
          return { message, resolve: finish };
        });
      });
    });
  }, []);

  const answer = (ok: boolean) => {
    setPrompt((current) => {
      current?.resolve(ok);
      return null;
    });
  };

  useEffect(() => {
    if (!prompt) return;

    emit("latch:confirm-open", prompt.message);
    yesRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        answer(false);
      }
      if (event.key !== "Tab") return;
      const yes = yesRef.current;
      const root = yes?.closest("[data-testid='latch-confirm']");
      const no = root?.querySelector<HTMLButtonElement>(`[data-testid='${CONFIRM_NO}']`);
      if (!yes || !no) return;
      const cycle = event.shiftKey ? yes : no;
      const atEdge = event.shiftKey ? document.activeElement === yes : document.activeElement === no;
      if (!atEdge) return;
      event.preventDefault();
      cycle.focus();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      emit("latch:confirm-close", prompt.message);
    };
  }, [prompt]);

  const layer = prompt ? (
    <div
      className="confirm-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="latch-confirm-copy"
      data-testid={CONFIRM_ROOT}
      data-latch-confirm="open"
    >
      <div className="confirm-card">
        <p id="latch-confirm-copy">{prompt.message}</p>
        <div className="confirm-actions">
          <button
            ref={yesRef}
            type="button"
            className="latch"
            data-testid={CONFIRM_YES}
            onClick={() => answer(true)}
          >
            Confirm
          </button>
          <button
            type="button"
            className="confirm-hold"
            data-testid={CONFIRM_NO}
            onClick={() => answer(false)}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, layer };
}
