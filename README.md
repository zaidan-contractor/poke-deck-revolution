# Poké Deck Revolution

> **Bring your physical Pokémon cards to life in retro Game Boy Advance-style battles.**

**Poké Deck Revolution** is an open-source, local-network card digitization and battle simulator. It bridges physical Pokémon trading cards into a digital arena: your smartphone acts as an optical scanner via camera and computer vision, while your computer serves as the retro GBA-styled battle console.

---

## 🎮 Concept & User Experience

1. **Local Wi-Fi Pairing**: Launch the server on your computer (`http://localhost:3000`). A dynamic QR code pairs your smartphone over your local Wi-Fi network without third-party accounts or mobile app installs.
2. **Optical Card Scanning**: Point your smartphone camera at physical Pokémon cards. An automated canvas pipeline crops the header (name/HP) and footer (collector number), applying contrast enhancements for optical recognition.
3. **Hybrid AI & Computer Vision**: Scanned cards are analyzed via Google Gemini Multimodal Vision API, with automatic offline fallback to local Tesseract.js OCR and a 1,025-species Pokémon dictionary.
4. **3-Tier Card Engine**:
   - **Tier 1 (Official Match)**: Recognized against the official Pokémon TCG database. Gold and metallic counterfeits are identified and mapped back to their original official prints.
   - **Tier 2 (Adapted Match)**: If a card features an official Pokémon with a swapped rule-box suffix (e.g. EX ➔ GX), stats and rule-boxes are adapted dynamically.
   - **Tier 3 (Fan-Art / Custom)**: If a card is purely fan-made with nonexistent stats (e.g., custom Aegislash GX), the engine synthesizes a playable card from extracted camera art and printed attacks.
5. **Digitize Animation & Album**: Cards arrive in real time on the computer screen with a particle digitization effect, persisting into a local collection album.
6. **Retro GBA Battles**: Select rosters (1 to 6 Pokémon) and battle in a local 2-player arena styled after Pokémon FireRed / LeafGreen.

---

## ⚡ Current Features

### Fully Implemented
- **Device-to-Device Input**: Smartphone-to-computer pairing via Socket.IO and dynamic LAN QR codes.
- **Dual-Path Card Delivery**: WebSockets with an automatic HTTP POST fallback (`/api/phone-scan`) to prevent mobile background tab sleep drops.
- **Client Canvas Preprocessing**: Automatic resolution clamping (max 1280px), header/footer cropping, and grayscale binarization.
- **Hybrid Recognition Pipeline**: Google Gemini Vision + local Tesseract.js OCR + 1,025 Pokémon fuzzy name matcher + Pokémon TCG API lookups.
- **3-Tier Card Classification**: Official Cards, Rule-Box Adaptations, and Custom Fan-Art synthesis.
- **Local Storage Collection**: Card album manager with era filters (Regular, EX, GX, V/VMAX, Fan-Art).
- **GBA Turn-Based Battle Engine**:
  - Auto-turn energy generation matching primary Pokémon type.
  - Type Weakness (×2) and Resistance (-30) calculation.
  - Authentic prize card decrement mechanics (1 for Regular, 2 for EX/GX/V, 3 for VMAX).
  - Status condition engine: Poison (tick damage), Burn (tick damage + coin flip), Sleep (50% wake-up flip), Paralysis (skip turn), and Confusion (50% self-damage).
  - Retreat costs, bench switching, and once-per-game GX / VSTAR limiters.
- **Authentic Retro UI**: CRT scanline overlay, pixel font typography (`Press Start 2P`), particle convergence effects, and classic battle menus (FIGHT, POKÉMON, BAG, RUN).

### In Progress / Known Limitations
- **Golden Copy Badge**: Recognition prompt extracts gold/metallic foil indicators, but return mapping in `card-recognizer.js` requires a pass-through fix for UI rendering.
- **Attack Effect Scripts**: Attacks deal calculated damage numbers, but special written effects (e.g., "discard 2 energy", "flip 3 coins") are currently display-only.
- **Card Camera Viewfinder**: Uses native HTML5 camera input capture (`<input capture="environment">`) rather than an inline WebRTC live video feed.
- **Evolution Flow**: Evolution logic exists in the battle engine (`battle.js`), but an in-battle evolution UI button is not yet wired into the arena interface.
- **Image Storage for Fan-Art**: Custom cards store raw camera base64 strings in `localStorage`. Large numbers of custom cards risk hitting browser storage limits.

### Planned Features (Roadmap)
- **Animated GBA Battle Sprites**: Map recognized Pokémon species to National Dex IDs to render authentic animated front/back sprites instead of flat card artwork.
- **Audio & Battle Cries**: Background music, 8-bit sound effects, and official Pokémon cries from PokéAPI.
- **Online Multiplayer**: Server-authoritative WebSocket rooms enabling remote laptop-to-laptop battles.
- **Single-Player Bot / AI**: Computer opponent for solo practice.

---

