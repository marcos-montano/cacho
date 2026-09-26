# 📋 Cacho Alalay - Step-by-Step Development Plan

This document tracks all features, architectural milestones, and implementation phases. Use this checklist to monitor progress from prototype to fully deployed, production-ready family web application.

---

## 🚦 Status Legend
- [x] **Completed**
- [>] **In Progress**
- [ ] **Pending / Planned**

---

## 🧱 Phase 1: Project Setup, Tooling & Modular Architecture
- [x] Review existing documentation, rules, and prototype (`docs/`)
- [x] Create project `README.md` with stack recommendations, deployment instructions, and game guide
- [x] Create structured `PROJECT_PLAN.md` to track progress
- [x] Initialize modern development environment:
  - [x] Set up `package.json` with TypeScript and Vite
  - [x] Configure `tsconfig.json` and strict type checking
  - [x] Set up test runner (Vitest) with `npm test` / `npm run test:watch`
  - [x] Set up styling structure (Vanilla CSS – foundation in `src/style.css`)
- [x] Establish directory structure:
  - `src/core/` (Game engine, rule validation, scoring)
  - `src/ui/` (Components, animations, modals, sounds)
  - `src/network/` (Local Pass & Play vs. Online synchronization)
  - `public/` (PWA assets, icons, manifest)
  - `tests/` (Unit and integration tests)

---

## 🎲 Phase 2: Core Game Engine & Rule Validation
*Pure TypeScript/JavaScript engine with zero DOM coupling, thoroughly unit tested.*

- [x] **Dice Representation & State Model** (`src/core/types.ts`):
  - [x] 5-die state: values (1–6), kept status, flip status
  - [x] Opposing face mapping: 1↔6, 2↔5, 3↔4
- [x] **Turn Sequence State Machine** (`src/core/engine.ts`):
  - [x] State 1: `INIT` (ready for Roll 1)
  - [x] State 2: `ROLLED_1` (choice: Stand *De Mano* OR select dice to keep and roll Roll 2)
  - [x] State 3: `VOLTEO_MANDATORY` (Roll 2 taken; must flip 1 die)
  - [x] State 4: `VOLTEO_OPTIONAL` (can flip 1 additional die or skip)
  - [x] State 5: `SCORING` (select Taquilla category or Tachar)
  - [x] State 6: `TURN_COMPLETE` (pass turn or declare winner)
- [x] **Scoring Logic & Combinations** (`src/core/scoring.ts`):
  - [x] Numbers: Balas (1s), Tontos (2s), Trenes (3s), Cuadras (4s), Quinas (5s), Senas (6s)
  - [x] Straight (*Escalera*): 1-2-3-4-5, 2-3-4-5-6 (25 pts de mano / 20 pts volteada)
  - [x] Full House (*Full*): 3 of one + 2 of another (35 pts de mano / 30 pts volteada)
  - [x] Four of a Kind (*Póker*): 4 identical dice (45 pts de mano / 40 pts volteada)
  - [x] Five of a Kind (*Grande 1 & 2*): 50 pts each
  - [x] *La Dormida* (Instant Knockout): Five of a kind on Roll 1 immediately wins the match
  - [x] *Tachar* (Scratching): Scoring an "X" (0 pts) on any unassigned category
