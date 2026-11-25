/**
 * Modular AI policy UI — mount only if the host wants AI tools.
 * User picks capabilities; sign is off unless they turn it on.
 */
import { useEffect, useState } from "react";
import { t } from "../i18n/en";
import {
  type AiPrefs,
  applyAiPrefs,
  loadAiPrefs,
  publishAiBridge,
  saveAiPrefs,
} from "./hooks";

const OPTIONS: {
  key: keyof AiPrefs;
  titleKey: Parameters<typeof t>[0];
  blurbKey: Parameters<typeof t>[0];
  danger?: boolean;
}[] = [
  {
    key: "explainBeforeSign",
    titleKey: "aiExplain",
    blurbKey: "aiExplainBlurb",
  },
  {
    key: "simulateTx",
    titleKey: "aiSimulate",
    blurbKey: "aiSimulateBlurb",
  },
  {
    key: "agentPrepare",
    titleKey: "aiPrepare",
    blurbKey: "aiPrepareBlurb",
  },
  {
    key: "clearSignHints",
    titleKey: "aiClearSign",
    blurbKey: "aiClearSignBlurb",
  },
  {
    key: "allowSign",
    titleKey: "aiSignRequests",
    blurbKey: "aiSignRequestsBlurb",
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
      <p className="muted settings-hint">{t("aiPolicyHint")}</p>
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
                <span className="vision-title">{t(opt.titleKey)}</span>
                <span className="vision-blurb">{t(opt.blurbKey)}</span>
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
