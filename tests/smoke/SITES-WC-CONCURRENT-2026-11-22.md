# Concurrent WC sessions — 2026-11-22

**Status: PASS**

## Result
- Two SignClients paired on Sites: **Perch Concurrent A** + **Perch Concurrent B**
- Both topics stayed live; session list showed both names
- Script: `scripts/wc-concurrent-sessions-lab.mjs` → `WC_CONCURRENT_OK`

## Fix
- `WcPanel` queues session proposals and sign requests (second does not overwrite first)
- Expired / failed Approve or Reject drops the head so the queue cannot stick

## Notes
- Approve the matching peer name before pairing the next URI
- Stale `proposal id doesn't exist` used to block the queue — cleared on fail
