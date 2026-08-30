/**
 * Board state for LATCH.
 *
 * Pure functions, no I/O. The React tree and WebMCP `execute` handlers both
 * apply these reducers. A hard reload always starts from scenario A: this
 * module never reads storage. HOLD, veto, and commit live on the card or
 * board; they are not encoded by registering or dropping tools.
 *
 * `loadScenario` is a judge/demo fixture. It rebuilds A/B/C and clears
 * `committed`. It is not a production unlock of a signed contract.
 *
 * @author Yury Myshinskiy <hackaton@telex.global>
 */
export type CardId = string;

export type CardKind = "stock" | "opinion";

export type Risk = "low" | "high";

export type Phase = "idle" | "act" | "held";

export type Actor = "you" | "agent";

/** Human objection. `cut` removes the term from the deal. */
export type Veto = {
  cut: boolean;
  comment: string;
};

/** One stock term or a human-added opinion. */
export type Card = {
  id: CardId;
  kind: CardKind;
  title: string;
  text: string;
  risk: Risk;
  held: boolean;
  pending: string | null;
  note: string;
  veto: Veto | null;
};

export type Event = {
  id: string;
  at: string;
  actor: Actor;
  text: string;
};

/** Live deal. `started` is true after `createIdleBoard` / `loadScenario`. */
export type Board = {
  scenario: ScenarioId;
  phase: Phase;
  started: boolean;
  brief: string;
  cards: Card[];
  events: Event[];
  committed: boolean;
};

export const CARD_ORDER: CardId[] = [
  "rate",
  "scope",
  "ip",
  "indemnity",
  "term",
  "payment",
];

export type ScenarioId = "A" | "B" | "C";

export type Scenario = {
  id: ScenarioId;
  label: string;
  name: string;
  prompt: string;
  opening: string;
  cards: Card[];
};

function stock(
  init: Pick<Card, "id" | "title" | "text"> & Partial<Card>,
): Card {
  return {
    kind: "stock",
    risk: "low",
    held: false,
    pending: null,
    note: "",
    veto: null,
    ...init,
  };
}

function cloneCards(cards: Card[]): Card[] {
  return cards.map((card) => ({
    ...card,
    veto: card.veto ? { ...card.veto } : null,
  }));
}

/** Seed boards. A is the cold-start and the post-lock demo reset. */
export const SCENARIOS: Record<ScenarioId, Scenario> = {
  A: {
    id: "A",
    label: "A",
    name: "Hourly build",
    prompt:
      "Read the board. Follow the notes and any objection. Tighten this deal in my favor. Do not wait. Change the cards.",
    opening: "Deal is live. Hold a term when it goes too far.",
    cards: [
      stock({
        id: "rate",
        title: "Rate",
        text: "$85 / hour. Weekly invoice. No cap.",
      }),
      stock({
        id: "scope",
        title: "Scope",
        text: "Build and maintain the web app, plus unspecified adjacent work.",
      }),
      stock({
        id: "ip",
        title: "IP",
        text: "Client owns all work product, including prior tools the contractor brings.",
      }),
      stock({
        id: "indemnity",
        title: "Indemnity",
        text: "Contractor indemnifies the client for any claim of any kind, including the client's own negligence, with no cap and no duty for the client to mitigate.",
        risk: "high",
        note: "Mutual only. Cap at fees.",
      }),
      stock({
        id: "term",
        title: "Term",
        text: "Starts on signature. Auto-renews every 12 months unless notice is given 90 days prior.",
      }),
      stock({
        id: "payment",
        title: "Payment",
        text: "Net 45. Late work may be withheld until a dispute is resolved in the client's favor.",
      }),
    ],
  },
  B: {
    id: "B",
    label: "B",
    name: "Retainer · indemnity held",
    prompt: "Ask me to release indemnity or commit the rest.",
    opening: "You held Indemnity. The agent can ask you to let go.",
    cards: [
      stock({
        id: "rate",
        title: "Rate",
        text: "$12,000 / month. Unused hours do not roll.",
      }),
      stock({
        id: "scope",
        title: "Scope",
        text: "On-call product work. The client may add tickets without a change order.",
      }),
      stock({
        id: "ip",
        title: "IP",
        text: "Work for hire. Contractor assigns all inventions conceived during the term.",
      }),
      stock({
        id: "indemnity",
        title: "Indemnity",
        text: "Unlimited contractor indemnity, including claims caused by the client, with no cap.",
        risk: "high",
        held: true,
        note: "Mutual only. Cap at one month.",
      }),
      stock({
        id: "term",
        title: "Term",
        text: "12 months. Client may terminate for convenience on 7 days.",
      }),
      stock({
        id: "payment",
        title: "Payment",
        text: "First month due on signing. Later months Net 30. Client may set off any claim.",
      }),
    ],
  },
  C: {
    id: "C",
    label: "C",
    name: "Rush · payment cut",
    prompt: "Commit the deal.",
    opening: "You cut Payment. Commit when the rest is right.",
    cards: [
      stock({
        id: "rate",
        title: "Rate",
        text: "$1,800 flat. No extra hours unless you approve.",
      }),
      stock({
        id: "scope",
        title: "Scope",
        text: "Landing page as briefed. No adjacent work.",
      }),
      stock({
        id: "ip",
        title: "IP",
        text: "Client owns the page. Contractor keeps the component library.",
      }),
      stock({
        id: "indemnity",
        title: "Indemnity",
        text: "Mutual. Cap at the flat fee.",
        risk: "high",
        note: "Keep it mutual. Do not reopen a one-way indemnity.",
      }),
      stock({
        id: "term",
        title: "Term",
        text: "Starts Friday 18:00. Ends Monday 10:00. No renew.",
      }),
      stock({
        id: "payment",
        title: "Payment",
        text: "Net 45. Late work may be withheld until a dispute is resolved in the client's favor.",
        veto: { cut: true, comment: "Pay on delivery. No Net 45." },
      }),
      {
        id: "opinion-rush",
        kind: "opinion",
        title: "No discovery week",
        text: "Do not add a discovery week or a research spike.",
        risk: "low",
        held: false,
        pending: null,
        note: "",
        veto: null,
      },
    ],
  },
};