- [x] **El Volteo logic** (`src/core/volteo.ts`):
  - [x] `invert()` function with full OPPOSITE face map
  - [x] `applyFlip()` with error guards (can't flip same die twice)
  - [x] `canFlip()` guard
  - [x] `enumerateFlipOptions()` for hint system
- [x] **Network adapter scaffold** (`src/network/`):
  - [x] `adapter.ts` — generic `NetworkAdapter` interface
  - [x] `localAdapter.ts` — Pass & Play in-memory event bus
- [x] **Comprehensive Unit Tests (`tests/`)** — **79/79 passing:**
  - [x] `scoring.test.ts` — 34 tests covering all categories, De Mano bonuses, previews, and totals
  - [x] `volteo.test.ts` — 18 tests for OPPOSITE map, invert, applyFlip, canFlip, enumerateFlipOptions
  - [x] `engine.test.ts` — 27 integration tests: phase enforcement, De Mano path, Roll 2 + Volteo, Tachar, turn rotation, La Dormida, game-over, addPlayer, resetMatch

---

## 👧 Phase 3: Kid-Friendly & Educational Mode
*Features specifically designed to help kids understand math, probability, and Bolivian culture.*

- [ ] **Interactive Visual Guide / Hint System:**
  - [ ] Dynamic score previews: Hover/tap dice to see potential score in each open category
  - [ ] "Volteo Assistant": Highlights which die flip unlocks an Escalera or Full House
  - [ ] Probability tips (e.g. "You have a 1 in 6 chance to get Senas!")
- [ ] **Bilingual Language Toggle (EN / ES):**
  - [ ] Display authentic Bolivian vernacular (*Balas, Tontos, Trenes, Cuadras, Quinas, Senas, El Volteo, De Mano, La Dormida*)
  - [ ] Toggleable explanatory subtitles for kids and English-speaking friends
- [ ] **Interactive Rules & Tutorial Walkthrough:**
  - [ ] Illustrated "How to Play" modal with visual examples
  - [ ] Kid-friendly "Quick Practice" mode (play a mock turn with step-by-step instructions)

---

## 🪑 Phase 4: Local Pass & Play Mode (Same Device)
*Optimized for a family sitting around an iPad, tablet, or laptop.*

- [ ] **Tactile UI & Table Experience:**
  - [ ] 3D dice with rolling physics & shadow animations
  - [ ] Green felt tavern surface with wooden cup (*cubilete*) shake animation
  - [ ] Parchment-style traditional 3×3 *Taquilla* scoreboard
- [ ] **Player Management:**
  - [ ] Add 2 to 6 players
  - [ ] Kid-friendly player avatars / colors / customizable names
- [ ] **Turn Handover Screen:**
  - [ ] "Pass the device to [Next Player]" overlay with friendly transition
  - [ ] Clear turn & roll indicator (Roll 1 of 2, Flip 1 of 2)
- [ ] **Celebration & Victory Animations:**
  - [ ] Confetti effect on match win
  - [ ] Special dramatic sound and animation for *La Dormida*
  - [ ] Match leaderboard and score breakdown

---

## 📡 Phase 5: Online Real-Time Multiplayer
*Play across different devices (kids in another room or family in another city).*

- [ ] **Room & Lobby System:**
  - [ ] "Host Game" creates a 4-letter room code (e.g. `ALALAY`)
  - [ ] One-click shareable URL (e.g. `https://domain.com/?room=ALALAY`)
  - [ ] QR code generator so kids can scan with an iPad camera to join in 2 seconds
- [ ] **Realtime State Synchronization:**
  - [ ] Adapter pattern: decouple UI from transport layer (scaffolded in Phase 2)
  - [ ] Integration with serverless realtime provider (Firebase Realtime Database or PeerJS WebRTC)
  - [ ] Smooth remote player dice roll animations
  - [ ] Spectator / multiple player support in the same room
- [ ] **Reconnection & Disconnect Grace:**
  - [ ] Preserve game state in `localStorage`
  - [ ] Auto-reconnect if Wi-Fi drops momentarily

---

## 📱 Phase 6: PWA, Audio & Final Polish
*Make the game feel like a native app with zero installation barriers.*

- [ ] **Web Audio / Tone.js Sound Design:**
  - [ ] Realistic leather cup shake and rattle
  - [ ] Wooden dice clacks and clicks
  - [ ] Scoring chime and victory trumpet fanfare
  - [ ] Mute/unmute persistent toggle
- [ ] **Progressive Web App (PWA):**
  - [ ] `manifest.json` configured with icons, standalone display mode, orientation lock
  - [ ] Service worker for offline caching (works without internet for Pass & Play)
  - [ ] "Add to Home Screen" instructions popup for iOS and Android
- [ ] **Accessibility & Responsiveness:**
  - [ ] Touch gestures optimized for iPad and small phones
  - [ ] High contrast mode for dice pips
  - [ ] Keyboard shortcuts for laptop players (Space = Roll, 1-5 = Select dice)

---

## 🚀 Phase 7: Deployment & Continuous Delivery
*Zero-cost automated deployment pipeline.*

- [ ] Configure production build optimization
- [ ] Setup Cloudflare Pages / GitHub Pages deployment configuration
- [ ] Setup GitHub Actions workflow for automated testing and deployment on `main` push
- [ ] Validate live performance and mobile compatibility across Safari, Chrome, and Edge

---

## 📌 Progress Notes & Changelog
* **2026-09-26 (Session 1):** Reviewed `docs/` folder (HTML prototype, English rules guide, cultural background). Established project `README.md` and detailed `PROJECT_PLAN.md`.
* **2026-09-26 (Session 2):** ✅ Phase 1 complete — Vite + TypeScript scaffold (`npm run dev/build/test`), Vitest, `.gitignore`, full `src/` directory structure, `NetworkAdapter` interface, `LocalAdapter`.
  ✅ Phase 2 complete — `src/core/types.ts` (typed dice/state/events), `src/core/volteo.ts` (El Volteo logic), `src/core/scoring.ts` (all 11 Taquilla categories), `src/core/engine.ts` (full turn state machine with La Dormida). **79/79 unit tests passing.**
