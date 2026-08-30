# Devpost fields (English, paste as-is)

Official [What to Submit](https://webmcp.devpost.com/) text: four answers, live URL, public MIT repo, public YouTube < 3 min with audio.

Author: Yury Myshinskiy. Solo. Residence: Bulgaria.

Live: https://latch.aa-c41.workers.dev

Repo: https://github.com/MyTelexGlobal/latch

Video: paste the public YouTube URL here after upload.

Do not paste the generic Inspiration / What it does / How we built it / Challenges block unless the form also shows those headings. The required WebMCP fields are the four below.

## Why this use case is a strong fit for WebMCP

Negotiating a live statement of work is not a one-shot generation. A freelancer, a marketplace operator, or legal-ops counsel needs an agent that can rewrite terms on the same page they are watching — and they need to interrupt that agent at the level of one clause. LATCH is a deal board published through `document.modelContext.registerTool`. The agent calls `get_board_state`, `inspect_card`, and `apply_card_change`. The human presses HOLD on one card. Write tools stay registered; `execute` refuses that card. A side chat cannot do this. A remote MCP server can edit a document with the tab closed. It cannot latch indemnity while rate stays writable on the open board.

The failure this prevents is specific. After a human accepts one rate edit, a coarse permission model leaves every other term writable. The next tool call can rewrite payment or uncapped indemnity while the human is still watching the rate card. That is document-wide agency after a single grant — the page-native form of [OWASP LLM06:2025 Excessive Agency](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf) (excessive permissions, missing human approval on a high-impact write). WebMCP is the fit because the board is the shared object: notes, vetoes, HOLD, cut, and the on-page Confirm dialog are the same facts the agent reads and the human sees.

## How it creates a better user experience

The board is live on load. Scenario A is an hourly deal with six open cards. A status line states who may still write. After HOLD it names the latched term. After a cut it names the term that left the deal — Scenario C says Payment is cut, not “every term.” The remaining writable titles stay listed. The human stays on one page and chooses an attention mode: List to audit every grant, Side by side to watch the table while the agent writes, One at a time to isolate the contested term. Those are not themes. They are three jobs over one board.

HOLD shrinks the open count without shrinking the tool list. Confirm / Not now appears on the page the moment a consequential tool needs a decision. Execute waits for that click. High-risk indemnity, release, and commit use the same gesture. The page works when WebMCP is off: HOLD still latches the card. A reload returns to A and $85. Skin and theme persist; the deal does not.

## What people and agents can do together that was difficult or impossible before

Most agent UIs offer all-or-nothing control: the agent runs, or a global approval wall stops everything. LATCH is a third model — revocable delegated control. The agent tightens rate, scope, IP, term, and payment. The human latches indemnity mid-action. The next `apply_card_change` on that card returns `isError: true` with the text unchanged. The other cards stay writable. `request_release` asks; Confirm on the page lifts HOLD. `commit_deal` is a separate freeze after the same Confirm. Object can cut a term from the deal; the strip and `get_board_state` both drop it from writable.

This is a reusable interaction grammar — HOLD, release, veto, commit — not a contract GPT. The first deployment domain is live SOW negotiation (freelance marketplace + legal ops). The same object-level grant applies to an insurance endorsement, a change order, or any multi-field write surface where one accepted edit must not become a session-wide write. A Google Doc plus a chat cannot revoke one clause and leave the rest in the agent's hands. DOM clicks can press Object. They cannot prove a structured write. On LATCH a successful apply replaces `card.text`.

## How you implemented WebMCP

Vite + React + TypeScript, static assets on Cloudflare Workers. The page late-binds `document.modelContext` or `navigator.modelContext` and registers seven tools once: `get_board_state`, `inspect_card`, `propose_card_change`, `apply_card_change`, `request_release`, `commit_deal`, `load_scenario`. Tools stay listed for the page lifetime. HOLD, cut, and lock are enforced inside `execute` and again in the board reducers. Reads use `readOnlyHint`. Agent text uses `untrustedContentHint`. Results use `{ content: [{ type: "text" }] }`; failures set `isError`. `card_id` is a string so opinion cards work.

Consequential writes open an on-page dialog immediately (`flushSync`). If the host exposes `requestUserInteraction`, LATCH offers it the same promise; execute settles on the page click, including when the host wrap throws, rejects, or never calls back. A timed-out execute must not reopen the dialog. `load_scenario` is a judge/demo fixture, not a production unlock. Vitest covers HITL races and the authority-strip invariant (A / B / C / locked). ChatGPT desktop Site tools (GPT-5.6 Sol or Terra) or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.

The hard part was not registration. It was keeping tool behavior, confirmation, cancellation, and the visible strip consistent: a release must not succeed if the human never confirmed, and a cut card must not be advertised as writable.

## Before you click Submit

- [ ] Live URL opens logged-out, no login
- [ ] GitHub About shows MIT and homepage = live URL
- [ ] Public YouTube < 3:00, English audio, no music
- [ ] These four fields pasted; no security or production-readiness claims
- [ ] Eligibility, residency, originality, and team size declared by the human
