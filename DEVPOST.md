# Devpost fields (English, paste as-is)

Author: Yury Myshinskiy.

Live: https://latch.aa-c41.workers.dev

Repo: https://github.com/MyTelexGlobal/latch

## Why this use case is a strong fit for WebMCP

Negotiating a deal is not a one-shot generation. A freelancer and a client need an agent that can rewrite terms on the same page they are watching, and they need to interrupt that agent at the level of one clause. LATCH is a live deal board published through `document.modelContext.registerTool`. The agent calls `get_board_state`, `inspect_card`, and `apply_card_change`. The human presses HOLD on one card. Write tools stay registered; `execute` refuses that card. A side chat cannot do this. A remote MCP server can edit a document with the tab closed. It cannot latch indemnity while rate stays writable on the open board. WebMCP is the fit because the board is the shared object: notes, vetoes, HOLD, and the on-page Confirm dialog are the same facts the agent reads and the human sees.

## How it creates a better user experience

The board is live on load. Scenario A is an hourly deal with six open cards. The human stays on one page and chooses an attention mode: List to audit every grant, Side by side to watch the whole table while the agent writes, One at a time to isolate the contested term. Those are not themes. They are three jobs over one board. HOLD shrinks the open count. Confirm / Not now appears on the page the moment a consequential tool needs a decision. Execute waits for that click. High-risk indemnity and commit use the same gesture. The page works when WebMCP is off: HOLD still latches the card. A reload returns to A and $85. Skin and theme persist; the deal does not.

## What people and agents can do together that was difficult or impossible before

Most agent UIs offer all-or-nothing control: the agent runs, or a global approval wall stops everything. LATCH is a third model — **revocable delegated control**. The agent tightens rate, scope, IP, term, and payment. The human latches indemnity mid-action. The next `apply_card_change` on that card returns `isError: true` with the text unchanged. The other cards stay writable. `request_release` asks; Confirm on the page lifts HOLD. `commit_deal` freezes the board after the same Confirm. Three attention modes let the human change what they watch without forking the session. A Google Doc plus a chat cannot revoke one clause and leave the rest in the agent's hands. DOM clicks can press Object. They cannot prove a structured write. On LATCH a successful apply replaces `card.text`.

## How you implemented WebMCP

Vite + React + TypeScript, static assets on Cloudflare Workers. The page late-binds `document.modelContext` or `navigator.modelContext` and registers seven tools once: `get_board_state`, `inspect_card`, `propose_card_change`, `apply_card_change`, `request_release`, `commit_deal`, `load_scenario`. Tools stay listed for the page lifetime. HOLD, cut, and lock are enforced inside `execute`. Reads use `readOnlyHint`. Agent text uses `untrustedContentHint`. Results use `{ content: [{ type: "text" }] }`; failures set `isError`. `card_id` is a string so opinion cards work. Consequential writes open an on-page dialog immediately. If the host exposes `requestUserInteraction`, LATCH offers it the same promise; execute settles on the page click, including when the host wrap throws synchronously or never calls back. `load_scenario` is a judge/demo fixture, not a production unlock. ChatGPT desktop Site tools (GPT-5.6 Sol or Terra) or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.
