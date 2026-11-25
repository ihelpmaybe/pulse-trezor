# NVDA / VoiceOver — manual acceptance (Desk)

**Not CI.** Run when you want a human screen-reader pass. Contract smoke (`src/a11y/a11y.smoke.test.ts`) only proves labels/live regions still exist in source.

## Setup
- Windows: NVDA + Chrome or Edge on `http://127.0.0.1:5174/` (or preview build)
- macOS later: VoiceOver + Safari (leave OPEN until tried)

## Pass criteria
- [ ] Landmarks / headings: page announces Pulse Perch; Device / bag / actions reachable
- [ ] Connect: **Start connection** / **Stop waiting** / **Disconnect** named; Suite Allow callout readable while connecting
- [ ] First-run strip (before connect): three steps announced
- [ ] Bag tabs: Tokens / NFTs / Activity / Stakes (if module on) — `aria-selected` changes with Tab
- [ ] Action tabs: Send / Swap / Approvals / Apps — panels hide/show without focus trap in the wrong place
- [ ] Send: amount / To fields labeled; **Sign & send** named; Speed up / Cancel when pending
- [ ] Apps: WC pair field / session drop controls named; session request region announced
- [ ] Settings / FAQ modals: Escape closes; Tab cycles inside; focus returns sensibly
- [ ] Errors: `role="alert"` banners spoken; polite status for Suite/RPC cues
- [ ] Privacy hide: address announced as hidden when toggled

## Record
| Date | Reader | Browser | Result |
|------|--------|---------|--------|
| — | — | — | OPEN |

## Kill_if
Claiming “a11y done” from unit smoke alone — NVDA row stays OPEN until a human ticks above.
