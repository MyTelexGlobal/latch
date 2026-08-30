/**
 * LATCH — shared-authority deal board.
 * Submission for the OpenAI WebMCP Challenge (2026): https://webmcp.devpost.com/
 * Author: Yury Myshinskiy
 * Email: hackaton@telex.global
 * The page publishes live tools via document.modelContext.registerTool.
 * License: MIT
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
