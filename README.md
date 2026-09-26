# 🎲 Cacho Alalay - Bolivian Dice Game

> A modern, kid-friendly, cross-device web implementation of **Cacho Alalay**, the quintessential traditional dice game of Bolivia. Play together on the same screen (Pass & Play) or online across phones, tablets, and laptops—100% free and installable with zero app store friction.

---

## 📖 Table of Contents
- [About the Game & Cultural Heritage](#-about-the-game--cultural-heritage)
- [Project Vision & Goals](#-project-vision--goals)
- [Recommended Technology Stack & Rationale](#-recommended-technology-stack--rationale)
- [Best Free Cloud Deployment Options](#-best-free-cloud-deployment-options)
- [Multiplayer Architecture (Online & Pass & Play)](#-multiplayer-architecture)
- [Quick Start & Local Development](#-quick-start--local-development)
- [PWA: Installing as an App on iPad, iPhone & Android](#-pwa-installing-as-an-app-on-kids-devices)
- [Project Structure & Modular Architecture](#-project-structure--modular-architecture)
- [Game Rules & Bilingual Glossary Quick-Ref](#-game-rules--bilingual-glossary-quick-ref)
- [Development Plan & Progress Tracker](#-development-plan--progress-tracker)

---

## 🇧🇴 About the Game & Cultural Heritage

**Cacho** (specifically *Cacho Alalay*) is a beloved social institution in Bolivia, played across Cochabamba, La Paz, Sucre, and Santa Cruz with leather cups (*cubiletes*) and five dice.

### What makes Cacho unique?
1. **The Cubilete & Two Rolls:** A player gets up to two rolls. Standing on Roll 1 is called ***De Mano*** and awards a **+5 bonus** for special hands.
2. **El Volteo (The Die Flip):** If you take the 2nd roll, you **must flip 1 die** to its mathematical opposite ($1 \leftrightarrow 6$, $2 \leftrightarrow 5$, $3 \leftrightarrow 4$) and may optionally flip a second die. This turns chance into strategy and mental math!
3. **La Taquilla (The 3×3 Grid):** 
   - Left: **Chicos** (Balas=1s, Tontos=2s, Trenes=3s)
   - Center: **Juegos** (Escalera, Full, Póker)
   - Right: **Grandes** (Cuadras=4s, Quinas=5s, Senas=6s)
   - Bottom: **Grande 1 & Grande 2** (Five of a kind)
4. **La Dormida ("The Knockout"):** Rolling a 5-of-a-kind on the very first roll (*Grande de Mano*) instantly wins the entire match!

---

## 🎯 Project Vision & Goals

- 👨‍👩‍👧‍👦 **Family & Kids First:** An intuitive, delightful interface designed to teach kids math, strategy, and probability while preserving Bolivian culture.
- 📱 **Dual Play Modes:**
  - **Same Device (Pass & Play):** Seamless turn transitions on an iPad, tablet, or laptop sitting on the living room table.
  - **Online Multiplayer:** Kids or distant family join via a shareable room link or QR code with real-time turn synchronization.
- 🎓 **Educational / Learning Mode:** Visual hints showing possible moves, math previews ("flipping 2 gives 5"), and rule tooltips.
- ⚡ **Zero-Install PWA:** Opens instantly in any browser; can be added to home screens as a full-screen app.
- 🧼 **Clean, Modular Codebase:** Strict separation between the game engine (pure logic & rules), rendering/UI, sound effects, and networking, making it easy to test, extend, and maintain.

---

## 🛠️ Recommended Technology Stack & Rationale

After evaluating simplicity, cost, performance, and long-term maintainability:

| Layer | Recommended Choice | Why It's the Best Choice |
| :--- | :--- | :--- |
| **Language** | **TypeScript** | Catch scoring bugs at compile time; strictly typed dice states, turn phases, and scorecards make rule verification robust. |
| **Build Tool & Bundler** | **Vite** | Blazing-fast development server, instant hot module reload, minimal config, and lightweight production bundle. |
| **UI & Styling** | **Vanilla CSS + Modern Tokens** | Zero heavy runtime dependencies, maximum custom styling (wooden tavern felt, tactile 3D dice, rich animations), works on low-power tablets. |
| **Audio** | **Web Audio API / Tone.js** | Procedural dice shaking, wooden cup clicks, and celebratory fanfares without downloading heavy audio assets. |
| **Hosting** | **Cloudflare Pages / GitHub Pages / Vercel** | **100% Free forever**, global edge CDN, zero cold start delays, automatic SSL, and instant CI/CD. |
| **Realtime Multiplayer** | **Firebase Realtime DB** or **PeerJS (WebRTC)** | Serverless real-time state synchronization with zero server maintenance and free tier coverage. |

---

## ☁️ Best Free Cloud Deployment Options

You do not need paid servers or complex containers. This game compiles down to lightweight static assets.

### Option 1: Cloudflare Pages (⭐️ Recommended)
- **Why:** Unlimited bandwidth, instant cache invalidation, sub-second global latency, custom domains, 100% free forever.
- **Deploy via Git (Automated):**
  1. Push this repository to GitHub or GitLab.
  2. In Cloudflare Dashboard $\rightarrow$ **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git**.
  3. Set:
     - **Build command:** `npm run build`
     - **Build output directory:** `dist`
  4. Click **Save and Deploy**. Every `git push` automatically redeploys your game!
- **Deploy via CLI:**
  ```bash
  npm run build
  npx wrangler pages deploy dist --project-name=cacho-boliviano
  ```

### Option 2: GitHub Pages
- **Why:** Integrated directly into your repository with zero third-party accounts.
- **Setup:**
  1. Add a GitHub Actions workflow in `.github/workflows/deploy.yml`:
     ```yaml
     name: Deploy to GitHub Pages
     on:
       push:
         branches: [main]
     jobs:
       build-and-deploy:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
           - uses: actions/setup-node@v4
             with:
               node-version: 20
           - run: npm ci && npm run build
           - uses: peaceiris/actions-gh-pages@v4
             with:
               github_token: ${{ secrets.GITHUB_TOKEN }}
               publish_dir: ./dist
     ```
  2. Under repository **Settings $\rightarrow$ Pages**, set Source to `gh-pages` branch.

### Option 3: Vercel / Netlify
- Import your repository into [Vercel](https://vercel.com) or [Netlify](https://netlify.com); Vite projects are auto-detected with zero configuration.

---

## 🌐 Multiplayer Architecture

```
                      ┌───────────────────────────────────────┐
                      │            Game Architecture          │
                      └──────────────────┬────────────────────┘
                                         │
               ┌─────────────────────────┴─────────────────────────┐
               ▼                                                   ▼
     [ Pass & Play Mode ]                                [ Online Room Mode ]
  • Single Device (iPad/Laptop)                       • Cross-device via Room Code
  • Local state engine                                • Lightweight sync:
  • Turn indicator & pass modal                         - Host creates room code
                                                        - Realtime sync (Firebase/PeerJS)
                                                        - Deterministic state patch
```

1. **Pass & Play (Local):**
   - Active player holds device, rolls, flips, and marks score.
   - Screen shows a friendly "Pass to [Next Player]" transition screen.
   - No internet required (works on road trips, camping, and airplanes).

2. **Online Multiplayer (Serverless):**
   - Host generates a 4-letter room code (e.g. `CACH-77`).
   - Kids scan a QR code or click the invite link.
   - Game state changes (dice rolled, dice kept, volteo flips, score selections) emit lightweight event payloads:
     ```json
     {
       "type": "ROLL_DICE",
       "keptIndices": [0, 2],
       "newDice": [6, 4, 6, 2, 5],
       "rollNumber": 2
     }
     ```

---

## 🚀 Quick Start & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm`

### Installation & Run
```bash
# Clone the repository
git clone https://github.com/your-username/cacho.git
cd cacho

# Install dependencies
npm install

# Start local development server with Hot Module Reload
npm run dev

# Open your browser at http://localhost:5173
```

### Build & Preview
```bash
# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

### Run Tests
```bash
# Run unit tests for Cacho rules and scoring engine
npm test
```

---

## 📲 PWA: Installing as an App on Kids' Devices

No App Store or Google Play account required!

- **iPad / iPhone (Safari):**
  1. Open your deployed URL.
  2. Tap the **Share** button ($\uparrow$ box icon).
  3. Tap **Add to Home Screen**.
  4. The game opens full screen without browser bars.
- **Android (Chrome):**
  1. Open your URL.
  2. Tap the menu ($\vdots$) $\rightarrow$ tap **Install App** or **Add to Home Screen**.
- **Chromebook / Mac / Windows (Chrome/Edge):**
  1. Click the **Install** icon on the right side of the address bar.

---

## 📂 Project Structure & Modular Architecture

```text
cacho/
├── docs/                          # Original documentation & prototype
│   ├── cacho_boliviano.html       # Standalone HTML prototype
│   ├── cacho_deployment_...md     # English rules & deployment background
│   └── info.md                    # Historical notes
├── public/                        # Static assets (icons, manifest, sound effects)
│   ├── favicon.ico
│   ├── manifest.json              # PWA manifest for home screen install
│   └── icons/                     # App icons (192x192, 512x512)
├── src/
│   ├── core/                      # Pure Game Logic (Zero DOM dependencies)
│   │   ├── engine.ts              # Turn state machine & roll coordinator
│   │   ├── scoring.ts             # Combinations: Escalera, Full, Poker, Grande
│   │   ├── volteo.ts              # Inversion logic ($7 - n$) & rule checks
│   │   └── types.ts               # State, Player, Die, Category interfaces
│   ├── ui/                        # Presentation & Components
│   │   ├── components/            # Felt board, dice rack, taquilla scoreboard
│   │   ├── animations/            # Dice tumble, flip 3D transitions
│   │   ├── sound/                 # Procedural Tone.js / Web Audio manager
│   │   └── hints/                 # Educational helper & probability hints
│   ├── network/                   # Multiplayer Sync
│   │   ├── adapter.ts             # Generic sync interface (Local vs Online)
│   │   ├── localAdapter.ts        # Pass & Play implementation
│   │   └── realtimeAdapter.ts     # Firebase / WebRTC room implementation
│   ├── index.html                 # Main web entrypoint
│   └── main.ts                    # App bootstrap & event wiring
├── tests/                         # Automated Unit Tests
│   ├── scoring.test.ts            # Scoring combos, De Mano bonuses
│   ├── volteo.test.ts             # Mandatory & optional flip logic
│   └── dormida.test.ts            # Instant knockout rules
├── package.json
├── tsconfig.json
├── vite.config.ts
├── PROJECT_PLAN.md                # Interactive implementation checklist
└── README.md
```

---

## 📜 Game Rules & Bilingual Glossary Quick-Ref

| Term (ES) | English Term | Category | Points (De Mano / Volteada) |
| :--- | :--- | :--- | :--- |
| **Balas** | Ones (1s) | Chicos | Sum of all 1s (Max 5) |
| **Tontos** | Twos (2s) | Chicos | Sum of all 2s (Max 10) |
| **Trenes** | Threes (3s) | Chicos | Sum of all 3s (Max 15) |
| **Cuadras** | Fours (4s) | Grandes | Sum of all 4s (Max 20) |
| **Quinas** | Fives (5s) | Grandes | Sum of all 5s (Max 25) |
| **Senas** | Sixes (6s) | Grandes | Sum of all 6s (Max 30) |
| **Escalera** | Straight (1-2-3-4-5 / 2-3-4-5-6) | Juegos | **25 pts** / **20 pts** |
| **Full** | Full House (3 of one + 2 of another) | Juegos | **35 pts** / **30 pts** |
| **Póker** | Four of a Kind (4 identical dice) | Juegos | **45 pts** / **40 pts** |
| **Grande 1 & 2** | Five of a Kind | Bottom | **50 pts** each |
| **La Dormida** | Five of a Kind on Roll 1 | Knockout | **Instant Match Victory** |
| **El Volteo** | Die Flip (Mandatory 1st, Optional 2nd) | Mechanic | Opposite side ($7 - \text{face}$) |
| **Tachar** | Scratch / Strikeout | Move | Mark an "X" for 0 points |

---

## 📋 Development Plan & Progress Tracker

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the live step-by-step implementation checklist tracking covered features and pending tasks.
