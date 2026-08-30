# LATCH

A WebMCP board where an agent can change a deal and a human can latch one card shut mid-action.

This is not a contract reviewer. Six stock terms sit on one page. **A / B / C** load three starting boards (hourly, retainer, rush) and copy the matching prompt. The deal is live on load. The agent may write. The human may press HOLD. That card freezes and the matching write tools go away. **Object** can cut a term and leave a comment the agent must follow.

## Why WebMCP

The stop happens on the live page, while the agent is still acting. A side chat cannot revoke one card and leave the rest in the agent's hands.

Live: [https://latch.aa-c41.workers.dev](https://latch.aa-c41.workers.dev)

## Judge test

1. Open the live URL in the ChatGPT desktop in-app browser (GPT-5.6 Sol or Terra). Chrome with `chrome://flags/#enable-webmcp-testing` is the fallback.
2. The board is live immediately. Indemnity already has a binding note: `Mutual only. Cap at fees.` Add **+ Opinion** if a term is missing. The agent reads notes, opinions, and vetoes through `get_board_state` / `inspect_card`.
3. Confirm Site tools appear. You should see reads plus writes for unlocked cards. The top bar shows how many cards are still **open**.
4. **A** loads the hourly build (6 open). It also copies: `Read the board. Follow the notes and any objection. Tighten this deal in my favor. Do not wait. Change the cards.`
5. Press **Hold this** on Indemnity, or jump with **B**. B loads a retainer where Indemnity is already held (5 open) and copies: `Ask me to release indemnity or commit the rest.`
6. **C** loads a weekend rush with Payment cut and an opinion already on the board. It copies: `Commit the deal.` Expect a confirmation. **Lock the deal** in the top bar does the same.

Human-only path: the board works with WebMCP off. HOLD still locks the card and shrinks the open count.

The page remembers the last view and theme in `localStorage`. First visit opens **List**.

## Run

```bash
npm install
npm run dev
```

```bash
npm run build
```

## WebMCP notes

Tools are registered on the top-level page with `document.modelContext.registerTool`. Scope uses `AbortSignal`. HOLD is a human gesture, not an agent tool. Agent-proposed text is marked `untrustedContentHint`. Commit and high-risk apply always ask the human; they use `requestUserInteraction` when the client provides it.

## Author

Yury Myshinskiy  
Email: [hackaton@telex.global](mailto:hackaton@telex.global)  
OpenAI WebMCP Challenge 2026 submission.

## License

MIT
