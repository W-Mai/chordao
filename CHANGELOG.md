# Changelog

All notable changes to Chordao will be documented in this file.

Format: [CalVer](https://calver.org/) — `YYYY.M.D`

## [2026.4.23.1]

### Fixed
- Keyboard arrow-key navigation now follows Circle-of-Fifths ↔ Chromatic re-ordering (missing React effect dep)
- Game mode exhaustive-deps fixes — Memory/Sprint/Chain no longer judge on stale closures
- `saveBest` guards against `NaN` in localStorage so tampered values no longer overwrite best scores

### Changed
- All remaining user-visible strings routed through i18n (Guide SVG labels, Game progress, footer, export template, toolbar buttons)
- Extracted `src/hooks/useHashState.ts` — URL-hash parse/sync lifted out of App.tsx
- Extracted `src/components/game/` — pure logic, storage, and per-mode hooks (useGameTimer, useSprintState, useChainState); Game() shrank 325→273 lines, cognitive complexity 124→91
- Lint warnings 36 → 0

## [2026.4.22.3]

### Added
- **Interval labels on active chord** — Fretboard shows R/3/5/b3/b7 on each dot when chord is hovered/locked
- **Interval map mode** — Toggle ♫ on fretboard to show all intervals for current key across entire neck
- **Selectable intervals** — Filter which intervals to display (R/b3/3/4/5/b7/7), persisted to localStorage
- **Open string intervals** — Interval map includes fret 0 positions

### Fixed
- Interval map overlay uses correct transform offset (was misaligned)
- String labels shift left in interval mode to avoid overlap with open string dots
- Fullscreen fretboard preserves interval mode state

## [2026.4.22.2]

### Added
- **CAGED system** — Full C/A/G/E/D shapes (major, minor, 7th), toggle E/A ↔ CAGED
- **Shape Grid 3-row layout** — A/C row, E/G row, D row for CAGED mode
- **Fretboard diamond markers** — ⬤ circle=6th string root (E/G), ◼ square=5th (A/C), ◆ diamond=4th (D)
- **Multiple position combos** — Switch between optimal voicing sets with numbered buttons + All view
- **Bass direction preference** — ↗ ascending / ↘ descending / — none toggle on Shape Grid
- **Multi-path progression lines** — All mode shows each combo's path in distinct colors
- **Chord diagram shape label** — Shows `I · E @ 8` format (degree · shape · fret)

### Fixed
- Shape Grid overlapping voicings at same position — horizontal offset with smaller dots
- Playback blue circle aligns with actual voicing position in overlapping cells
- String lines and colors support dynamic row count
- Guard rowIdx in progression path to prevent crash

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
