import {
  isShowcase,
  PERCH_INSTALL,
  PERCH_RELEASES,
} from "../showcase";

/** Pages peek — same posture as HEXmob / Heart’s Archive. */
export function ShowcaseBanner() {
  if (!isShowcase()) return null;
  return (
    <div className="showcase-banner" role="status">
      <strong>Showcase only</strong>
      {" — "}
      look around here. Do not Connect a Trezor on GitHub Pages.
      {" "}
      <a href={PERCH_RELEASES} target="_blank" rel="noreferrer">
        Download the Windows zip
      </a>
      {" → "}
      <code>Open-Pulse-Perch.cmd</code>
      {" (localhost) · or "}
      <a href={PERCH_INSTALL} target="_blank" rel="noreferrer">
        INSTALL.md
      </a>
      {" · builders: "}
      <code>npm run dev</code>
      {" on "}
      <code>127.0.0.1</code>.
    </div>
  );
}
