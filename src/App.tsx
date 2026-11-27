import { PulseTrezor } from "./PulseTrezor";
import { isShowcase } from "./showcase";
import { OfflineBanner } from "./ui/OfflineBanner";
import { ShowcaseBanner } from "./ui/ShowcaseBanner";

/** Thin standalone shell. Embedders import `PulseTrezor` instead. */
export function App() {
  const showcase = isShowcase();
  return (
    <div className="page">
      <ShowcaseBanner />
      <OfflineBanner />
      <header className="hdr">
        <div
          className="hdr-head"
          title={
            showcase
              ? "Showcase peek — download the zip or run locally to Connect a Trezor."
              : "Early preview · signs via Trezor Suite today · transport may change · not official Trezor Pulse support."
          }
        >
          <h1>Pulse Perch</h1>
          <p className="tag">
            {showcase
              ? "Showcase peek — bag UI for looking. Connect only on localhost / zip."
              : "Pull up a perch — bag, sign, Apps. MetaMask can fly off."}
          </p>
        </div>
      </header>
      <PulseTrezor showTestnet />
    </div>
  );
}
