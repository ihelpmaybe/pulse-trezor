/** Visual split of an address for the desk face. */
export function AddrParts({ address }: { address: string }) {
  const a = address.startsWith("0x") ? address : `0x${address}`;
  const body = a.slice(2);
  const head = body.slice(0, 4);
  const mid = body.slice(4, -4);
  const tail = body.slice(-4);
  return (
    <code className="addr-parts" aria-hidden="true">
      <span className="addr-0x">0x</span>
      <span className="addr-ends">{head}</span>
      <span className="addr-mid">
        {[...mid].map((ch, i) => (
          <span
            key={i}
            className={/[a-fA-F]/.test(ch) ? "addr-letter" : "addr-digit"}
          >
            {ch}
          </span>
        ))}
      </span>
      <span className="addr-ends">{tail}</span>
    </code>
  );
}
