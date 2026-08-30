/**
 * LATCH — shared-authority deal board.
 * Submission for the OpenAI WebMCP Challenge (2026): https://webmcp.devpost.com/
 * Author: Yury Myshinskiy
 * Email: hackaton@telex.global
 * The page publishes live tools via document.modelContext.registerTool.
 * License: MIT
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addOpinion,
  applyChange,
  clearObject,
  commitDeal,
  createIdleBoard,
  dropOpinion,
  holdCard,
  loadScenario,
  moveCard,
  objectCard,
  rejectPending,
  releaseCard,
  setBrief,
  setCardBody,
  setCardNote,
  setCardTitle,
  startScenario,
  writableCardIds,
  type Board,
} from "./board";
import { Console } from "./skins/Console";
import { Focus } from "./skins/Focus";
import {
  DealButtons,
  OpenMark,
  ObjectDraftProvider,
  PromptCopies,
  SKINS,
  THEMES,
  ThemeGlyph,
  type BoardActions,
  type SkinId,
  type ThemeId,
} from "./skins/shared";
import { Sheet } from "./skins/Sheet";
import { listAgentHands, syncWebmcp, webmcpAvailable } from "./webmcp";

const SKIN_KEY = "latch-skin-v2";
const THEME_KEY = "latch-theme";

function readSkin(): SkinId {
  const saved = localStorage.getItem(SKIN_KEY);
  if (saved === "sheet" || saved === "console" || saved === "focus") return saved;
  return "console";
}

function readTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "day" || saved === "night") return saved;
  return "day";
}

export function App() {
  const [board, setBoard] = useState<Board>(() => createIdleBoard());
  const [skin, setSkin] = useState<SkinId>(readSkin);
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const boardRef = useRef(board);
  boardRef.current = board;

  const hands = useMemo(() => listAgentHands(board), [board]);
  const writeCount = writableCardIds(board).length;
  const [available, setAvailable] = useState(() => webmcpAvailable());

  useEffect(() => {
    localStorage.setItem(SKIN_KEY, skin);
  }, [skin]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();
    void syncWebmcp(
      { getBoard: () => boardRef.current, setBoard },
      controller.signal,
      () => setAvailable(true),
    ).catch((error: unknown) => {
      console.warn("WebMCP register failed", error);
    });
    return () => controller.abort();
  }, []);

  const actions: BoardActions = {
    start: () => setBoard(startScenario(board)),
    commit: () => {
      if (!board.started || board.committed) return;
      if (window.confirm("Commit this deal and freeze the board?")) {
        setBoard(commitDeal(board, "you"));
      }
    },
    hold: (id) => setBoard(holdCard(board, id, "you")),
    release: (id) => setBoard(releaseCard(board, id, "you")),
    object: (id, veto) => setBoard(objectCard(board, id, veto, "you")),
    clearObject: (id) => setBoard(clearObject(board, id, "you")),
    reject: (id) => setBoard(rejectPending(board, id, "you")),
    apply: (id) => {
      const card = board.cards.find((item) => item.id === id);
      if (!card?.pending) return;
      setBoard(applyChange(board, id, card.pending, "you"));
    },
    brief: (text, log) => setBoard(setBrief(board, text, log)),
    note: (id, text, log) => setBoard(setCardNote(board, id, text, log)),
    add: () => {
      const next = addOpinion(board);
      setBoard(next.board);
      return next.id;
    },
    drop: (id) => setBoard(dropOpinion(board, id)),
    title: (id, text, log) => setBoard(setCardTitle(board, id, text, log)),
    body: (id, text, log) => setBoard(setCardBody(board, id, text, log)),
    move: (id, beforeId) => setBoard(moveCard(board, id, beforeId)),
  };

  const body = {
    sheet: (
      <Sheet
        board={board}
        hands={hands}
        available={available}
        writeCount={writeCount}
        actions={actions}
      />
    ),
    console: (
      <Console
        board={board}
        hands={hands}
        available={available}
        writeCount={writeCount}
        actions={actions}
      />
    ),
    focus: (
      <Focus
        key={board.events[0]?.id ?? board.scenario}
        board={board}
        hands={hands}
        available={available}
        writeCount={writeCount}
        actions={actions}
      />
    ),
  }[skin];

  return (
    <div className="app" data-skin={skin} data-theme={theme}>
      <div className="switcher">
        <div className="view-tabs" role="tablist" aria-label="Board view">
          {SKINS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={skin === item.id}
              title={item.hint}
              className={skin === item.id ? "is-on" : ""}
              onClick={() => setSkin(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <PromptCopies
          active={board.scenario}
          onLoad={(id) => setBoard(loadScenario(id))}
        />
        <div className="switcher-end">
          <OpenMark board={board} writeCount={writeCount} />
          <DealButtons board={board} actions={actions} />
          <div className="theme-tabs" role="group" aria-label="Theme">
          {THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-pressed={theme === item.id}
              title={item.label}
              className={theme === item.id ? "is-on" : ""}
              onClick={() => setTheme(item.id)}
            >
              <ThemeGlyph id={item.id} />
            </button>
          ))}
          </div>
        </div>
      </div>
      <ObjectDraftProvider>{body}</ObjectDraftProvider>
    </div>
  );
}
