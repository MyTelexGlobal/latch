/**
 * LATCH — shared-authority deal board.
 * Submission for the OpenAI WebMCP Challenge (2026): https://webmcp.devpost.com/
 * Author: Yury Myshinskiy
 * Email: hackaton@telex.global
 * License: MIT
 */
/// <reference types="vite/client" />

type HoldToolInput = Record<string, unknown>;

interface ModelContextClient {
  requestUserInteraction<T>(run: () => Promise<T> | T): Promise<T>;
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
    client?: ModelContextClient,
  ) => Promise<unknown>;
}

interface ModelContext {
  registerTool(
    tool: ModelContextTool,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
  getTools?: () => Promise<unknown[]>;
}

interface Document {
  modelContext?: ModelContext;
}
