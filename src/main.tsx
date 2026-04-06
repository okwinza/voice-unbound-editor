import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { setupTauriHost } from "./lib/host";

document.documentElement.classList.add("dark", "density-cozy");

const BROWSER_MODE = import.meta.env.VITE_BROWSER_MODE === "true";

async function main() {
  if (!BROWSER_MODE) {
    // Tauri build: initialise the TauriHost singleton before React renders
    // so the first getHost() call inside the tree doesn't throw.
    await setupTauriHost();
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void main();
