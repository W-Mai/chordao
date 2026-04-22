# Changelog

All notable changes to Chordao will be documented in this file.

Format: [CalVer](https://calver.org/) — `YYYY.M.D`

## [2026.4.22]

### Added
- **7th chord shapes** — Toggle between triad (E/Em/A/Am) and seventh (E7/Em7/A7/Am7) shapes
- **Chord audio playback** — Click any chord to hear it, physics-based harmonic synthesis (Perov et al. model)
- **12 rhythm patterns** — Pop, Rock, Folk, Ballad, Punk, Reggae, Shuffle, Country, Arpeggio (53231323), etc.
- **Auto-play progression** — BPM slider (60–180), per-bar rhythm, synced Shape Grid dot animation
- **Custom chord progressions** — Type degree sequence (e.g. `1 4 5 1`), synced to URL
- **Shareable URLs** — Key, progression, and custom degrees encoded in URL hash
- **QR codes with state** — Export QR links to current key/progression
- **Practice game: 5 modes** — Locate, Identify, Sprint, Chain, Memory
- **Game difficulty** — Easy (I only + colors), Medium (I/IV/V), Hard (all 6 + timer)
- **Per-question countdown timer** — 10s / 7s / 5s by difficulty
- **Streak tracking & local leaderboard** — Best score per mode/difficulty in localStorage
- **Floating panel sidebar** — FAB morphs into settings panel with expand/collapse animation
- **Share button** — Header dropdown with Copy Link + Export Image
- **Swipe to switch key** — Touch gesture on key selector grid
- **Mute toggle** — Global audio on/off with localStorage persistence
- **Unit tests** — 20 tests covering chord data layer

### Changed
- **Unified header bar** — Logo + key display + toolbar, shared across mobile/desktop
- **Code restructured** — `components/`, `data/`, `utils/` directory layout
- **Click = play, double-click = lock** — Replaces old click-to-lock behavior
- **Game overhaul** — 2→5 modes, per-question timer replaces global timer

### Fixed
- CI lint errors (i18next, react-compiler purity, no-useless-escape)
- Game Shape Grid follows current theme
- Mobile custom progression input (Roller auto-select conflict)
- Export supports custom progressions
- Prevent text selection on main/SVG for mobile
- BPM input clamps on blur instead of onChange
- Timeout cleanup on game close (prevent unmounted state updates)
- Absolute audio time scheduling to prevent bar overlap
- Shape Grid synced dot uses GPU-accelerated transform

## [2026.4.3] — Initial release

### Added
- Core chord derivation from E/Em/A/Am open shapes via barre transposition
- Shape Grid, Fretboard Overview, Chord Diagrams
- Optimal combination algorithm (circle-of-fifths ordering)
- 10 built-in chord progressions with animated path
- 3 Catppuccin themes (Mocha/Latte/Cyber) with system auto-detection
- Key selector (circle-of-fifths or chromatic order)
- Degree filter buttons
- Barre line toggle
- Keyboard shortcuts
- Export PNG with QR codes
- Fullscreen overlay with portrait auto-rotation
- Interactive guide (first visit)
- PWA support
- i18n (English / 中文)
