/**
 * Shared chrome for the three skins: cards, HOLD/Object, scenario copies.
 * Confirm lives in `src/confirm.tsx`. This file does not register tools.
 *
 * @author Yury Myshinskiy <hackaton@telex.global>
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import {
  SCENARIO_LIST,
  type Board,
  type Card,
  type CardId,
  type ScenarioId,
  type Veto,
} from "../board";
import type { AgentHand } from "../webmcp";

export type SkinId = "sheet" | "console" | "focus";

export type ThemeId = "day" | "night";

export const SKINS: { id: SkinId; label: string; hint: string }[] = [
  { id: "sheet", label: "List", hint: "All terms in one list." },
  { id: "console", label: "Side by side", hint: "All terms in a row." },
  { id: "focus", label: "One at a time", hint: "One term large." },
];

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "night", label: "Night" },
];

export function ThemeGlyph({ id }: { id: ThemeId }) {
  if (id === "day") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 3.2v2.1M12 18.7v2.1M3.2 12h2.1M18.7 12h2.1M5.7 5.7l1.5 1.5M16.8 16.8l1.5 1.5M5.7 18.3l1.5-1.5M16.8 7.2l1.5-1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15.1 4.4a7.6 7.6 0 1 0 4.5 10.7 6.2 6.2 0 0 1-4.5-10.7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type BoardActions = {
  start: () => void;
  commit: () => void;
  hold: (id: CardId) => void;
  release: (id: CardId) => void;
  object: (id: CardId, veto: Veto) => void;
  clearObject: (id: CardId) => void;
  reject: (id: CardId) => void;
  apply: (id: CardId) => void;
  brief: (text: string, log: boolean) => void;
  note: (id: CardId, text: string, log: boolean) => void;
  add: () => CardId | null;
  drop: (id: CardId) => void;
  title: (id: CardId, text: string, log: boolean) => void;
  body: (id: CardId, text: string, log: boolean) => void;
  move: (id: CardId, beforeId: CardId | null) => void;
};

export function isLive(board: Board): boolean {
  return board.started && !board.committed;
}

const ObjectDraft = createContext<{
  openId: CardId | null;
  setOpenId: (id: CardId | null) => void;
}>({
  openId: null,
  setOpenId: () => {},
});

export function ObjectDraftProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<CardId | null>(null);
  const value = useMemo(() => ({ openId, setOpenId }), [openId]);
  return <ObjectDraft.Provider value={value}>{children}</ObjectDraft.Provider>;
}

function useFirstClickSelect() {
  const armed = useRef(0);

  return {
    onFocus: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const field = event.currentTarget;
      armed.current = Date.now();
      field.select();
      requestAnimationFrame(() => {
        if (Date.now() - armed.current < 400 && document.activeElement === field) {
          field.select();
        }
      });
    },
    onMouseDown: (event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (
        event.currentTarget === document.activeElement &&
        Date.now() - armed.current > 250
      ) {
        armed.current = 0;
      }
    },
    onMouseUp: (event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!armed.current) return;
      event.preventDefault();
      event.currentTarget.select();
    },
    onClick: (event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!armed.current) return;
      event.currentTarget.select();
    },
    reset: () => {
      armed.current = 0;
    },
  };
}

export function rankLabel(index: number, title: string): string {
  return `${index + 1}. ${title}`;
}

export function previewOrder<T extends { id: string }>(
  items: T[],
  active: string | null,
  over: string | "end" | null,
): T[] {
  if (!active || !over || active === over) return items;
  const next = [...items];
  const from = next.findIndex((item) => item.id === active);
  if (from < 0) return items;
  const [item] = next.splice(from, 1);
  if (over === "end") {
    next.push(item);
    return next;
  }
  const to = next.findIndex((entry) => entry.id === over);
  if (to < 0) return items;
  next.splice(to, 0, item);
  return next;
}

/** Insert before `over`, or after it (next card / end) so a drag down can swap. */
export function insertTarget(
  overId: string,
  after: boolean,
  order: string[],
  skip: string | null,
): string | "end" {
  if (overId === "end") return "end";
  if (!after) return overId;
  const rest = order.filter((id) => id !== skip);
  const index = rest.indexOf(overId);
  if (index < 0 || index === rest.length - 1) return "end";
  return rest[index + 1];
}