## 🏛️ Architecture

```
+-------------------------------------------------------------------------+
|                              LOCAL NETWORK                              |
|                                                                         |
|   +-----------------------+              +--------------------------+   |
|   |   SMARTPHONE BROWSER  |              |      LAPTOP BROWSER      |   |
|   |      (scan.html)      |              |       (index.html)       |   |
|   +-----------+-----------+              +------------+-------------+   |
|               |                                       ^                 |
|       1. Snap Photo                                   |                 |
|       2. Canvas Crop & Boost                          |                 |
|       3. POST /api/recognize-card                     |                 |
|               |                                       |                 |
|               v                                       |                 |
|   +-----------+---------------------------------------+-------------+   |
|   |                       NODE.JS SERVER                            |   |
|   |                        (server.js)                              |   |
|   |                                                                 |   |
|   |   +---------------------------------------------------------+   |   |
|   |   |                 card-recognizer.js                      |   |   |
|   |   |  - Route 1: Gemini Multimodal Vision API (Cloud)        |   |   |
|   |   |  - Route 2: Local Tesseract.js OCR (eng.traineddata)    |   |   |
|   |   |  - Route 3: Fuzzy Matcher (pokemon-names.json)          |   |   |
|   |   |  - Route 4: pokemontcg.io API Query & Reconciliation    |   |   |
|   |   |  - Route 5: 3-Tier Classifier (Official / Adapted / Fan)|   |   |
|   |   +---------------------------------------------------------+   |   |
|   |                                                                 |   |
|   |   Socket.IO Room / HTTP Push:                                   |   |
|   |   emit('card-received-from-phone', cardData) -------------------+   |   |
|   +-----------------------------------------------------------------+   |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express `^4.21.0`
- **Real-Time Communication**: Socket.IO `^4.7.5`
- **OCR Engine**: Tesseract.js `^7.0.0` with offline English trained model (`eng.traineddata`)
- **QR Code Generation**: `qrcode` `^1.5.4`
- **Frontend**: Vanilla HTML5, Canvas API, Vanilla CSS3 (Custom Design System), Vanilla ES6 JavaScript
- **External APIs**:
  - Google Gemini Multimodal API (`generativelanguage.googleapis.com`)
  - Pokémon TCG API (`api.pokemontcg.io`)
  - Google Fonts CDN (`Press Start 2P`, `Outfit`)

---

## 🚀 Development Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- A computer and a smartphone connected to the **same Wi-Fi network**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/poke-deck-revolution.git
   cd poke-deck-revolution
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` (optional, for cloud AI vision):
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *Note: If no API key is provided, the engine automatically operates in 100% offline local OCR mode using Tesseract.js.*

4. **Start the application**:
   ```bash
   npm start
   ```

5. **Open the Game**:
   - Computer: Open `http://localhost:3000`
   - Mobile Scanner: Click **SCAN CARDS** on the title screen and scan the QR code with your phone camera, or visit `http://<your-lan-ip>:3000/scan.html`.

---

## 🤝 Community & Contributing

Poké Deck Revolution is an open-source, community-driven project. We welcome code contributions, testing, bug reports, documentation improvements, UI/UX polish, and feature proposals!

Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting pull requests.

### Project Governance
- The project is founded and maintained by the **Lead Maintainer** (`@zaidan-contractor`).
- All code additions enter through Pull Requests submitted to the `main` branch.
- Maintainers review submissions for code safety, game balance, and architectural consistency before merging.
- Contributors do not automatically receive direct write or push access to the official repository.

---

## 🔒 Security

For responsible vulnerability reporting, please see [SECURITY.md](SECURITY.md). 

**Never commit `.env` files, API keys, or personal credentials to GitHub.**

---

## 📜 License

Poké Deck Revolution's original source code is licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See the [LICENSE](LICENSE) file for the full license text.

Pokémon-related names, characters, trademarks, card artwork, designs, and other third-party materials are **not** covered by this license and remain the property of their respective owners. Third-party dependencies and services remain subject to their respective licenses and terms.

---

## ⚖️ Intellectual Property & Fair Use Disclaimer

**Poké Deck Revolution is an unofficial, non-commercial, fan-developed open-source software project.**

- **Trademarks & Copyrights**: Pokémon, Pokémon character names, Pokémon Trading Card Game, card designs, logos, artwork, audio, and game mechanics are trademarks, service marks, and copyrights of **Nintendo**, **Creatures Inc.**, and **GAME FREAK inc.**
- **Project Scope**: The authors and contributors to this project do not claim ownership of any Pokémon intellectual property, artwork, or card assets.
- **Original Code**: Only original source code authored specifically for Poké Deck Revolution (the scanning pipeline, classification heuristics, web interface, and server implementation) is licensed under GPL-3.0.
- **Non-Commercial**: This software is developed purely for educational, archival, and non-commercial hobbyist research into computer vision and card simulation. It must not be monetized, sold, or distributed with proprietary assets.
