/** Compact HEX stake mark on account rows. */
export function HexStakeMark({
  count,
  onOpen,
}: {
  count: number;
  onOpen?: () => void;
}) {
  const label = `${count} HEX stake${count === 1 ? "" : "s"} — open Stakes`;
  return (
    <span
      className="acct-hex"
      title={label}
      aria-label={label}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={
        onOpen
          ? (e) => {
              e.stopPropagation();
              onOpen();
            }
          : undefined
      }
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onOpen();
              }
            }
          : undefined
      }
    >
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <polygon
          points="8,1.1 13.9,4.5 13.9,11.5 8,14.9 2.1,11.5 2.1,4.5"
          fill="#ff3178"
        />
        <text
          x="8"
          y="11"
          textAnchor="middle"
          fontSize="7.2"
          fontWeight="700"
          fill="#fff"
          fontFamily="system-ui,Segoe UI,sans-serif"
        >
          H
        </text>
      </svg>
    </span>
  );
}