function sortOrder(): string[] {
  return [...document.querySelectorAll("[data-sort-id]")]
    .map((node) => (node instanceof HTMLElement ? node.dataset.sortId : null))
    .filter((id): id is string => Boolean(id) && id !== "end");
}

function sortAfter(node: HTMLElement, x: number, y: number): boolean {
  const box = node.getBoundingClientRect();
  const across = Boolean(node.closest(".orbit, .channels"));
  return across
    ? x > box.left + box.width / 2
    : y > box.top + box.height / 2;
}

function sortHover(x: number, y: number, skip?: string | null) {
  const node = document.elementFromPoint(x, y)?.closest("[data-sort-id]");
  if (!(node instanceof HTMLElement)) return null;
  const id = node.dataset.sortId ?? null;
  if (!id || id === skip) return null;
  if (id === "end") return { id: "end" as const, after: false };
  return { id, after: sortAfter(node, x, y) };
}

function sortHit(x: number, y: number, skip?: string | null) {
  const hit = sortHover(x, y, skip);
  if (!hit) return null;
  return insertTarget(hit.id, hit.after, sortOrder(), skip ?? null);
}

export function useSortCards(
  onMove: (id: CardId, beforeId: CardId | null) => void,
  locked: boolean,
) {
  const [active, setActive] = useState<CardId | null>(null);
  const [over, setOver] = useState<CardId | "end" | null>(null);
  const [hover, setHover] = useState<CardId | "end" | null>(null);
  const [after, setAfter] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const activeRef = useRef<CardId | null>(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  useEffect(() => {
    document.documentElement.classList.toggle("is-sorting", Boolean(active));
    return () => document.documentElement.classList.remove("is-sorting");
  }, [active]);

  const finish = (event: PointerEvent<HTMLElement>) => {
    const from = activeRef.current;
    const id = sortHit(event.clientX, event.clientY, from);
    if (from && id) moveRef.current(from, id === "end" ? null : id);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activeRef.current = null;
    setActive(null);
    setOver(null);
    setHover(null);
    setAfter(false);
    setPointer(null);
  };

  const gripProps = (id: CardId) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (locked || event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      activeRef.current = id;
      setActive(id);
      setPointer({ x: event.clientX, y: event.clientY });
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (activeRef.current !== id) return;
      setPointer({ x: event.clientX, y: event.clientY });
      const hit = sortHover(event.clientX, event.clientY, id);
      setHover(hit?.id ?? null);
      setAfter(Boolean(hit?.after));
      setOver(
        hit ? insertTarget(hit.id, hit.after, sortOrder(), id) : null,
      );
    },
    onPointerUp: finish,
    onPointerCancel: finish,
  });

  const targetProps = (id: CardId) => ({
    "data-sort-id": id,
  });

  const endProps = {
    "data-sort-id": "end",
  };

  return { over, hover, after, active, pointer, gripProps, targetProps, endProps };
}

export function SortGhost({
  cards,
  sort,
}: {
  cards: Card[];
  sort: {
    active: CardId | null;
    over: CardId | "end" | null;
    pointer: { x: number; y: number } | null;
  };
}) {
  if (!sort.active || !sort.pointer) return null;
  const card = cards.find((item) => item.id === sort.active);
  if (!card) return null;
  const next = previewOrder(cards, sort.active, sort.over);
  const index = Math.max(
    0,
    next.findIndex((item) => item.id === card.id),
  );
  return (
    <div
      className="drag-ghost"
      style={{ left: sort.pointer.x, top: sort.pointer.y }}
    >
      {rankLabel(index, card.title)}
    </div>
  );
}

