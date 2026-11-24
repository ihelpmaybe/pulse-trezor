import { PulseTrezor } from "./PulseTrezor";

/** Thin standalone shell. Embedders import `PulseTrezor` instead. */
export function App() {
  return (
    <div className="page">
      <header className="hdr">
        <div
          className="hdr-head"
          title="Early preview · signs via Trezor Suite today · transport may change · not official Trezor Pulse support."
        >
          <h1>Pulse Perch</h1>
          <p className="tag">
            Pull up a perch — bag, sign, Apps. MetaMask can fly off.
          </p>
        </div>
      </header>
      <PulseTrezor showTestnet />
    </div>
  );
}
