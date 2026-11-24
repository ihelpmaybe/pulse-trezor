/**
 * Tiny SVG mark for an account row (shape + color).
 */
import {
  markColorHex,
  type AccountMark,
  type AccountMarkShape,
} from "../chain/accountMarks";

function shapePath(shape: AccountMarkShape): string {
  switch (shape) {
    case "circle":
      return "";
    case "square":
      return "M3 3h10v10H3z";
    case "diamond":
      return "M8 1.5 L14.5 8 L8 14.5 L1.5 8 Z";
    case "triangle":
      return "M8 2 L14 13.5 H2 Z";
    case "hex":
      return "M8 1.2 L13.8 4.5 L13.8 11.5 L8 14.8 L2.2 11.5 L2.2 4.5 Z";
    case "star":
      return "M8 1.4 L9.7 5.8 L14.4 6.1 L10.7 9.2 L11.9 13.8 L8 11.4 L4.1 13.8 L5.3 9.2 L1.6 6.1 L6.3 5.8 Z";
  }
}

export function AccountMarkIcon({
  mark,
  size = 12,
}: {
  mark: AccountMark;
  size?: number;
}) {
  const fill = markColorHex(mark.color);
  const d = shapePath(mark.shape);
  return (
    <svg
      className="acct-mark-icon"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
    >
      {mark.shape === "circle" ? (
        <circle cx="8" cy="8" r="6" fill={fill} />
      ) : (
        <path d={d} fill={fill} />
      )}
    </svg>
  );
}
