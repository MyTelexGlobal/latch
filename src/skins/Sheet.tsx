/**
 * List skin. Same board and actions as Side by side and One at a time.
 *
 * @author Yury Myshinskiy <hackaton@telex.global>
 */
import type { HTMLAttributes } from "react";
import { canAddOpinion, SCENARIOS, type Board, type Card, type Veto } from "../board";
import type { AgentHand } from "../webmcp";
import {
  AddSlot,
  DragGrip,
  DropButton,
  CardActs,
  HumanNote,
  VetoQuote,
  LinkLed,
  OpinionFields,
  PendingMove,
  isLive,
  rankLabel,
  SortGhost,
  useSortCards,
  type BoardActions,
  writesOnCard,
} from "./shared";

export function Sheet({
  board,
  hands,
  available,
  writeCount: _writeCount,
  actions,
}: {
  board: Board;
  hands: AgentHand[];
  available: boolean;
  writeCount: number;
  actions: BoardActions;
}) {
  const live = isLive(board);
  const sort = useSortCards(actions.move, board.committed);

  return (
    <div className="skin sheet">
      <header className="sheet-head">
        <div>
          <p className="kicker">{SCENARIOS[board.scenario].name}</p>
          <h1>LATCH</h1>
        </div>
        <div className="sheet-status">
          <LinkLed available={available} />
        </div>
      </header>

      {/* What you want card — parked. Deal starts live on load.
      <div className="do-row brief-pad">
        <BriefField board={board} actions={actions} />
        <DealButtons board={board} actions={actions} />
      </div>
      */}

      <ol className="sheet-lines deck">
        {board.cards.map((card, index) => (
          <SheetLine
            key={card.id}
            index={index}
            card={card}
            armed={writesOnCard(hands, card.title)}
            live={live}
            committed={board.committed}
            over={sort.hover === card.id && !sort.after}
            after={sort.hover === card.id && sort.after}
            dragging={sort.active === card.id}
            grip={sort.gripProps(card.id)}
            target={sort.targetProps(card.id)}
            onHold={() => actions.hold(card.id)}
            onRelease={() => actions.release(card.id)}
            onObject={(veto) => actions.object(card.id, veto)}
            onClearObject={() => actions.clearObject(card.id)}
            onReject={() => actions.reject(card.id)}
            onApply={() => actions.apply(card.id)}
            onNote={(text, log) => actions.note(card.id, text, log)}
            onTitle={(text, log) => actions.title(card.id, text, log)}
            onBody={(text, log) => actions.body(card.id, text, log)}
            onDrop={() => actions.drop(card.id)}
          />
        ))}
        <li
          className={["line add-line", sort.hover === "end" ? "is-over" : ""].join(" ")}
          {...sort.endProps}
        >
          <AddSlot disabled={!canAddOpinion(board)} onAdd={() => actions.add()} />
        </li>
      </ol>

      <SortGhost cards={board.cards} sort={sort} />

      <footer className="sheet-foot">
        {board.events[0] ? (
          <p>
            <b>{board.events[0].actor === "you" ? "You" : "Agent"}</b>{" "}
            {board.events[0].text}
          </p>
        ) : null}
      </footer>
    </div>
  );
}

function SheetLine({
  index,
  card,
  armed,
  live,
  committed,
  onHold,
  onRelease,
  onObject,
  onClearObject,
  onReject,
  onApply,
  onNote,
  onTitle,
  onBody,
  onDrop,
  over,
  after,
  dragging,
  grip,
  target,
}: {
  index: number;
  card: Card;
  armed: boolean;
  live: boolean;
  committed: boolean;
  over: boolean;
  after: boolean;
  dragging: boolean;
  grip: HTMLAttributes<HTMLSpanElement>;
  target: { "data-sort-id": string };
  onHold: () => void;
  onRelease: () => void;
  onObject: (veto: Veto) => void;
  onClearObject: () => void;
  onReject: () => void;
  onApply: () => void;
  onNote: (text: string, log: boolean) => void;
  onTitle: (text: string, log: boolean) => void;
  onBody: (text: string, log: boolean) => void;
  onDrop: () => void;
}) {
  return (
    <li
      className={[
        "line",
        card.held ? "is-held" : "",
        card.veto ? "is-objected" : "",
        card.veto?.cut ? "is-cut" : "",
        card.risk === "high" ? "is-hot" : "",
        card.kind === "opinion" ? "is-opinion" : "",
        over ? "is-over" : "",
        after ? "is-over-after" : "",
        dragging ? "is-dragging" : "",
      ].join(" ")}
      {...target}
    >
      <DragGrip locked={committed} {...grip} />
      <span
        className={armed ? "dot on" : "dot"}
        title={armed ? "Open" : "Held"}
      />
      <div className="line-body">
        <div className="line-top">
          <div className="line-name">
            {card.kind === "opinion" ? (
              <em>{rankLabel(index, card.title)}</em>
            ) : (
              <>
                <strong>{rankLabel(index, card.title)}</strong>
                {card.risk === "high" ? <em>Hot</em> : null}
              </>
            )}
            {card.kind === "opinion" ? (
              <DropButton disabled={committed} onDrop={onDrop} />
            ) : null}
          </div>
          <CardActs
            card={card}
            live={live}
            onHold={onHold}
            onRelease={onRelease}
            onObject={onObject}
            onClear={onClearObject}
          />
        </div>
        {card.kind === "opinion" ? (
          <OpinionFields
            card={card}
            disabled={committed}
            onTitle={onTitle}
            onBody={onBody}
          />
        ) : (
          <>
            <p>{card.text}</p>
            <VetoQuote card={card} />
            <HumanNote
              title={card.title}
              value={card.note}
              disabled={committed}
              onChange={(text) => onNote(text, false)}
              onCommit={() => onNote(card.note, true)}
            />
          </>
        )}
        {card.kind === "opinion" ? <VetoQuote card={card} /> : null}
        {card.pending ? (
          <PendingMove
            text={card.pending}
            frozen={!live}
            held={card.held}
            onApply={onApply}
            onReject={onReject}
          />
        ) : null}
      </div>
    </li>
  );
}
