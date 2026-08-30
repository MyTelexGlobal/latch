/**
 * One at a time skin. `signalCard` picks the term that needs attention.
 *
 * @author Yury Myshinskiy <hackaton@telex.global>
 */
import { useState } from "react";
import { canAddOpinion, SCENARIOS, signalCard, type Board, type CardId } from "../board";
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
  cardById,
  isLive,
  rankLabel,
  SortGhost,
  useSortCards,
  type BoardActions,
  writesOnCard,
} from "./shared";

export function Focus({
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
  const [focus, setFocus] = useState<CardId>(() => signalCard(board));
  const sort = useSortCards(actions.move, board.committed);
  const card = cardById(board, focus) ?? board.cards[0];
  const index = Math.max(
    0,
    board.cards.findIndex((item) => item.id === card.id),
  );
  const live = isLive(board);
  const armed = writesOnCard(hands, card.title);

  return (
    <div className="skin focus">
      <header className="focus-head">
        <div>
          <LinkLed available={available} />
          <p className="kicker">{SCENARIOS[board.scenario].name}</p>
        </div>
      </header>

      <nav className="orbit" aria-label="Terms">
        {board.cards.map((item, itemIndex) => (
          <div
            key={item.id}
            className={[
              "chip-slot",
              sort.hover === item.id && !sort.after ? "is-over" : "",
              sort.hover === item.id && sort.after ? "is-over-after" : "",
              sort.active === item.id ? "is-dragging" : "",
            ].join(" ")}
            {...sort.targetProps(item.id)}
          >
            <DragGrip locked={board.committed} {...sort.gripProps(item.id)} />
            <button
              type="button"
              className={[
                "chip",
                item.id === card.id ? "is-current" : "",
                item.held ? "is-held" : "",
                item.veto ? "is-objected" : "",
                item.veto?.cut ? "is-cut" : "",
                item.risk === "high" ? "is-hot" : "",
                item.kind === "opinion" ? "is-opinion" : "",
                item.kind === "stock" && item.note.trim() ? "has-note" : "",
                item.kind === "opinion" && item.text.trim() ? "has-note" : "",
              ].join(" ")}
              onClick={() => setFocus(item.id)}
            >
              {rankLabel(itemIndex, item.title)}
            </button>
          </div>
        ))}
        <div
          className={sort.hover === "end" ? "chip-slot is-over" : "chip-slot"}
          {...sort.endProps}
        >
          <AddSlot
            compact
            disabled={!canAddOpinion(board)}
            onAdd={() => {
              const id = actions.add();
              if (id) setFocus(id);
            }}
          />
        </div>
      </nav>

      <SortGhost cards={board.cards} sort={sort} />

      {/* What you want card — parked. Deal starts live on load.
      <div className="do-row brief-pad">
        <BriefField board={board} actions={actions} />
        <DealButtons board={board} actions={actions} />
      </div>
      */}

      <article
        className={[
          "stage",
          "deck",
          card.held ? "is-held" : "",
          card.veto ? "is-objected" : "",
          card.veto?.cut ? "is-cut" : "",
          card.risk === "high" ? "is-hot" : "",
          card.kind === "opinion" ? "is-opinion" : "",
        ].join(" ")}
      >
        <p className={armed ? "dot on" : "dot"} />
        {card.kind === "opinion" ? (
          <p className="kicker">{rankLabel(index, "Opinion")}</p>
        ) : (
          <h1>{rankLabel(index, card.title)}</h1>
        )}
        {card.kind === "opinion" ? (
          <OpinionFields
            card={card}
            disabled={board.committed}
            onTitle={(text, log) => actions.title(card.id, text, log)}
            onBody={(text, log) => actions.body(card.id, text, log)}
          />
        ) : (
          <>
            <p className="stage-copy">{card.text}</p>
            <HumanNote
              title={card.title}
              value={card.note}
              disabled={board.committed}
              onChange={(text) => actions.note(card.id, text, false)}
              onCommit={() => actions.note(card.id, card.note, true)}
            />
          </>
        )}
        <VetoQuote card={card} />
        {card.pending ? (
          <PendingMove
            text={card.pending}
            frozen={!live}
            held={card.held}
            onApply={() => actions.apply(card.id)}
            onReject={() => actions.reject(card.id)}
          />
        ) : null}
        <div className="stage-actions">
          <CardActs
            card={card}
            live={live}
            wide
            onHold={() => actions.hold(card.id)}
            onRelease={() => actions.release(card.id)}
            onObject={(veto) => actions.object(card.id, veto)}
            onClear={() => actions.clearObject(card.id)}
          />
          {card.kind === "opinion" ? (
            <DropButton
              disabled={board.committed}
              onDrop={() => {
                actions.drop(card.id);
                setFocus(board.cards.find((item) => item.id !== card.id)?.id ?? "rate");
              }}
            />
          ) : null}
        </div>
      </article>
    </div>
  );
}
