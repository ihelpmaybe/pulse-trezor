import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/** Prod always; localhost/dev so Install / PWA can fire without preview-only. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL || "/";
    const swUrl = base.endsWith("/") ? `${base}sw.js` : `${base}/sw.js`;
    void navigator.serviceWorker.register(swUrl, { scope: base }).catch(() => {
      /* offline install optional */
    });
  });
}
