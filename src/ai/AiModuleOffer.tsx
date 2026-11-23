/**
 * Core face never embeds AI policy tiles.
 * This strip only points at the GitHub module + one-click Install.
 * Hosts that want the UI: npm the package and mount `AiPolicyPanel` themselves.
 */
const AI_MODULE_GITHUB =
  "https://github.com/ihelpmaybe/pulse-trezor/tree/main/src/ai";

const INSTALL_CMD =
  "npm i github:ihelpmaybe/pulse-trezor  # then mount AiPolicyPanel";

type Props = {
  className?: string;
};

export function AiModuleOffer({ className }: Props) {
  async function onInstall() {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
    } catch {
      /* ignore */
    }
    window.open(AI_MODULE_GITHUB, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={["ai-module-offer", className].filter(Boolean).join(" ")}>
      <h4 className="settings-section">AI module</h4>
      <p className="muted settings-hint">
        Optional add-on — not included. Install from GitHub, then pick what
        agents may do (including sign, if you allow it).
      </p>
      <div className="ai-module-actions">
        <a
          className="btn ghost"
          href={AI_MODULE_GITHUB}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <button type="button" className="btn" onClick={onInstall}>
          Install
        </button>
      </div>
    </div>
  );
}
