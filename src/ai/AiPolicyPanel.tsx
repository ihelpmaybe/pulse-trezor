/**
 * Modular AI policy UI — mount only if the host wants AI tools.
 * User picks capabilities; sign is off unless they turn it on.
 */
import { useEffect, useState } from "react";
import {
  type AiPrefs,
  applyAiPrefs,
  loadAiPrefs,
  publishAiBridge,
  saveAiPrefs,
} from "./hooks";

const OPTIONS: {
  key: keyof AiPrefs;
  title: string;
  blurb: string;
  danger?: boolean;
}[] = [
  {
    key: "explainBeforeSign",
    title: "Explain",
    blurb: "Plain English before sign",
  },
  {
    key: "simulateTx",
    title: "Simulate",
    blurb: "Dry-run when possible",
  },
  {
    key: "agentPrepare",
    title: "Prepare",
    blurb: "Draft unsigned payloads",
  },
  {
    key: "clearSignHints",
    title: "Clear-sign",
    blurb: "Extra human warnings",
  },
  {
    key: "allowSign",
    title: "Sign requests",
    blurb: "Agent may ask — you confirm on device",
    danger: true,
  },
];

type Props = {
  /** Hide the section heading (when parent already labels it). */
  hideTitle?: boolean;
  className?: string;
};

export function AiPolicyPanel({ hideTitle = false, className }: Props) {
  const [prefs, setPrefs] = useState<AiPrefs>(() => loadAiPrefs());

  useEffect(() => {
    const p = loadAiPrefs();
    applyAiPrefs(p);
    publishAiBridge(p);
    setPrefs(p);
  }, []);

  function patch(partial: Partial<AiPrefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      saveAiPrefs(next);
      applyAiPrefs(next);
      publishAiBridge(next);
      return next;
    });
  }

  return (
    <div className={["ai-policy", className].filter(Boolean).join(" ")}>
      {!hideTitle ? <h4 className="settings-section">Agent policy</h4> : null}
      <p className="muted settings-hint">
        Allow-list for agents via window.__pulsePerchAi. Denied calls throw.
        Your Send button and Apps are separate. Keys stay on the device.
      </p>
      <div className="vision-grid" role="group" aria-label="Agent policy">
        {OPTIONS.map((opt) => {
          const on = prefs[opt.key];
          return (
            <button
              key={opt.key}
              type="button"
              className={[
                "vision-tile",
                on ? "on" : "",
                opt.danger ? "danger" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={on}
              onClick={() => patch({ [opt.key]: !on })}
            >
              <span className="vision-copy">
                <span className="vision-title">{opt.title}</span>
                <span className="vision-blurb">{opt.blurb}</span>
              </span>
              <span className="vision-switch" aria-hidden="true">
                <span className="vision-knob" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
