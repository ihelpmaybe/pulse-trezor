# Build efficiency — reduce tokens, no redo

For humans and AI (@ihelpmaybe, @togosh). **Forward-looking once > re-explaining forever.**

---

## Hard rules

1. **One source of truth** — shared token/RPC/registry packs live in `pulse-trezor-platform` (SYNC4). Apps **consume**; don’t fork copies per repo.
2. **Don’t rebuild Tip inside Desk** — Tip = soft mobile; Desk = HWW. Integrate via SYNC.
3. **Don’t redistribute / re-implement Suite** — Desk is the product; Suite track = gap map + upstream only.
4. **Reuse before invent** — Connect patterns from pulse-publish / pqq-wallet; rescue contract from vault; EIP-681 from existing repos.
5. **Ship order beats curiosity** — next unchecked item in **this repo’s TODO ship order**. No parallel greenfield.
6. **Tick the box** — when done, update TODO in the same PR. Unchecked = unfinished; don’t re-discover.
7. **Gate T evidence once** — write smoke/fuzz/pen so the next agent **runs** them, doesn’t redesign the bar.
8. **Thin vertical slice** — A0→A1 happy path before fee UI polish, WC, MPC, iOS, PQ.
9. **Context diet for AI** — load only: `AGENTS.md` → `TODO.md` → `NOTES.md` (repo) → maybe HELPFUL-NOTES *section*. Do **not** reload END-TO-END + ROADMAP + ADOPTION + ACCEPTANCE every turn unless the task is planning.
10. **No re-audit loops** — ACCEPTANCE / ADOPTION / TESTING are settled until a Gate fails; don’t re-litigate “is Suite open source?”

---

## Shared layers (build these first — amortize tokens)

| Shared artifact | Consumers | Avoids |
|-----------------|-----------|--------|
| Token + RPC JSON pack | Tip, Desk, guides | N× hardcoded lists |
| Watch-only registry schema | Tip, Desk SYNC | N× export formats |
| Connect warm/sign helpers | Desk, later Tip HWW | Rewriting Bridge/gesture bugs |
| Indexer/history adapter | Tip, Desk | Two history stacks |
| Threat model + pen templates | all | Rewriting pen every release |
| EIP-681 / deep-link spec | Tip, Ext, Desk, badge | Divergent pay links |
| “Works on Pulse” badge URLs | creators, guides | One-off marketing HTML |

**Rule:** if two apps need it, it belongs in **platform** (or a tiny shared package), not copy-paste.

---

## What “done” means (stop redoing)

| Claim | Stop when |
|-------|-----------|
| Connect works | Smoke: derive + sign testnet once + CI |
| Pulse in firmware | Documented upstream 369 — don’t “add Pulse” again |
| Suite gap known | GAP-MAP filled once; only refresh on upstream release |
| E2E planned | ROADMAP + ACCEPTANCE exist — execute, don’t replan |
| Adoption ideas | ADOPTION.md — implement P0 after Gate 1, don’t expand endlessly |

---

## AI session playbook (cheap)

```
1. Open the ONE repo that owns the task
2. Read AGENTS.md (this points at TODO)
3. Read TODO.md — pick first unchecked in ship order
4. Skim repo NOTES.md only if blocked
5. Implement smallest slice that ticks that box
6. Add/run the matching smoke (or note manual evidence path)
7. Check the box / PR
8. Stop — don’t “also improve” adjacent epics
```

**Refuse:** re-deriving architecture, re-listing all repos, re-writing TESTING.md, building MPC/iOS/PQ while A0–A1 open.

---

## Anti-patterns (token burn)

- Re-explaining T-RSL / Pulse-in-FW every chat  
- New wallet UI framework  
- Second soft Android wallet  
- Suite fork “for users”  
- Per-app token lists  
- Full END-TO-END reread for a button fix  
- Expanding GROWTH before Gate 1 smoke  
- Custom FW before Desk send works  

---

## Forward-looking defaults

- **Windows Desk A0–A1** first (proves Connect+Pulse)  
- **SYNC schema** early (even stub) so Tip/Desk don’t diverge  
- **Testnet 943** for smoke (cheap, repeatable)  
- **One swap venue**  
- **Docs as you ship** (one guide per Gate), not a docs rewrite  
- **togosh / AI:** same TODO, same rules — parallelize *different* TODO rows, not the same feature twice  

---

## Conflict

If a flashy idea fights this file, **this file wins** until owner overrides in chat.
