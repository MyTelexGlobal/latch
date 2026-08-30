# LATCH

A WebMCP board where an agent can change a deal and a human can latch one card shut mid-action.

This is not a contract reviewer. Six stock terms sit on one page. **A / B / C** load three starting boards (hourly, retainer, rush) and copy the matching prompt. The deal is live on load. The agent may write. The human may press HOLD. That card stays on the board; write tools stay registered; `execute` refuses that card until the human lets go. **Object** can cut a term and leave a comment the agent must follow.

The product idea is **revocable delegated control**: the agent keeps useful authority on unlocked cards, and the human can withdraw authority on one term without ending the session.

This is not a theme switcher and not a contract GPT. The innovations a judge should see in ninety seconds:

1. **Per-object authority.** HOLD latches one card. The other five stay writable. The tool list does not shrink.
2. **Shared visual HITL.** Confirm / Not now is on the page the agent is writing. Execute waits for that click, not for a host wrap.
3. **Three attention modes.** List, Side by side, and One at a time are three ways to watch the same grant of authority — audit, table, and latch — not three skins of chrome.
4. **Honest fixtures.** A / B / C are authority states (all open / one held / one cut). `load_scenario` is labeled a demo reset, not a legal unlock.

Live: [https://latch.aa-c41.workers.dev](https://latch.aa-c41.workers.dev)

## Why WebMCP

The stop happens on the live page, while the agent is still acting. A side chat cannot revoke one card and leave the rest in the agent's hands.

## Three attention modes

Most agent canvases give you one layout. LATCH gives three **attention modes** over one board and one tool set. Switching the mode does not fork the deal, the notes, or the HOLD. It changes what the human can still see while the agent writes.

| Mode | Tab | What it is for |
|---|---|---|
| **Audit** | List | Counsel scan. Every grant of authority in one column. You catch the bad indemnity before you watch the animation. |
| **Table** | Side by side | Negotiation. All six cards in peripheral vision while `apply_card_change` lands. Default on first visit because shared context is the product. |
| **Latch** | One at a time | The contested term fills the frame. When you HOLD indemnity, this mode is the proof that authority is per object, not per session. |

A grocery demo, a 3D studio, and a margin editor each have one stage. LATCH needs three because the human's job changes mid-action: first read the grants, then watch the table, then isolate the card they are about to latch. That is the creativity claim. Theme day/night is orthogonal and does not count as a mode.

## 90-second judge path

Official hosts: ChatGPT desktop (GPT-5.6 Sol or Terra) with **Site tools**, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`. Open the live URL. First visit is **Side by side**, scenario **A**, Rate `$85 / hour`. A hard refresh always returns to this board: the deal is not stored, only the last view and theme.

1. Confirm six **open** cards and the Indemnity note `Mutual only. Cap at fees.`
2. Show the seven tools: `get_board_state`, `inspect_card`, `propose_card_change`, `apply_card_change`, `request_release`, `commit_deal`, `load_scenario` (Site tools, or DevTools → Application → WebMCP).
3. Run `get_board_state`. Read `writable`, `held`, `committed`, and the Indemnity note.
4. Run `apply_card_change` with `card_id` `rate` and text `$99 / hour. Weekly invoice. No cap.` The Rate card text must change. Do not click the card.
5. Press **Hold this** on Indemnity. The authority strip reads that Indemnity is latched and the other terms stay writable. All seven tools stay listed.
6. Run `apply_card_change` on `indemnity`. Expect `isError: true` and unchanged text.
7. Run `request_release` on `indemnity`. Confirm on the page. HOLD lifts.
8. Run `apply_card_change` on `indemnity` with `Mutual only. Cap at fees.` Confirm on the page. The card text updates.
9. Run `commit_deal`. Confirm on the page. The board locks.
10. Run `load_scenario` with `A`. Rate returns to `$85`, six cards open.

Consequential tools (`request_release`, high-risk `apply_card_change`, `commit_deal`) open an on-page dialog immediately. Click **Confirm** (`[data-testid="latch-confirm-yes"]`) while the tool call is still pending. Do not wait for a host HITL wrap — the button is the handler. The page also fires `latch:confirm-open` on `window`.

Demo those tools through Site tools or the inspector. Object and Lock are human controls, not the tool proof.

Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md). Devpost paste: [DEVPOST.md](./DEVPOST.md). Narration: [VIDEO.md](./VIDEO.md).

`load_scenario` is a **judge/demo fixture**. It reloads A, B, or C and clears `committed` so a locked board can be shown again. It is not a production unlock of a signed contract. The agent calls it instead of clicking A/B/C.

## Scenarios

1. **A** — hourly build, 6 open. Prompt: `Read the board. Follow the notes and any objection. Tighten this deal in my favor. Do not wait. Change the cards.`
2. **B** — retainer, Indemnity already held, 5 open. Prompt: `Ask me to release indemnity or commit the rest.`
3. **C** — weekend rush, Payment cut, an opinion already on the board. Prompt: `Commit the deal.` Confirm on the page. **Lock the deal** in the top bar does the same.

Human-only path: the board works with WebMCP off. HOLD still locks the card and shrinks the open count.

## Run

```bash
npm install
npm run dev
```

```bash
npm run build
```

```bash
npm test
```

## WebMCP notes

Tools are registered once on the top-level page with `document.modelContext.registerTool` (or `navigator.modelContext` if that is what the host injects). Registration waits if the API appears after first paint. Tools stay registered for the life of the page; HOLD and lock are enforced inside `execute`, so the agent never sees the tool list flicker. After a lock, `load_scenario` with `A` starts a fresh unlocked hourly board — the agent must not click A/B/C. Results use the MCP `{ content: [{ type: "text" }] }` shape. HOLD is a human gesture, not an agent tool. Agent-proposed text is marked `untrustedContentHint`. Commit, high-risk apply, and `request_release` confirm on the page as soon as `execute` needs a decision. If the host exposes `requestUserInteraction`, LATCH offers it the same promise. Execute settles on the page click, not on the host wrap, so a test driver can click Confirm in parallel. Chrome may pass `{ signal }` as the second `execute` argument.

## Author

Yury Myshinskiy  
Email: [hackaton@telex.global](mailto:hackaton@telex.global)  
OpenAI WebMCP Challenge 2026 submission.

## License

MIT
