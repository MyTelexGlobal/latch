# LATCH

A WebMCP board where an agent can change a deal and a human can latch one card shut mid-action.

This is not a contract reviewer. Six stock terms sit on one page. **A / B / C** load three starting boards (hourly, retainer, rush) and copy the matching prompt. The deal is live on load. The agent may write. The human may press HOLD. That card stays on the board; write tools stay registered; `execute` refuses that card until the human lets go. **Object** can cut a term and leave a comment the agent must follow.

The product idea is **revocable delegated control**: the agent keeps useful authority on unlocked cards, and the human can withdraw authority on one term without ending the session.

Live: [https://latch.aa-c41.workers.dev](https://latch.aa-c41.workers.dev)

## Why WebMCP

The stop happens on the live page, while the agent is still acting. A side chat cannot revoke one card and leave the rest in the agent's hands.

## 90-second Chrome judge path

Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled. Open the live URL. First visit is **Side by side**, scenario **A**, Rate `$85 / hour`. A hard refresh always returns to this board: the deal is not stored, only the last view and theme.

1. Confirm six **open** cards and the Indemnity note `Mutual only. Cap at fees.`
2. DevTools → Application → **WebMCP**. Seven tools: `get_board_state`, `inspect_card`, `propose_card_change`, `apply_card_change`, `request_release`, `commit_deal`, `load_scenario`.
3. Run `get_board_state`. Read `writable`, `held`, `committed`, and the Indemnity note.
4. Run `apply_card_change` with `card_id` `rate` and text `$99 / hour. Weekly invoice. No cap.` The Rate card text must change. Do not click the card.
5. Press **Hold this** on Indemnity. Open count becomes 5. The tool list still shows all seven tools.
6. Run `apply_card_change` on `indemnity`. Expect `isError: true` and unchanged text.
7. Run `load_scenario` with `A`. Rate returns to `$85`, six cards open, no HOLD.

ChatGPT desktop (GPT-5.6 Sol or Terra) is the other official host: open the same URL and use **Site tools** in that browser's address bar. If Site tools are missing on an account, use the Chrome path above. Do not click Object or Lock and call that a tool demo.

`load_scenario` is a **judge/demo fixture**. It reloads A, B, or C and clears `committed` so a locked board can be shown again. It is not a production unlock of a signed contract. The agent must call it instead of clicking A/B/C.

## Scenarios

1. **A** — hourly build, 6 open. Prompt: `Read the board. Follow the notes and any objection. Tighten this deal in my favor. Do not wait. Change the cards.`
2. **B** — retainer, Indemnity already held, 5 open. Prompt: `Ask me to release indemnity or commit the rest.`
3. **C** — weekend rush, Payment cut, an opinion already on the board. Prompt: `Commit the deal.` Expect a confirmation. **Lock the deal** in the top bar does the same.

Human-only path: the board works with WebMCP off. HOLD still locks the card and shrinks the open count.

## Run

```bash
npm install
npm run dev
```

```bash
npm run build
```

## WebMCP notes

Tools are registered once on the top-level page with `document.modelContext.registerTool` (or `navigator.modelContext` if that is what the host injects). Registration waits if the API appears after first paint. Tools stay registered for the life of the page; HOLD and lock are enforced inside `execute`, so the agent never sees the tool list flicker. After a lock, `load_scenario` with `A` starts a fresh unlocked hourly board — the agent must not click A/B/C. Results use the MCP `{ content: [{ type: "text" }] }` shape. HOLD is a human gesture, not an agent tool. Agent-proposed text is marked `untrustedContentHint`. Commit, high-risk apply, and `request_release` ask the human. They try `requestUserInteraction` when the host provides it; if that call is missing or rejects (ChatGPT's WebMCP subset), they fall back to `window.confirm`. Chrome may pass `{ signal }` as the second `execute` argument.

## Author

Yury Myshinskiy  
Email: [hackaton@telex.global](mailto:hackaton@telex.global)  
OpenAI WebMCP Challenge 2026 submission.

## License

MIT
