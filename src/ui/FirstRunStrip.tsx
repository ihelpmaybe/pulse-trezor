/**
 * One-glance first-run path before Connect — connect → bag → optional Sites.
 */
type Props = {
  hasSession: boolean;
  onGotoApps?: () => void;
};

export function FirstRunStrip({ hasSession, onGotoApps }: Props) {
  if (hasSession) return null;

  return (
    <div className="first-run-strip" role="note">
      <p className="first-run-strip-title">First time here</p>
      <ol className="first-run-steps">
        <li>
          <strong>Connect</strong> — Start connection, then Allow in Suite
          (other screen OK)
        </li>
        <li>
          <strong>Bag</strong> — balances show after you’re linked
        </li>
        <li>
          <strong>Apps</strong> — pair a site when you need a dapp
          {onGotoApps ? (
            <>
              {" "}
              <button type="button" className="linkish" onClick={onGotoApps}>
                open Apps
              </button>
            </>
          ) : null}
        </li>
      </ol>
    </div>
  );
}
