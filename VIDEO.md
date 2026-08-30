# Video narration — under 3:00, English, no music

Record Chrome on https://latch.aa-c41.workers.dev
Side by side, scenario A. DevTools → Application → WebMCP.

Do not film Scenario C. The strip is truthful there now, but the prize path is one continuous A run.

## Warm the host (off tape)

First `request_release` / `commit_deal` on a cold browser bridge can time out before execute paints Confirm. That ruins a take. It is demonstration-harness latency, not a reason to add tools.

1. Hard refresh. Network must show the current `index-*.js` from this commit.
2. Open Application → WebMCP. Wait until all seven tools are listed.
3. Run `get_board_state`. Read `writable` / `held` / `cut`.
4. Run `apply_card_change` on `rate` → `$99 / hour. Weekly invoice. No cap.` Wait until the card text changes.
5. HOLD Indemnity. Run `request_release`. If Confirm is late or the bridge times out, click Not now, confirm HOLD remains, retry once.
6. `load_scenario` `A`. Confirm Rate is `$85` and the strip says every term.
7. Start the recording only after one successful Confirm has already appeared in this session.

## On tape

| t | Picture | Voice |
|---|---|---|
| 0:00–0:12 | Live URL, no login, strip: agent may write every term | “Agents need authority a human can revoke one object at a time. This is LATCH. Cloudflare, no account.” |
| 0:12–0:32 | Application → WebMCP: seven names highlighted. Cursor not on the cards | “ChatGPT or Chrome discovers seven tools on this page. I am not going to click the cards.” |
| 0:32–0:48 | Run `get_board_state`. Point at `writable` | “The agent reads the same board the human sees.” |
| 0:48–1:08 | Run `apply_card_change` rate → `$99`. Cursor off the board | “Structured apply. Rate became ninety-nine. That is the tool result.” |
| 1:08–1:24 | HOLD Indemnity. Strip: Indemnity latched, agent still writes Rate… | “I revoked one grant. The rest stay in the agent’s hands.” |
| 1:24–1:42 | Run apply on indemnity. `isError`. Text unchanged. Still seven tools | “The write is refused in execute. The inventory did not shrink.” |
| 1:42–2:05 | `request_release`, click Confirm. Then apply the note text, Confirm | “The page dialog is the human decision. The host wrap is optional.” |
| 2:05–2:22 | `commit_deal`, click Not now. Strip still open | “Commit is the same gesture. I can refuse. The board stays live.” |
| 2:22–2:40 | Repo URL, MIT, live URL | “Public MIT. Yury Myshinskiy. WebMCP gives the agent tools. LATCH gives the human revocable, object-level authority.” |

If a take overruns, cut the spoken Cloudflare line, not discovery and not the failed HOLD apply.

Never cut the `$99` beat, the failed HOLD apply, or the tool inventory.

English narration, no music, readable zoom, one continuous run after the warmup.
