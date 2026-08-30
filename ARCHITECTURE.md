# LATCH architecture

OpenAI WebMCP Challenge 2026. Author: Yury Myshinskiy (`hackaton@telex.global`).

LATCH is a single-page deal board. An agent rewrites terms through WebMCP tools. A human can HOLD one card without ending the session. That is **revocable delegated control**: authority is per object, visible, and reversible.

## Why this is WebMCP

The stop has to happen on the open tab, on the same objects the human sees. A remote MCP server can edit a contract with the tab closed. It cannot latch indemnity while rate stays writable on this page.

## Tree

| File | Role |
|---|---|
| `src/board.ts` | Pure reducers. No I/O. Scenario seeds A/B/C. |
| `src/webmcp.ts` | Late-bind `modelContext`, register seven tools once, enforce HOLD inside `execute`. |
| `src/confirm.tsx` | On-page Confirm / Not now. Source of truth for consequential writes. |
| `src/App.tsx` | Skin, theme, board ref, one registration effect. |
| `src/skins/*` | Three attention modes (audit / table / latch) over one board. |
| `src/vite-env.d.ts` | Host `ModelContext` types. |

Live: https://latch.aa-c41.workers.dev

Source: https://github.com/MyTelexGlobal/latch

## Three attention modes (not three themes)

List, Side by side, and One at a time share `Board`, tools, HOLD, notes, and confirm. They are not visual skins. They are three jobs the human does while an agent writes:

- **List (audit).** Vertical scan of every grant. Built for the moment before you trust the agent.
- **Side by side (table).** Default. All cards stay in view so a tool mutation is witnessed, not discovered in a transcript.
- **One at a time (latch).** One contested term. This is the layout that makes per-object HOLD obvious: the rest of the deal still exists, but attention collapses to the card whose write path you just revoked.

Day/night is a theme. A/B/C are authority fixtures. The three modes are the creative argument: shared visual context has to change when the human's role changes, without splitting the session.

## Tools

Registered once on the top-level document (`document.modelContext` or `navigator.modelContext`):

| Tool | Kind | Notes |
|---|---|---|
| `get_board_state` | read | Snapshot: writable, held, cut, notes, committed. |
| `inspect_card` | read | One card, including opinions. |
| `propose_card_change` | write | Pending text only. |
| `apply_card_change` | write | Replaces `card.text`. High-risk (indemnity) confirms on the page. |
| `request_release` | write | Confirms, then lifts HOLD. |
| `commit_deal` | write | Confirms, then freezes the board. |
| `load_scenario` | write | Judge/demo fixture. Reloads A/B/C and clears `committed`. |

HOLD is not a tool. The human presses **Hold this**. `execute` refuses that card; the seven names stay listed.

## Confirm path (do not hang the host)

1. `execute` needs a human decision.
2. The page dialog opens **immediately** (`[data-testid="latch-confirm"]`).
3. If the host has `requestUserInteraction`, LATCH offers it the **same** promise. Execute does **not** await that wrap.
4. A human or test driver clicks `[data-testid="latch-confirm-yes"]` or `…-no`.
5. `execute` settles. The host wrap, if it later returns or throws, is ignored.

This is deliberate. Some hosts advertise `requestUserInteraction`, never run the callback, and drop the connection on timeout. Waiting on that API leaves the automatic call without a handler. The visible Confirm button is the handler.

Automation:

```js
await new Promise((resolve) => {
  window.addEventListener("latch:confirm-open", resolve, { once: true });
});
document.querySelector('[data-testid="latch-confirm-yes"]').click();
```

Or poll for the test id and click in parallel with the tool call.

## Invariants

- One registration lifetime per page. Abort on unmount only.
- `execute` reads `boardRef.current`, not a stale closure from register time.
- Hard refresh = scenario A, `$85 / hour`, no HOLD. Only skin and theme persist.
- `card_id` is a string. Opinion cards mint their own ids.
- Results are `{ content: [{ type: "text", text }] }`. Failures set `isError: true`.
- Agent-proposed text is `untrustedContentHint`. Reads are `readOnlyHint`.
- English UI. Progressive enhancement: the board works when WebMCP is absent.

## Hosts

Judges may use ChatGPT desktop Site tools (GPT-5.6 Sol or Terra) or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`. Both are official. Demo tools through Site tools or Application → WebMCP, not by clicking Object.
