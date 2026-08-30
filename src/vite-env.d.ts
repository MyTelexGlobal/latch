/**
 * Host-injected WebMCP types.
 *
 * Chrome and ChatGPT attach `modelContext` on `document` or `navigator`.
 * LATCH feature-detects `registerTool` and late-binds if the object appears
 * after first paint. These declarations describe the subset we call.
 *
 * @see https://webmachinelearning.github.io/webmcp/
 * @see https://learn.chatgpt.com/docs/webmcp
 */
/// <reference types="vite/client" />

type HoldToolInput = Record<string, unknown>;

/**
 * Second argument to `execute`.
 * `signal` aborts a long-running call (including an open confirm).
 * `requestUserInteraction` may wrap our page confirm; we never block on it.
 */
interface ModelContextExecuteExtra {
  signal?: AbortSignal;
  requestUserInteraction?: <T>(run: () => Promise<T> | T) => Promise<T>;
}

interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (
    input: HoldToolInput,
    extra?: ModelContextExecuteExtra,
  ) => Promise<unknown>;
}

interface ModelContext {
  registerTool(
    tool: ModelContextTool,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
  getTools?: () => Promise<unknown[]>;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface Document {
  modelContext?: ModelContext;
}

interface Navigator {
  modelContext?: ModelContext;
}

interface WindowEventMap {
  "latch:confirm-open": CustomEvent<{ message: string }>;
  "latch:confirm-close": CustomEvent<{ message: string }>;
}