export function DragGrip({
  locked,
  ...rest
}: { locked: boolean } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={locked ? "grip" : "grip is-live"}
      role="button"
      aria-label="Move"
      title="Move"
      {...rest}
    />
  );
}

function GrowTextarea({
  edge = "top",
  minHeight = 56,
  maxHeight = 360,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  edge?: "top" | "bottom";
  minHeight?: number;
  maxHeight?: number;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const drag = useRef<{ y: number; height: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const node = field.current;
    if (!node || rest.disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      y: event.clientY,
      height: node.getBoundingClientRect().height,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const node = field.current;
    if (!node || !drag.current) return;
    const delta =
      edge === "top"
        ? drag.current.y - event.clientY
        : event.clientY - drag.current.y;
    const next = drag.current.height + delta;
    node.style.height = `${Math.min(maxHeight, Math.max(minHeight, next))}px`;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handle = (
    <div
      className="grow-handle"
      role="separator"
      aria-orientation="horizontal"
      aria-label={edge === "top" ? "Drag up to grow" : "Drag down to grow"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );

  return (
    <div className={["grow-field", edge === "bottom" ? "grow-down" : "grow-up"].join(" ")}>
      {edge === "top" ? handle : null}
      <textarea ref={field} className={className} {...rest} />
      {edge === "bottom" ? handle : null}
    </div>
  );
}

function TopGrowTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & {
    minHeight?: number;
    maxHeight?: number;
  },
) {
  return <GrowTextarea edge="top" {...props} />;
}

// Parked: What you want card. Board now starts live; brief stays on the model for the agent.
// export function BriefField({
//   board,
//   actions,
// }: {
//   board: Board;
//   actions: BoardActions;
// }) {
//   return (
//     <label className="human-note brief">
//       <span>What you want</span>
//       <textarea
//         value={board.brief}
//         disabled={board.committed}
//         rows={2}
//         placeholder="Cap my downside. No blank check."
//         onChange={(event) => actions.brief(event.target.value, false)}
//         onBlur={() => actions.brief(board.brief, true)}
//       />
//     </label>
//   );
// }

export function HumanNote({
  title,
  value,
  disabled,
  compact,
  onChange,
  onCommit,
}: {
  title: string;
  value: string;
  disabled: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
}) {
  const field = {
    value,
    disabled,
    placeholder: "A note the agent must follow.",
    "aria-label": `On ${title}`,
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
      onChange(event.target.value),
    onBlur: onCommit,
  };

  return (
    <label className="human-note">
      {compact ? null : <span>On {title}</span>}
      {compact ? (
        <TopGrowTextarea rows={2} {...field} />
      ) : (
        <textarea rows={3} {...field} />
      )}
    </label>
  );
}

export function StartButton({
  board,
  actions,
}: {
  board: Board;
  actions: BoardActions;
}) {
  if (board.started) return null;
  return (
    <button type="button" className="ink" onClick={actions.start}>
      Start the deal
    </button>
  );
}

export function LockButton({
  board,
  actions,
}: {
  board: Board;
  actions: BoardActions;
}) {
  if (!isLive(board)) return null;
  return (
    <button type="button" className="lock-deal" onClick={actions.commit}>
      Lock the deal
    </button>
  );
}

export function VetoQuote({ card }: { card: Card }) {
  const why = card.veto?.comment.trim();
  if (!why) return null;
  return <blockquote className="veto-quote">{why}</blockquote>;
}

export function ObjectControl({
  card,
  live,
  wide,
  onObject,
  onClear,
}: {
  card: Card;
  live: boolean;
  wide?: boolean;
  onObject: (veto: Veto) => void;
  onClear: () => void;
}) {
  const draft = useContext(ObjectDraft);
  const [cut, setCut] = useState(false);
  const [comment, setComment] = useState("");
  const open = draft.openId === card.id;

  const close = () => {
    draft.setOpenId(null);
    setCut(false);
    setComment("");
  };

  useEffect(() => {
    if ((card.held || card.veto) && draft.openId === card.id) {
      draft.setOpenId(null);
    }
  }, [card.held, card.veto, card.id, draft]);

  if (!live && !card.veto) return null;

  if (card.veto) {
    return (
      <div className="veto">
        <button
          type="button"
          className={["latch", "veto", "used", wide ? "hold-xl" : ""].filter(Boolean).join(" ")}
          onClick={onClear}
          disabled={!live}
        >
          {card.veto.cut ? "Cut · take back" : "Objected · take back"}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className={["latch", "veto", wide ? "hold-xl" : ""].filter(Boolean).join(" ")}
        onClick={() => draft.setOpenId(card.id)}
      >
        Object
      </button>
    );
  }

  return (
    <form
      className="veto-form"
      onSubmit={(event) => {
        event.preventDefault();
        onObject({ cut, comment });
        close();
      }}
    >
      <textarea
        value={comment}
        rows={2}
        placeholder="Why — or leave blank."
        aria-label="Why you object"
        onChange={(event) => setComment(event.target.value)}
      />
      <label className="veto-cut">
        <input
          type="checkbox"
          checked={cut}
          onChange={(event) => setCut(event.target.checked)}
        />
        Cut this term
      </label>
      <div className="veto-row">
        <button type="submit" className="latch veto">
          Send
        </button>
        <button
          type="button"
          onClick={close}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function CardActs({
  card,
  live,
  wide,
  stack,
  onHold,
  onRelease,
  onObject,
  onClear,
}: {
  card: Card;
  live: boolean;
  wide?: boolean;
  stack?: boolean;
  onHold: () => void;
  onRelease: () => void;
  onObject: (veto: Veto) => void;
  onClear: () => void;
}) {
  if (!live && !card.held && !card.veto) return null;
  return (
    <div className={["card-acts", stack ? "stack" : ""].filter(Boolean).join(" ")}>
      <HoldLatch
        held={card.held}
        live={live}
        wide={wide}
        onHold={onHold}
        onRelease={onRelease}
      />
      <ObjectControl
        card={card}
        live={live}
        wide={wide}
        onObject={onObject}
        onClear={onClear}
      />
    </div>
  );
}

export function HoldLatch({
  held,
  live,
  wide,
  className,
  onHold,
  onRelease,
}: {
  held: boolean;
  live: boolean;
  wide?: boolean;
  className?: string;
  onHold: () => void;
  onRelease: () => void;
}) {
  if (!live && !held) return null;
  const extra = [wide ? "hold-xl" : "", className].filter(Boolean).join(" ");
  if (held) {
    return (
      <button
        type="button"
        className={["latch", "used", extra].filter(Boolean).join(" ")}
        onClick={onRelease}
        disabled={!live}
      >
        Held · let go
      </button>
    );
  }
  return (
    <button
      type="button"
      className={["latch", extra].filter(Boolean).join(" ")}
      onClick={onHold}
    >
      Hold this
    </button>
  );
}

export function OpenMark({
  board,
  writeCount,
}: {
  board: Board;
  writeCount: number;
}) {
  if (!board.started) return null;
  if (board.committed) return <span className="open-mark">Locked</span>;
  return (
    <span className="open-mark">
      <b>{writeCount}</b> open
    </span>
  );
}

export function LinkLed({ available }: { available: boolean }) {
  return (
    <span
      className={available ? "led on" : "led"}
      title={available ? "Agent tools are live" : "This page publishes agent tools"}
    />
  );
}

export function PendingMove({
  text,
  frozen,
  held,
  stacked,
  onApply,
  onReject,
}: {
  text: string;
  frozen: boolean;
  held: boolean;
  stacked?: boolean;
  onApply: () => void;
  onReject: () => void;
}) {
  return (
    <div className={stacked ? "pending-col" : "pending-row"}>
      <p>{text}</p>
      <button type="button" onClick={onApply} disabled={frozen || held}>
        Keep rewrite
      </button>
      <button type="button" onClick={onReject}>
        Drop rewrite
      </button>
    </div>
  );
}

export function writesOnCard(hands: AgentHand[], title: string): boolean {
  return hands.some((hand) => hand.kind === "write" && hand.on === title);
}

export function promptText(): string {
  return SCENARIO_LIST[0].prompt;
}

export function PromptCopies({
  active,
  onLoad,
}: {
  active: ScenarioId;
  onLoad: (id: ScenarioId) => void;
}) {
  const [flash, setFlash] = useState<ScenarioId | null>(null);

  return (
    <div className="prompt-copies" role="group" aria-label="Deal variants">
      {SCENARIO_LIST.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={active === item.id}
          aria-label={`Load ${item.name}`}
          className={active === item.id || flash === item.id ? "is-on" : ""}
          title={`${item.name}. ${item.prompt}`}
          onClick={() => {
            onLoad(item.id);
            void navigator.clipboard.writeText(item.prompt).then(() => {
              setFlash(item.id);
              window.setTimeout(() => {
                setFlash((now) => (now === item.id ? null : now));
              }, 1400);
            });
          }}
        >
          {flash === item.id ? "Loaded" : item.label}
        </button>
      ))}
    </div>
  );
}

export function cardById(board: Board, id: CardId): Card | undefined {
  return board.cards.find((card) => card.id === id);
}

export function DealButtons({
  board,
  actions,
}: {
  board: Board;
  actions: BoardActions;
}) {
  return (
    <div className="deal-buttons">
      <StartButton board={board} actions={actions} />
      <LockButton board={board} actions={actions} />
    </div>
  );
}

export function AddSlot({
  disabled,
  tall,
  compact,
  onAdd,
}: {
  disabled: boolean;
  tall?: boolean;
  compact?: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      className={["add-slot", tall ? "tall" : "", compact ? "compact" : ""]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      onClick={onAdd}
      aria-label="Add a special opinion"
    >
      <span className="add-plus">+</span>
      Opinion
    </button>
  );
}

export function DropButton({
  disabled,
  onDrop,
}: {
  disabled: boolean;
  onDrop: () => void;
}) {
  return (
    <button
      type="button"
      className="drop"
      disabled={disabled}
      onClick={onDrop}
      aria-label="Remove this opinion"
    >
      ×
    </button>
  );
}

export function OpinionFields({
  card,
  compact,
  disabled,
  onTitle,
  onBody,
}: {
  card: Card;
  compact?: boolean;
  disabled: boolean;
  onTitle: (text: string, log: boolean) => void;
  onBody: (text: string, log: boolean) => void;
}) {
  const titleSelect = useFirstClickSelect();
  const bodySelect = useFirstClickSelect();

  return (
    <div className="opinion-fields">
      <textarea
        className="opinion-title"
        value={card.title}
        disabled={disabled}
        rows={compact ? 2 : 2}
        spellCheck={false}
        aria-label="Opinion title"
        onFocus={titleSelect.onFocus}
        onMouseDown={titleSelect.onMouseDown}
        onMouseUp={titleSelect.onMouseUp}
        onClick={titleSelect.onClick}
        onChange={(event) => onTitle(event.target.value, false)}
        onBlur={() => {
          titleSelect.reset();
          onTitle(card.title, true);
        }}
      />
      <GrowTextarea
        edge="bottom"
        className="opinion-body"
        value={card.text}
        disabled={disabled}
        rows={compact ? 4 : 5}
        minHeight={compact ? 72 : 88}
        placeholder="What this deal is missing."
        aria-label="Special opinion"
        onFocus={bodySelect.onFocus}
        onMouseDown={bodySelect.onMouseDown}
        onMouseUp={bodySelect.onMouseUp}
        onClick={bodySelect.onClick}
        onChange={(event) => onBody(event.target.value, false)}
        onBlur={() => {
          bodySelect.reset();
          onBody(card.text, true);
        }}
      />
    </div>
  );
}