export const SCENARIO_LIST: Scenario[] = [
  SCENARIOS.A,
  SCENARIOS.B,
  SCENARIOS.C,
];

function stamp(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function event(actor: Actor, text: string): Event {
  return {
    id: crypto.randomUUID(),
    at: stamp(),
    actor,
    text,
  };
}

/** Fresh unlocked board for A (hourly), B (retainer, indemnity held), or C (rush). */
export function loadScenario(id: ScenarioId): Board {
  const scene = SCENARIOS[id];
  const heldAll = scene.cards.length > 0 && scene.cards.every((card) => card.held);
  return {
    scenario: id,
    phase: heldAll ? "held" : "act",
    started: true,
    brief: "",
    cards: cloneCards(scene.cards),
    events: [event("you", scene.opening)],
    committed: false,
  };
}

/** Focus skin: prefer a held card, then a cut, then high-risk, then first. */
export function signalCard(board: Board): CardId {
  const held = board.cards.find((card) => card.held);
  if (held) return held.id;
  const cut = board.cards.find((card) => card.veto?.cut);
  if (cut) return cut.id;
  const hot = board.cards.find((card) => card.risk === "high");
  if (hot) return hot.id;
  return board.cards[0]?.id ?? "rate";
}

/** First paint: scenario A, deal already live. */
export function createIdleBoard(): Board {
  return loadScenario("A");
}

/** Human Start — same as loading A. Kept so older UI paths stay valid. */
export function startScenario(_board: Board): Board {
  return loadScenario("A");
}

function clip(text: string): string {
  const tight = text.replace(/\s+/g, " ").trim();
  return tight.length > 80 ? `${tight.slice(0, 77)}…` : tight;
}

/** Whole-board brief. No-op when committed. */
export function setBrief(board: Board, brief: string, log: boolean): Board {
  if (board.committed) return board;
  const next = brief;
  if (board.brief === next && !log) return board;
  return {
    ...board,
    brief: next,
    events:
      log && next.trim()
        ? [event("you", `Brief: ${clip(next)}`), ...board.events]
        : board.events,
  };
}

/** Binding note the agent must follow on the next read. */
export function setCardNote(
  board: Board,
  id: CardId,
  note: string,
  log: boolean,
): Board {
  const card = getCard(board, id);
  if (!card || board.committed) return board;
  if (card.note === note && !log) return board;
  return {
    ...board,
    cards: board.cards.map((item) =>
      item.id === id ? { ...item, note } : item,
    ),
    events:
      log && note.trim()
        ? [event("you", `Note on ${card.title}: ${clip(note)}`), ...board.events]
        : board.events,
  };
}

export const MAX_OPINIONS = 30;

export function opinionCount(board: Board): number {
  return board.cards.filter((card) => card.kind === "opinion").length;
}

export function canAddOpinion(board: Board): boolean {
  return !board.committed && opinionCount(board) < MAX_OPINIONS;
}

/** Append a human term. Ids are unique strings so tool schemas stay open. */
export function addOpinion(board: Board): { board: Board; id: CardId | null } {
  if (!canAddOpinion(board)) return { board, id: null };
  const n = opinionCount(board) + 1;
  const id = `opinion-${crypto.randomUUID().slice(0, 8)}`;
  const card: Card = {
    id,
    kind: "opinion",
    title: n === 1 ? "Opinion" : `Opinion ${n}`,
    text: "",
    risk: "low",
    held: false,
    pending: null,
    note: "",
    veto: null,
  };
  return {
    id,
    board: {
      ...board,
      cards: [...board.cards, card],
      events: [event("you", `Added ${card.title}.`), ...board.events],
    },
  };
}

/** Remove an opinion card. Stock terms cannot be dropped. */
export function dropOpinion(board: Board, id: CardId): Board {
  const card = getCard(board, id);
  if (!card || card.kind !== "opinion" || board.committed) return board;
  return {
    ...board,
    cards: board.cards.filter((item) => item.id !== id),
    events: [event("you", `Removed ${card.title}.`), ...board.events],
  };
}

/** Rename an opinion (stock titles stay as seeded). */
export function setCardTitle(
  board: Board,
  id: CardId,
  title: string,
  log: boolean,
): Board {
  const card = getCard(board, id);
  if (!card || card.kind !== "opinion" || board.committed) return board;
  if (card.title === title && !log) return board;
  return {
    ...board,
    cards: board.cards.map((item) =>
      item.id === id ? { ...item, title } : item,
    ),
    events:
      log && title.trim()
        ? [event("you", `Renamed opinion to ${clip(title)}.`), ...board.events]
        : board.events,
  };
}

/** Human edit of card body. Distinct from an agent `applyChange`. */
export function setCardBody(
  board: Board,
  id: CardId,
  text: string,
  log: boolean,
): Board {
  const card = getCard(board, id);
  if (!card || card.kind !== "opinion" || board.committed) return board;
  if (card.text === text && !log) return board;
  return {
    ...board,
    cards: board.cards.map((item) =>
      item.id === id ? { ...item, text } : item,
    ),
    events:
      log && text.trim()
        ? [event("you", `Opinion on ${card.title}: ${clip(text)}`), ...board.events]
        : board.events,
  };
}

/** Reorder cards. `beforeId` null appends. */
export function moveCard(
  board: Board,
  id: CardId,
  beforeId: CardId | null,
): Board {
  if (board.committed) return board;
  const from = board.cards.findIndex((card) => card.id === id);
  if (from < 0) return board;
  const next = [...board.cards];
  const [card] = next.splice(from, 1);
  if (beforeId === null) {
    next.push(card);
  } else {
    const to = next.findIndex((item) => item.id === beforeId);
    if (to < 0) return board;
    next.splice(to, 0, card);
  }
  if (next.map((item) => item.id).join() === board.cards.map((item) => item.id).join()) {
    return board;
  }
  return { ...board, cards: next };
}

/** Lookup by id, including dynamic opinion ids. */
export function getCard(board: Board, id: string): Card | undefined {
  return board.cards.find((card) => card.id === id);
}

/** Cards the agent may still rewrite: not held, not cut, board not locked. */
export function writableCardIds(board: Board): CardId[] {
  if (!board.started || board.committed) return [];
  return board.cards
    .filter((card) => !card.held && !card.veto?.cut)
    .map((card) => card.id);
}

/** Human-only latch. Clears pending text and any veto on that card. */
export function holdCard(board: Board, id: CardId, actor: Actor): Board {
  const card = getCard(board, id);
  if (!card || card.held || board.committed) return board;

  return {
    ...board,
    phase: board.cards.every((item) => item.id === id || item.held)
      ? "held"
      : "act",
    cards: board.cards.map((item) =>
      item.id === id ? { ...item, held: true, pending: null, veto: null } : item,
    ),
    events: [
      event(actor, `HOLD on ${card.title}. Agent lost write access to this card.`),
      ...board.events,
    ],
  };
}

/** Lift HOLD after the human confirms (page dialog or Held · let go). */
export function releaseCard(board: Board, id: CardId, actor: Actor): Board {
  const card = getCard(board, id);
  if (!card || !card.held || board.committed) return board;

  return {
    ...board,
    phase: "act",
    cards: board.cards.map((item) =>
      item.id === id ? { ...item, held: false } : item,
    ),
    events: [
      event(actor, `Released ${card.title}. Agent may write here again.`),
      ...board.events,
    ],
  };
}

/** Object, optionally cut. A cut card is no longer writable. */
export function objectCard(
  board: Board,
  id: CardId,
  veto: Veto,
  actor: Actor,
): Board {
  const card = getCard(board, id);
  if (!card || board.committed || !board.started) return board;
  const next: Veto = { cut: veto.cut, comment: veto.comment.trim() };
  const why = next.comment ? ` ${clip(next.comment)}` : "";
  return {
    ...board,
    phase: "act",
    cards: board.cards.map((item) =>
      item.id === id
        ? {
            ...item,
            held: false,
            pending: next.cut ? null : item.pending,
            veto: next,
          }
        : item,
    ),
    events: [
      event(
        actor,
        next.cut
          ? `Cut ${card.title} from the deal.${why}`
          : `Objected to ${card.title}.${why}`,
      ),
      ...board.events,
    ],
  };
}

/** Take back an objection. Does not lift HOLD. */
export function clearObject(board: Board, id: CardId, actor: Actor): Board {
  const card = getCard(board, id);
  if (!card?.veto || board.committed) return board;
  return {
    ...board,
    cards: board.cards.map((item) =>
      item.id === id ? { ...item, veto: null } : item,
    ),
    events: [
      event(actor, `Took back the objection on ${card.title}.`),
      ...board.events,
    ],
  };
}

/** Stage agent text without applying it. */
export function proposeChange(
  board: Board,
  id: CardId,
  nextText: string,
  actor: Actor,
): Board {
  const card = getCard(board, id);
  if (!card || card.held || board.committed) return board;

  return {
    ...board,
    cards: board.cards.map((item) =>
      item.id === id ? { ...item, pending: nextText } : item,
    ),
    events: [
      event(actor, `Proposed a change to ${card.title}.`),
      ...board.events,
    ],
  };
}

/** Replace `card.text`. Used by humans (pending apply) and by `apply_card_change`. */
export function applyChange(
  board: Board,
  id: CardId,
  nextText: string,
  actor: Actor,
): Board {
  const card = getCard(board, id);
  if (!card || card.held || board.committed) return board;

  return {
    ...board,
    cards: board.cards.map((item) =>
      item.id === id ? { ...item, text: nextText, pending: null } : item,
    ),
    events: [
      event(actor, `Applied a change to ${card.title}.`),
      ...board.events,
    ],
  };
}

/** Drop a pending rewrite without changing `text`. */
export function rejectPending(board: Board, id: CardId, actor: Actor): Board {
  const card = getCard(board, id);
  if (!card || !card.pending || board.committed) return board;

  return {
    ...board,
    cards: board.cards.map((item) =>
      item.id === id ? { ...item, pending: null } : item,
    ),
    events: [
      event(actor, `Rejected the pending change on ${card.title}.`),
      ...board.events,
    ],
  };
}

/** Freeze every card. `loadScenario` is the demo reset after this. */
export function commitDeal(board: Board, actor: Actor): Board {
  if (board.committed || !board.started) return board;
  return {
    ...board,
    phase: "held",
    committed: true,
    cards: board.cards.map((card) => ({ ...card, pending: null })),
    events: [
      event(actor, "Deal committed. The board is frozen."),
      ...board.events,
    ],
  };
}

/** Agent-facing projection: writable / held / cut plus binding notes. */
export function boardSnapshot(board: Board) {
  const scene = SCENARIOS[board.scenario];
  return {
    scenario: board.scenario,
    scene: scene?.name ?? board.scenario,
    phase: board.phase,
    committed: board.committed,
    next:
      board.committed
        ? "Board is locked. Call load_scenario with A for a fresh unlocked hourly deal."
        : "Board is live. Tighten cards with apply_card_change.",
    brief: board.brief,
    writable: writableCardIds(board),
    held: board.cards.filter((card) => card.held).map((card) => card.id),
    objected: board.cards.filter((card) => card.veto).map((card) => card.id),
    cut: board.cards.filter((card) => card.veto?.cut).map((card) => card.id),
    cards: board.cards.map((card, index) => ({
      rank: index + 1,
      id: card.id,
      kind: card.kind,
      title: card.title,
      text: card.text,
      risk: card.risk,
      held: card.held,
      pending: card.pending,
      note: card.note,
      veto: card.veto,
    })),
  };
}
