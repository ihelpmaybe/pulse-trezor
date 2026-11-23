# Gate T Desk re-smoke — Connect 10

date: 2026-11-22 (second pass, post RPC/status/full-bag/theme)  
path: Connect 10 → Suite Desktop WS `:21335` → trezor-user-env emu (dont-pretend)  
Desk: http://127.0.0.1:5174/

| # | Step | Pass? | Note |
|---|------|-------|------|
| 1 | Warm Connect 10 + Suite WS | YES | Suite :21335 · Bridge proxy :21325 |
| 2 | Address on device matches Desk | YES | `0x73d0385F4d8E00C5e6504C6030F47BF6212736A8` |
| 3 | Balance fetch (testnet) | YES | ~`9.475 tPLS` · status `● Testnet active` |
| 4 | Send dust PLS on **testnet 943** | YES | self-send `0.01` · [tx](https://scan.v4.testnet.pulsechain.com/tx/0xb3751152253dc65d003886712d476baa300e1803a08c0882354c4573f62d4c37) · script exit 5 false-fail (short hash) — detector fixed |
| 5 | Disconnect → watch-only | YES | address + balance remain; send locked; Connect button back |
| 6 | Mainnet cores | YES | status `● PulseChain active` · WPLS/HEX/PLSX/INC/USDC tiles |
| 7 | RPC down detection | YES | `http://127.0.0.1:1` → `disconnected · RPC down` |
| 8 | Load full bag | YES* | After fail-soft: `Extra tokens 1 · NFTs 0 · HEX stakes 0`. Earlier PulseScan **502** hard-failed whole bag — fixed with `Promise.allSettled` |

emu firmware: Model T **`2-main`**  
seed: `all`×12  

## Follow-ups (not blockers for preview)
- Suite probe still shows “open Trezor Suite” while session works (stale probe UX)
- PulseScan can 502 — bag now partial; stakes path independent
- Cancel-on-device / Suite-killed path not re-exercised this pass
