/**
 * LATCH — shared-authority deal board.
 * Submission for the OpenAI WebMCP Challenge (2026): https://webmcp.devpost.com/
 * Author: Yury Myshinskiy
 * Email: hackaton@telex.global
 * License: MIT
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

export function Console({
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
    <div className="skin console">
      <header className="console-head">
        <div>
          <LinkLed available={available} />
          <div>
            <p className="kicker">{SCENARIOS[board.scenario].name}</p>
            <h1>LATCH</h1>
          </div>
        </div>
      </header>

      {/* What you want card — parked. Deal starts live on load.
      <div className="do-row brief-pad">
        <BriefField board={board} actions={actions} />
        <DealButtons board={board} actions={actions} />
      </div>
      */}

      <div className="channels" role="list">
        {board.cards.map((card, index) => (
          <Channel
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
        <div
          className={sort.hover === "end" ? "add-wrap is-over" : "add-wrap"}
          {...sort.endProps}
        >
          <AddSlot
            tall
            disabled={!canAddOpinion(board)}
            onAdd={() => actions.add()}
          />
        </div>
      </div>
      <SortGhost cards={board.cards} sort={sort} />
    </div>
  );
}

function Channel({
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
  over: boolean;
  after: boolean;
  dragging: boolean;
  grip: HTMLAttributes<HTMLSpanElement>;
  target: { "data-sort-id": string };
}) {
  return (
    <article
      className={[
        "channel",
        card.held ? "is-held" : "",
        card.veto ? "is-objected" : "",
        card.veto?.cut ? "is-cut" : "",
        card.risk === "high" ? "is-hot" : "",
        card.kind === "opinion" ? "is-opinion" : "",
        over ? "is-over" : "",
        after ? "is-over-after" : "",
        dragging ? "is-dragging" : "",
      ].join(" ")}
      role="listitem"
      {...target}
    >
      <header>
        <DragGrip locked={committed} {...grip} />
        <span className={armed ? "led on" : "led"} />
        <h2>{card.kind === "opinion" ? `${index + 1}.` : rankLabel(index, card.title)}</h2>
        {card.kind === "opinion" ? (
          <DropButton disabled={committed} onDrop={onDrop} />
        ) : null}
      </header>
      {card.kind === "opinion" ? (
        <OpinionFields
          card={card}
          compact
          disabled={committed}
          onTitle={onTitle}
          onBody={onBody}
        />
      ) : (
        <>
          <p className="term-copy">{card.text}</p>
          <HumanNote
            title={card.title}
            value={card.note}
            disabled={committed}
            compact
            onChange={(text) => onNote(text, false)}
            onCommit={() => onNote(card.note, true)}
          />
        </>
      )}
      <VetoQuote card={card} />
      {card.pending ? (
        <PendingMove
          text={card.pending}
          frozen={!live}
          held={card.held}
          stacked
          onApply={onApply}
          onReject={onReject}
        />
      ) : null}
      <CardActs
        card={card}
        live={live}
        stack
        onHold={onHold}
        onRelease={onRelease}
        onObject={onObject}
        onClear={onClearObject}
      />
    </article>
  );
}
