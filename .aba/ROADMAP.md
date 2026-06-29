# MVC Portfolio Manager — Living Roadmap

---
name: MVC Portfolio Manager
kind: in process
status_line: Five-tab React app live on GitHub Pages; backend/infrastructure scaffolded but not wired to frontend; resort database and arbitrage engine not yet built
phase: 4 — Data & Intelligence Layer
owner: Jim
last_updated: 2026-06-20
reconciled_sha: da63f3b
---

## End State

A fully deployed, multi-user capable web app that helps Dave and the family optimize MVC points allocation across all contracts — balancing personal travel against rental revenue with yield-maximizing arbitrage recommendations. Market Intelligence and Optimizer tabs are powered by live resort data and real pricing. Optional auth allows Dave independent access without Jim as intermediary.

## End-State Visual

```mermaid
flowchart LR
  P1[1 · Foundation\nReact shell + tabs] --> P2[2 · Historical Data\nSchedule 2018–2025]
  P2 --> P3[3 · Backend Scaffold\nAurora + API Gateway]
  P3 --> P4:::current
  P4[4 · Data & Intelligence\nResort DB + Arbitrage] --> P5[5 · Live Pricing\nCloudflare proxy]
  P5 --> P6[6 · Multi-user Auth\nDave self-serve]
  P6 --> P7([Done Enough])

  classDef current fill:#f5a623,color:#000,font-weight:bold
```

## Phases

| Phase | Objective | Definition of Done | Status |
|---|---|---|---|
| 1 · Foundation | React shell, all 5 tabs render, GitHub Pages deploy | Live at jdistelrath.github.io/mvc-portfolio | ✅ Done |
| 2 · Historical Data | Wire 2018–2025 schedule data | `src/data/historicalSchedule.ts` populated, Schedule tab functional | ✅ Done |
| 3 · Backend Scaffold | Aurora Postgres + API Gateway infrastructure | Backend and infrastructure folders committed @ da63f3b | ✅ Done |
| 4 · Data & Intelligence Layer | Resort database + Arbitrage Mode in Optimizer | `src/data/resortDatabase.ts` complete; Optimizer surfaces yield-ranked recommendations | 🔄 In Progress |
| 5 · Live Pricing | Cloudflare Worker proxy for real-time point valuations | Market Intelligence tab pulling live data | 🔲 Planned |
| 6 · Multi-user Auth | Dave can log in independently | Auth flow live; Dave onboarded | 🔲 Planned |

## In Flight

| Item | Owner | Pointer | Status |
|---|---|---|---|
| Resort database build | Jim | `src/data/resortDatabase.ts` (not yet created) | Not started |
| 2026 Abound points chart data entry | Jim | `C:\Users\jdistelrath\Documents\mvc-portfolio\src\data\` | Not started |
| Arbitrage Mode — Optimizer tab | Jim | `src/` Optimizer component | Not started |
| Market Intelligence upgrades | Jim | Market Intelligence tab component | Blocked on resort DB |
| Backend ↔ frontend wiring | Jim | `backend/` + `src/` API integration | Planned post-resort DB |
| CI fix — deprecated Node runtimes | Jim | `.github/workflows/` @ da63f3b | ❌ Failing |

## Current Blockers

| Blocker | Blocks | Severity | Pointer |
|---|---|---|---|
| CI pipeline failing on deprecated Node runtimes | Automated deploys unreliable | Medium | `.github/workflows/` @ da63f3b |
| No resort database populated | Arbitrage Mode, Market Intelligence upgrades, backend wiring | High | `src/data/resortDatabase.ts` — file does not exist |

## Pre-Planned Mitigations

| Foreseeable blocker | When it bites | Response | Pointer |
|---|---|---|---|
| Abound points chart changes annually | Phase 4 data entry + every Jan | Version the points data by year in `resortDatabase.ts` | _none_ |
| Cloudflare Worker CORS / rate limits | Phase 5 | Design proxy with caching layer; fall back to cached weekly snapshot | _none_ |
| TypeScript module resolution errors | Any new data file addition | Inline interfaces in data file, not separate types file (established pattern) | `src/data/historicalSchedule.ts` |
| HashRouter requirement for GitHub Pages | Any routing change | Never revert to BrowserRouter | `src/` router config |

## Deferred / Decided

| Item | Decision | Date |
|---|---|---|
| Multi-user auth | Deferred to Phase 6 — optional, not blocking core value | Pre-2026 |
| BrowserRouter → HashRouter | Permanent — required for GitHub Pages; do not revert | Pre-2026 |
| Types in separate file vs. inlined | Inline in data file — module resolution fix | Pre-2026 |
| Dual Claude instance setup | Windows Sandbox on Win 11 Pro — decided, not yet executed | 2026 |
